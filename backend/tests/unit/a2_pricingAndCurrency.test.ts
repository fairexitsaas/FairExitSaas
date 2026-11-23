import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { paymentService, resolvePriceForCase, setStripe, clearPriceValidationCache } from '../../src/services/payment.service'
import { env } from '../../src/config/env'
import type { CaseRow } from '../../src/fairexit/types'

describe('A2 - Correct US and Canada Pricing & Currency Verification', () => {
  const originalPaymentsMode = env.PAYMENTS_MODE
  const originalStripeSecretKey = env.STRIPE_SECRET_KEY
  const originalUSPrice = env.US_PAID_REPORT
  const originalCAPrice = env.CANADA_PAID_REPORT

  const usCase: CaseRow = {
    id: '11111111-2222-3333-4444-555555555555',
    public_id: 'FX-US99',
    user_id: null,
    token_hashes: ['us_token_hash'],
    platform: 'web',
    country: 'US',
    jurisdiction_code: 'US-NY',
    jurisdiction: { name: 'New York', code: 'US-NY', country: 'US' } as any,
    covered: true,
    industry: null,
    answers: { usState: 'New York', salary: 130000 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: 'us.customer@example.com',
    consent: null,
    remind: false,
    paid_at: null,
    payment_provider: null,
    amount_cents: null,
    currency: null,
    contract_status: null,
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: false, attested_at: null },
    attested_at: null,
    report_id: null,
    report: null,
    report_inputs: null,
    report_ready_at: null,
    report_pdf_path: null,
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.6',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const caCase: CaseRow = {
    id: '66666666-7777-8888-9999-000000000000',
    public_id: 'FX-CA99',
    user_id: null,
    token_hashes: ['ca_token_hash'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON', country: 'CA' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', salary: 100000 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: 'ca.customer@example.com',
    consent: null,
    remind: false,
    paid_at: null,
    payment_provider: null,
    amount_cents: null,
    currency: null,
    contract_status: null,
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: false, attested_at: null },
    attested_at: null,
    report_id: null,
    report: null,
    report_inputs: null,
    report_ready_at: null,
    report_pdf_path: null,
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.6',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    clearPriceValidationCache()
    ;(env as any).PAYMENTS_MODE = 'live'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key'
    ;(env as any).US_PAID_REPORT = 'price_us_test_59usd'
    ;(env as any).CANADA_PAID_REPORT = 'price_ca_test_59cad'
  })

  afterEach(() => {
    setStripe(null)
    ;(env as any).PAYMENTS_MODE = originalPaymentsMode
    ;(env as any).STRIPE_SECRET_KEY = originalStripeSecretKey
    ;(env as any).US_PAID_REPORT = originalUSPrice
    ;(env as any).CANADA_PAID_REPORT = originalCAPrice
  })

  it('1. US case prices in USD with "plus applicable sales tax" wording', () => {
    const priceInfo = paymentService.price(usCase)
    expect(priceInfo.currency).toBe('USD')
    expect(priceInfo.amountCents).toBe(5900)
    expect(priceInfo.label).toBe('$59 USD')
    expect(priceInfo.taxNote).toBe('plus applicable sales tax')
    expect(priceInfo.priceId).toBe('price_us_test_59usd')
  })

  it('2. Canada case prices in CAD with "plus applicable tax" wording', () => {
    const priceInfo = paymentService.price(caCase)
    expect(priceInfo.currency).toBe('CAD')
    expect(priceInfo.amountCents).toBe(5900)
    expect(priceInfo.label).toBe('$59 CAD')
    expect(priceInfo.taxNote).toBe('plus applicable tax')
    expect(priceInfo.priceId).toBe('price_ca_test_59cad')
  })

  it('3. US checkout session creation charges USD and uses the US Stripe Price ID', async () => {
    const createdSessions: any[] = []
    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockImplementation((id: string) => {
          if (id === 'price_us_test_59usd') {
            return Promise.resolve({ id, active: true, currency: 'usd', unit_amount: 5900 })
          }
          if (id === 'price_ca_test_59cad') {
            return Promise.resolve({ id, active: true, currency: 'cad', unit_amount: 5900 })
          }
          throw new Error('Unknown price ID')
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockImplementation((params: any) => {
            createdSessions.push(params)
            return Promise.resolve({
              id: `cs_test_us_${params.client_reference_id}`,
              url: `https://checkout.stripe.com/pay/cs_test_us`,
            })
          }),
        },
      },
    }
    setStripe(mockStripe as any)

    const sessionRes = await paymentService.stripeCheckout(usCase, {
      successUrl: 'https://example.com/report?case=us-1',
      cancelUrl: 'https://example.com/report?case=us-1&step=pay&canceled=true',
    })

    expect(sessionRes.sessionId).toBe(`cs_test_us_${usCase.id}`)
    expect(createdSessions).toHaveLength(1)
    const session = createdSessions[0]
    expect(session.line_items[0].price).toBe('price_us_test_59usd')
    expect(session.metadata.country).toBe('US')
    expect(session.payment_intent_data.description).toContain('US')
  })

  it('4. Canada checkout session creation charges CAD and uses the Canada Stripe Price ID', async () => {
    const createdSessions: any[] = []
    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockImplementation((id: string) => {
          if (id === 'price_us_test_59usd') {
            return Promise.resolve({ id, active: true, currency: 'usd', unit_amount: 5900 })
          }
          if (id === 'price_ca_test_59cad') {
            return Promise.resolve({ id, active: true, currency: 'cad', unit_amount: 5900 })
          }
          throw new Error('Unknown price ID')
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockImplementation((params: any) => {
            createdSessions.push(params)
            return Promise.resolve({
              id: `cs_test_ca_${params.client_reference_id}`,
              url: `https://checkout.stripe.com/pay/cs_test_ca`,
            })
          }),
        },
      },
    }
    setStripe(mockStripe as any)

    const sessionRes = await paymentService.stripeCheckout(caCase, {
      successUrl: 'https://example.com/report?case=ca-1',
      cancelUrl: 'https://example.com/report?case=ca-1&step=pay&canceled=true',
    })

    expect(sessionRes.sessionId).toBe(`cs_test_ca_${caCase.id}`)
    expect(createdSessions).toHaveLength(1)
    const session = createdSessions[0]
    expect(session.line_items[0].price).toBe('price_ca_test_59cad')
    expect(session.metadata.country).toBe('CA')
    expect(session.payment_intent_data.description).toContain('Canada')
  })

  it('5. Rejects currency mismatch if Canadian price is configured for a US case', async () => {
    ;(env as any).US_PAID_REPORT = 'price_ca_test_59cad' // Deliberate misconfiguration
    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'price_ca_test_59cad',
          active: true,
          currency: 'cad', // Price is CAD, but US case expects USD
          unit_amount: 5900,
        }),
      },
    }
    setStripe(mockStripe as any)

    await expect(resolvePriceForCase(usCase)).rejects.toThrow(
      'does not match expected country currency (usd)'
    )
  })
})
