/**
 * $59 Severance Report, one time ($59 CAD in Canada, $59 USD in the US, plus applicable tax).
 *   web     -> Stripe Checkout (Apple Pay, Google Pay or card) or a PaymentIntent for an embedded form
 *   iOS     -> Apple In-App Purchase, verified with the App Store Server API (iap.service.ts)
 *   Android -> Google Play Billing, verified with the Android Publisher API (iap.service.ts)
 *   dev     -> PAYMENTS_MODE=mock
 * Uses the official Stripe SDK. Webhooks are verified with the signing secret.
 */
import Stripe from 'stripe'
import { db, check } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { caseService } from './case.service'
import { emailService } from './email.service'
import type { CaseRow } from '../fairexit/types'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!env.STRIPE_SECRET_KEY) throw ApiError.internal('STRIPE_SECRET_KEY is not set')
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return stripeClient
}

export function setStripe(client: Stripe | null) {
  stripeClient = client
}

export function currencyFor(c: CaseRow): 'usd' | 'cad' {
  return c.country === 'US' ? 'usd' : 'cad'
}

interface PriceValidationRecord {
  priceId: string
  currency: 'usd' | 'cad'
  amountCents: number
  validatedAt: number
}

const priceValidationCache = new Map<string, PriceValidationRecord>()

export async function resolvePriceForCase(c: CaseRow): Promise<{
  priceId: string
  currency: 'usd' | 'cad'
  amountCents: number
}> {
  const isUS = c.country === 'US'
  const expectedCurrency: 'usd' | 'cad' = isUS ? 'usd' : 'cad'
  const priceId = isUS
    ? (env.US_PAID_REPORT || env.STRIPE_PRICE_ID_US || process.env.US_PAID_REPORT || process.env.STRIPE_PRICE_ID_US)
    : (env.CANADA_PAID_REPORT || env.STRIPE_PRICE_ID_CA || process.env.CANADA_PAID_REPORT || process.env.STRIPE_PRICE_ID_CA)

  if (!priceId) {
    throw ApiError.internal(
      isUS
        ? 'US Stripe Price ID is not configured (US_PAID_REPORT)'
        : 'Canada Stripe Price ID is not configured (CANADA_PAID_REPORT)'
    )
  }

  // Check cache (5 min TTL) to avoid excessive external Stripe API roundtrips
  const cached = priceValidationCache.get(priceId)
  if (cached && Date.now() - cached.validatedAt < 5 * 60 * 1000) {
    return {
      priceId: cached.priceId,
      currency: cached.currency,
      amountCents: cached.amountCents,
    }
  }

  const stripe = getStripe()
  const priceObj = await stripe.prices.retrieve(priceId)
  if (!priceObj.active) {
    throw ApiError.internal(`Configured Stripe Price ${priceId} is inactive`)
  }
  if (priceObj.currency.toLowerCase() !== expectedCurrency) {
    throw ApiError.internal(
      `Configured Stripe Price ${priceId} currency (${priceObj.currency}) does not match expected country currency (${expectedCurrency})`
    )
  }

  const amountCents = priceObj.unit_amount ?? env.REPORT_PRICE_CENTS
  priceValidationCache.set(priceId, {
    priceId,
    currency: expectedCurrency,
    amountCents,
    validatedAt: Date.now(),
  })

  return {
    priceId,
    currency: expectedCurrency,
    amountCents,
  }
}

export const paymentService = {
  price(c: CaseRow) {
    const cur = currencyFor(c).toUpperCase()
    const isUS = c.country === 'US'
    const priceId = isUS
      ? (env.US_PAID_REPORT || env.STRIPE_PRICE_ID_US || process.env.US_PAID_REPORT || process.env.STRIPE_PRICE_ID_US)
      : (env.CANADA_PAID_REPORT || env.STRIPE_PRICE_ID_CA || process.env.CANADA_PAID_REPORT || process.env.STRIPE_PRICE_ID_CA)

    return {
      amountCents: env.REPORT_PRICE_CENTS,
      currency: cur,
      label: `$${(env.REPORT_PRICE_CENTS / 100).toFixed(0)} ${cur}`,
      taxNote: 'plus applicable tax',
      priceId: priceId || null,
    }
  },

  /** Saves terms acceptance (and optional email + consent) before sending the person to pay. */
  async prepare(c: CaseRow, input: { email?: string; remind?: boolean; termsAccepted: boolean; consentVersion?: string }) {
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    if (caseService.isPaid(c)) throw ApiError.conflict('This report is already paid')
    if (!input.termsAccepted) throw ApiError.unprocessable('Accept the terms to continue')
    const email = input.email ? input.email.trim().toLowerCase() : null
    const consent = {
      ...(c.consent || {}),
      email,
      at: new Date().toISOString(),
      source: 'report-checkout',
      version: input.consentVersion || '2026-09-21',
      items: [{ type: 'transactional', basis: 'requested product' }],
    }
    return caseService.update(c.id, {
      ...(email ? { email } : {}),
      remind: !!input.remind,
      consent,
      status: 'pending_payment',
    })
  },

  async stripeCheckout(c: CaseRow, input: { successUrl: string; cancelUrl: string }) {
    if (env.PAYMENTS_MODE === 'mock') throw ApiError.badRequest('PAYMENTS_MODE=mock: use POST /cases/:id/checkout/mock')
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    if (caseService.isPaid(c)) throw ApiError.conflict('This report is already paid')

    const priceConfig = await resolvePriceForCase(c)
    const stripe = getStripe()

    const successUrl = input.successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? input.successUrl
      : `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: c.id,
        customer_email: c.email || undefined,
        success_url: successUrl,
        cancel_url: input.cancelUrl,
        line_items: [
          {
            price: priceConfig.priceId,
            quantity: 1,
          },
        ],
        automatic_tax: { enabled: env.STRIPE_AUTOMATIC_TAX },
        metadata: {
          case_id: c.id,
          public_id: c.public_id,
          country: c.country,
        },
        payment_intent_data: {
          metadata: {
            case_id: c.id,
            country: c.country,
          },
          receipt_email: c.email || undefined,
          description: `FairExit Severance Report (${c.country === 'US' ? 'US' : 'Canada'})`,
        },
      },
      {
        idempotencyKey: `checkout_${c.id}_${priceConfig.priceId}_${Math.floor(Date.now() / 60000)}`,
      }
    )

    await db().from('payments').upsert(
      {
        case_id: c.id,
        provider: 'stripe',
        provider_ref: session.id,
        status: 'pending',
        amount_cents: priceConfig.amountCents,
        currency: priceConfig.currency.toUpperCase(),
        raw: {
          checkout_session_id: session.id,
          price_id: priceConfig.priceId,
          url: session.url,
        },
      },
      { onConflict: 'provider,provider_ref' }
    )

    return { provider: 'stripe', sessionId: session.id, url: session.url }
  },

  /** For an embedded Stripe Payment Element (web) — note: Stripe Tax is applied only on Checkout. */
  async stripePaymentIntent(c: CaseRow) {
    if (env.PAYMENTS_MODE === 'mock') throw ApiError.badRequest('PAYMENTS_MODE=mock: use POST /cases/:id/checkout/mock')
    const priceConfig = await resolvePriceForCase(c)
    const stripe = getStripe()

    const pi = await stripe.paymentIntents.create(
      {
        amount: priceConfig.amountCents,
        currency: priceConfig.currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: c.email || undefined,
        metadata: { case_id: c.id, public_id: c.public_id, country: c.country },
        description: `FairExit Severance Report (${c.country === 'US' ? 'US' : 'Canada'})`,
      },
      {
        idempotencyKey: `pi_${c.id}_${priceConfig.priceId}_${Math.floor(Date.now() / 60000)}`,
      }
    )

    await db().from('payments').upsert(
      {
        case_id: c.id,
        provider: 'stripe',
        provider_ref: pi.id,
        status: 'pending',
        amount_cents: pi.amount,
        currency: String(pi.currency).toUpperCase(),
      },
      { onConflict: 'provider,provider_ref' }
    )

    return { provider: 'stripe', paymentIntentId: pi.id, clientSecret: pi.client_secret }
  },

  /** After the Stripe redirect: asks Stripe directly, so the app does not depend on webhook timing. */
  async confirmStripe(c: CaseRow, ref: { sessionId?: string; paymentIntentId?: string }) {
    const stripe = getStripe()
    if (ref.sessionId) {
      const s = await stripe.checkout.sessions.retrieve(ref.sessionId)
      const sessionCaseId = s.client_reference_id || s.metadata?.case_id
      if (sessionCaseId !== c.id) throw ApiError.forbidden('This payment belongs to another report')

      if (s.payment_status === 'paid') {
        const expectedCurrency = currencyFor(c).toLowerCase()
        if (s.currency && s.currency.toLowerCase() !== expectedCurrency) {
          throw ApiError.unprocessable(`Payment currency mismatch: expected ${expectedCurrency}, got ${s.currency}`)
        }
        return this.markPaid(
          c.id,
          'stripe',
          s.id,
          s.amount_total,
          String(s.currency || expectedCurrency).toUpperCase(),
          {
            session: s.id,
            payment_intent: s.payment_intent,
            customer: s.customer,
            customer_email: s.customer_details?.email,
          }
        )
      }
      return { paid: false, status: s.payment_status }
    }

    if (ref.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(ref.paymentIntentId)
      if (pi.metadata?.case_id !== c.id) throw ApiError.forbidden('This payment belongs to another report')

      if (pi.status === 'succeeded') {
        const expectedCurrency = currencyFor(c).toLowerCase()
        return this.markPaid(
          c.id,
          'stripe',
          pi.id,
          pi.amount_received ?? pi.amount,
          String(pi.currency || expectedCurrency).toUpperCase(),
          { payment_intent: pi.id }
        )
      }
      return { paid: false, status: pi.status }
    }

    throw ApiError.badRequest('sessionId or paymentIntentId is required')
  },

  verifyStripeSignature(rawBody: Buffer | string, header: string | undefined): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) throw ApiError.internal('STRIPE_WEBHOOK_SECRET is not set')
    if (!header) throw ApiError.badRequest('Missing Stripe-Signature')
    const stripe = getStripe()
    try {
      return stripe.webhooks.constructEvent(rawBody, header, env.STRIPE_WEBHOOK_SECRET)
    } catch (err: any) {
      throw ApiError.badRequest(`Stripe signature verification failed: ${err.message}`)
    }
  },

  async handleStripeEvent(evt: Stripe.Event | any) {
    const o = evt?.data?.object || {}
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const caseId = o.client_reference_id || o.metadata?.case_id
        if (!caseId) {
          logger.warn('[STRIPE][WEBHOOK] Checkout session missing caseId', { sessionId: o.id })
          break
        }
        if (o.payment_status !== 'paid') {
          logger.info('[STRIPE][WEBHOOK] Checkout session not paid yet', { sessionId: o.id, status: o.payment_status })
          break
        }
        const c = await caseService.get(caseId).catch(() => null)
        if (!c) {
          logger.error('[STRIPE][WEBHOOK] Case not found for completed checkout', { caseId, sessionId: o.id })
          break
        }
        const expectedCurrency = currencyFor(c).toLowerCase()
        if (o.currency && o.currency.toLowerCase() !== expectedCurrency) {
          logger.error('[STRIPE][WEBHOOK] Currency mismatch in webhook', {
            caseId,
            expected: expectedCurrency,
            received: o.currency,
          })
          break
        }
        if (o.amount_total && o.amount_total < env.REPORT_PRICE_CENTS) {
          logger.error('[STRIPE][WEBHOOK] Amount less than minimum price in webhook', {
            caseId,
            amount: o.amount_total,
            expected: env.REPORT_PRICE_CENTS,
          })
          break
        }
        await this.markPaid(
          caseId,
          'stripe',
          o.id,
          o.amount_total,
          String(o.currency || expectedCurrency).toUpperCase(),
          {
            session_id: o.id,
            payment_intent: o.payment_intent,
            event_id: evt.id,
            customer: o.customer,
            customer_email: o.customer_details?.email,
          }
        )
        break
      }
      case 'payment_intent.succeeded': {
        const caseId = o.metadata?.case_id
        if (caseId) {
          const c = await caseService.get(caseId).catch(() => null)
          if (c) {
            const expectedCurrency = currencyFor(c).toLowerCase()
            await this.markPaid(
              caseId,
              'stripe',
              o.id,
              o.amount_received ?? o.amount,
              String(o.currency || expectedCurrency).toUpperCase(),
              { payment_intent: o.id, event_id: evt.id }
            )
          }
        }
        break
      }
      case 'charge.refunded': {
        if (o.payment_intent) {
          await db().from('payments').update({ status: 'refunded' }).eq('provider', 'stripe').contains('raw', { payment_intent: o.payment_intent })
        }
        break
      }
      default:
        break
    }
    return { received: true }
  },

  /** Idempotent: a payment reference can unlock exactly one case. */
  async markPaid(
    caseId: string,
    provider: 'stripe' | 'apple' | 'google' | 'mock',
    providerRef: string,
    amountCents: number | null,
    currency: string | null,
    raw: Record<string, unknown> = {}
  ) {
    const existing = await db().from('payments').select('*').eq('provider', provider).eq('provider_ref', providerRef).maybeSingle()
    if (existing.data && existing.data.case_id !== caseId) throw ApiError.conflict('This purchase was already used for another report')
    check(await db().from('payments').upsert({ case_id: caseId, provider, provider_ref: providerRef, status: 'paid', amount_cents: amountCents, currency, raw }, { onConflict: 'provider,provider_ref' }), 'payment')
    const c = await caseService.get(caseId)
    if (c.paid_at) return { paid: true, alreadyPaid: true, case: c }
    const updated = await caseService.update(caseId, {
      status: c.status === 'free_check' || c.status === 'pending_payment' ? 'paid' : c.status,
      paid_at: new Date().toISOString(),
      payment_provider: provider,
      amount_cents: amountCents,
      currency,
    })
    if (updated.email && env.EMAIL_MODE === 'live') {
      const token = await caseService.addToken(updated)
      emailService.paymentReceived(updated, token).catch((e) => logger.warn('payment email failed', { message: (e as Error).message }))
    }
    return { paid: true, alreadyPaid: false, case: updated }
  },
}
