/**
 * $59 Severance Report, one time ($59 CAD in Canada, $59 USD in the US, plus applicable tax).
 *   web     -> Stripe Checkout (Apple Pay, Google Pay or card) or a PaymentIntent for an embedded form
 *   iOS     -> Apple In-App Purchase, verified with the App Store Server API (iap.service.ts)
 *   Android -> Google Play Billing, verified with the Android Publisher API (iap.service.ts)
 *   dev     -> PAYMENTS_MODE=mock
 * Stripe is called over its REST API (no SDK). Webhooks are verified with the signing secret.
 */
import crypto from 'crypto'
import { db, check } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { caseService } from './case.service'
import { emailService } from './email.service'
import type { CaseRow } from '../fairexit/types'

export function currencyFor(c: CaseRow) {
  return c.country === 'US' ? 'usd' : 'cad'
}

function form(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? out.push(...form(x as Record<string, unknown>, `${key}[${i}]`)) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`)))
    else if (typeof v === 'object') out.push(...form(v as Record<string, unknown>, key))
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
  }
  return out
}

async function stripe<T = any>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw ApiError.internal('STRIPE_SECRET_KEY is not set')
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: body ? form(body).join('&') : undefined,
  })
  const json = (await res.json()) as any
  if (!res.ok) throw new ApiError(res.status === 402 ? 402 : 502, `Stripe: ${json?.error?.message || res.statusText}`)
  return json as T
}

export const paymentService = {
  price(c: CaseRow) {
    return { amountCents: env.REPORT_PRICE_CENTS, currency: currencyFor(c).toUpperCase(), label: `$${(env.REPORT_PRICE_CENTS / 100).toFixed(0)} ${currencyFor(c).toUpperCase()}`, taxNote: 'plus applicable tax' }
  },

  /** Saves email + consent (the checkout form) before sending the person to pay. */
  async prepare(c: CaseRow, input: { email: string; remind?: boolean; termsAccepted: boolean; consentVersion?: string }) {
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    if (caseService.isPaid(c)) throw ApiError.conflict('This report is already paid')
    if (!input.termsAccepted) throw ApiError.unprocessable('Accept the terms to continue')
    const consent = { email: input.email, at: new Date().toISOString(), source: 'report-checkout', version: input.consentVersion || '2026-09-21', items: [{ type: 'transactional', basis: 'requested product' }] }
    return caseService.update(c.id, { email: input.email.trim().toLowerCase(), remind: !!input.remind, consent, status: 'pending_payment' })
  },

  async stripeCheckout(c: CaseRow, input: { successUrl: string; cancelUrl: string }) {
    if (env.PAYMENTS_MODE === 'mock') throw ApiError.badRequest('PAYMENTS_MODE=mock: use POST /cases/:id/payment/mock')
    const session = await stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      client_reference_id: c.id,
      customer_email: c.email || undefined,
      success_url: input.successUrl.includes('{CHECKOUT_SESSION_ID}') ? input.successUrl : `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
      line_items: [{ quantity: 1, price_data: { currency: currencyFor(c), unit_amount: env.REPORT_PRICE_CENTS, tax_behavior: 'exclusive', product_data: { name: 'FairExit Severance Report' } } }],
      automatic_tax: { enabled: env.STRIPE_AUTOMATIC_TAX },
      metadata: { case_id: c.id, public_id: c.public_id },
      payment_intent_data: { metadata: { case_id: c.id }, receipt_email: c.email || undefined },
    }, `checkout:${c.id}:${c.updated_at}`)
    await db().from('payments').upsert({ case_id: c.id, provider: 'stripe', provider_ref: session.id, status: 'pending', amount_cents: env.REPORT_PRICE_CENTS, currency: currencyFor(c).toUpperCase() }, { onConflict: 'provider,provider_ref' })
    return { provider: 'stripe', sessionId: session.id, url: session.url }
  },

  /** For an embedded Stripe Payment Element (web) — note: Stripe Tax is applied only on Checkout. */
  async stripePaymentIntent(c: CaseRow) {
    if (env.PAYMENTS_MODE === 'mock') throw ApiError.badRequest('PAYMENTS_MODE=mock: use POST /cases/:id/payment/mock')
    const pi = await stripe('POST', '/payment_intents', {
      amount: env.REPORT_PRICE_CENTS, currency: currencyFor(c), automatic_payment_methods: { enabled: true },
      receipt_email: c.email || undefined, metadata: { case_id: c.id, public_id: c.public_id }, description: 'FairExit Severance Report',
    }, `pi:${c.id}:${c.updated_at}`)
    await db().from('payments').upsert({ case_id: c.id, provider: 'stripe', provider_ref: pi.id, status: 'pending', amount_cents: pi.amount, currency: String(pi.currency).toUpperCase() }, { onConflict: 'provider,provider_ref' })
    return { provider: 'stripe', paymentIntentId: pi.id, clientSecret: pi.client_secret }
  },

  /** After the Stripe redirect: asks Stripe directly, so the app does not depend on webhook timing. */
  async confirmStripe(c: CaseRow, ref: { sessionId?: string; paymentIntentId?: string }) {
    if (ref.sessionId) {
      const s = await stripe('GET', `/checkout/sessions/${encodeURIComponent(ref.sessionId)}`)
      if (s.metadata?.case_id !== c.id) throw ApiError.forbidden('This payment belongs to another report')
      if (s.payment_status === 'paid') return this.markPaid(c.id, 'stripe', s.id, s.amount_total, String(s.currency).toUpperCase(), { session: s.id, payment_intent: s.payment_intent })
      return { paid: false, status: s.payment_status }
    }
    if (ref.paymentIntentId) {
      const pi = await stripe('GET', `/payment_intents/${encodeURIComponent(ref.paymentIntentId)}`)
      if (pi.metadata?.case_id !== c.id) throw ApiError.forbidden('This payment belongs to another report')
      if (pi.status === 'succeeded') return this.markPaid(c.id, 'stripe', pi.id, pi.amount, String(pi.currency).toUpperCase(), { payment_intent: pi.id })
      return { paid: false, status: pi.status }
    }
    throw ApiError.badRequest('sessionId or paymentIntentId is required')
  },

  verifyStripeSignature(rawBody: Buffer, header: string | undefined): any {
    if (!env.STRIPE_WEBHOOK_SECRET) throw ApiError.internal('STRIPE_WEBHOOK_SECRET is not set')
    if (!header) throw ApiError.badRequest('Missing Stripe-Signature')
    const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]).filter((p) => p.length === 2))
    const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
    const t = parts.t
    if (!t || !sigs.length) throw ApiError.badRequest('Bad Stripe-Signature')
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) throw ApiError.badRequest('Stripe webhook timestamp too old')
    const expected = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${rawBody.toString('utf8')}`).digest('hex')
    const ok = sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)))
    if (!ok) throw ApiError.badRequest('Stripe signature mismatch')
    return JSON.parse(rawBody.toString('utf8'))
  },

  async handleStripeEvent(evt: any) {
    const o = evt?.data?.object || {}
    switch (evt.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (o.payment_status === 'paid' && o.metadata?.case_id) await this.markPaid(o.metadata.case_id, 'stripe', o.id, o.amount_total, String(o.currency).toUpperCase(), { session: o.id, payment_intent: o.payment_intent })
        break
      case 'payment_intent.succeeded':
        if (o.metadata?.case_id) await this.markPaid(o.metadata.case_id, 'stripe', o.id, o.amount_received ?? o.amount, String(o.currency).toUpperCase(), { payment_intent: o.id })
        break
      case 'charge.refunded':
        if (o.payment_intent) await db().from('payments').update({ status: 'refunded' }).eq('provider', 'stripe').contains('raw', { payment_intent: o.payment_intent })
        break
      default:
        break
    }
    return { received: true }
  },

  /** Idempotent: a payment reference can unlock exactly one case. */
  async markPaid(caseId: string, provider: 'stripe' | 'apple' | 'google' | 'mock', providerRef: string, amountCents: number | null, currency: string | null, raw: Record<string, unknown> = {}) {
    const existing = await db().from('payments').select('*').eq('provider', provider).eq('provider_ref', providerRef).maybeSingle()
    if (existing.data && existing.data.case_id !== caseId) throw ApiError.conflict('This purchase was already used for another report')
    check(await db().from('payments').upsert({ case_id: caseId, provider, provider_ref: providerRef, status: 'paid', amount_cents: amountCents, currency, raw }, { onConflict: 'provider,provider_ref' }), 'payment')
    const c = await caseService.get(caseId)
    if (c.paid_at) return { paid: true, alreadyPaid: true, case: c }
    const updated = await caseService.update(caseId, {
      status: c.status === 'free_check' || c.status === 'pending_payment' ? 'paid' : c.status,
      paid_at: new Date().toISOString(), payment_provider: provider, amount_cents: amountCents, currency,
    })
    if (updated.email) {
      const token = await caseService.addToken(updated)
      emailService.paymentReceived(updated, token).catch((e) => logger.warn('payment email failed', { message: (e as Error).message }))
    }
    return { paid: true, alreadyPaid: false, case: updated }
  },
}
