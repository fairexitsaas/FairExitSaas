import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { caseController } from '../../src/controllers/case.controller'
import { paymentService } from '../../src/services/payment.service'
import { caseService } from '../../src/services/case.service'
import { emailService } from '../../src/services/email.service'
import { env } from '../../src/config/env'
import type { CaseRow } from '../../src/fairexit/types'

describe('Payment Mode Configuration & Verification (Mock vs Live in Production)', () => {
  const originalPaymentsMode = env.PAYMENTS_MODE
  const originalNodeEnv = env.NODE_ENV
  const originalStripeSecretKey = env.STRIPE_SECRET_KEY

  const sampleCase: CaseRow = {
    id: '55555555-5555-5555-5555-555555555555',
    public_id: 'FX-0055',
    user_id: null,
    token_hashes: ['test_token_hash'],
    platform: 'web',
    country: 'US',
    jurisdiction_code: 'US-NY',
    jurisdiction: { name: 'New York', code: 'US-NY', country: 'US' } as any,
    covered: true,
    industry: null,
    answers: { state: 'NY', years: 5, salary: 120000 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: null,
    consent: null,
    remind: false,
    paid_at: null,
    payment_provider: null,
    amount_cents: null,
    currency: null,
    contract_status: 'never',
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: true, attested_at: new Date().toISOString() },
    attested_at: new Date().toISOString(),
    report_id: 'RPT-TEST-055',
    report: {
      reportId: 'RPT-TEST-055',
      executiveSummary: { headline: 'Severance analysis for US employee' },
      documentFacts: { offerAmount: 15000, employerName: 'Tech Corp' },
    },
    report_inputs: { offer: 15000 },
    report_ready_at: new Date().toISOString(),
    report_pdf_path: '55555555-5555-5555-5555-555555555555/report.pdf',
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.7',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const createMockReqRes = (caseRow: CaseRow = sampleCase) => {
    const req: any = { caseRow }
    const res: any = {
      statusCode: 200,
      jsonBody: null as any,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(data: any) {
        this.jsonBody = data
        return this
      },
    }
    return { req, res }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    emailService.setMockTransport(null)
  })

  afterEach(() => {
    (env as any).PAYMENTS_MODE = originalPaymentsMode
    ;(env as any).NODE_ENV = originalNodeEnv
    ;(env as any).STRIPE_SECRET_KEY = originalStripeSecretKey
  })

  // -------------------------------------------------------------------------
  // 1. Production configuration with mock mode
  // -------------------------------------------------------------------------
  it('1. Production configuration with PAYMENTS_MODE=mock allows mock payment without 403', async () => {
    (env as any).NODE_ENV = 'production'
    ;(env as any).PAYMENTS_MODE = 'mock'

    const markPaidSpy = vi.spyOn(paymentService, 'markPaid').mockResolvedValue({
      paid: true,
      alreadyPaid: false,
      case: { ...sampleCase, status: 'paid', paid_at: new Date().toISOString(), payment_provider: 'mock' },
    })
    vi.spyOn(caseService, 'get').mockResolvedValue({
      ...sampleCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
    })
    vi.spyOn(caseService, 'documents').mockResolvedValue([])
    vi.spyOn(caseService, 'view').mockReturnValue({ id: sampleCase.id, status: 'paid' } as any)

    const { req, res } = createMockReqRes()
    await caseController.mockPay(req, res)

    // Must NOT throw 403 'Mock payments are off'
    expect(res.statusCode).toBe(200)
    expect(res.jsonBody?.data?.paid).toBe(true)
    expect(res.jsonBody?.message).toContain('Marked as paid (mock)')
    expect(markPaidSpy).toHaveBeenCalledWith(
      sampleCase.id,
      'mock',
      `mock_${sampleCase.id}`,
      env.REPORT_PRICE_CENTS,
      'USD'
    )
  })

  // -------------------------------------------------------------------------
  // 2. Production configuration with live mode
  // -------------------------------------------------------------------------
  it('2. Production configuration with PAYMENTS_MODE=live blocks mock payments with 403', async () => {
    (env as any).NODE_ENV = 'production'
    ;(env as any).PAYMENTS_MODE = 'live'

    const { req, res } = createMockReqRes()

    // Must throw 403 'Mock payments are off'
    await expect(caseController.mockPay(req, res)).rejects.toThrow('Mock payments are off')
  })

  // -------------------------------------------------------------------------
  // 3. Confirm mock mode does NOT initiate real charges
  // -------------------------------------------------------------------------
  it('3. Confirms PAYMENTS_MODE=mock rejects real provider checkout and does not charge cards', async () => {
    (env as any).PAYMENTS_MODE = 'mock'
    ;(env as any).NODE_ENV = 'production'

    // Attempting Stripe checkout when PAYMENTS_MODE=mock must reject immediately
    await expect(
      paymentService.stripeCheckout(sampleCase, {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
    ).rejects.toThrow('PAYMENTS_MODE=mock: use POST /cases/:id/checkout/mock')

    // Attempting Stripe PaymentIntent when PAYMENTS_MODE=mock must also reject
    await expect(
      paymentService.stripePaymentIntent(sampleCase)
    ).rejects.toThrow('PAYMENTS_MODE=mock: use POST /cases/:id/checkout/mock')
  })

  // -------------------------------------------------------------------------
  // 4. Confirm live mode uses the actual payment provider
  // -------------------------------------------------------------------------
  it('4. Confirms PAYMENTS_MODE=live invokes Stripe API for checkout session creation', async () => {
    (env as any).PAYMENTS_MODE = 'live'
    ;(env as any).NODE_ENV = 'production'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_mock_secret_key'

    // Mock global fetch for Stripe API
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'cs_test_session_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_session_123',
      }),
    } as any)

    const result = await paymentService.stripeCheckout(sampleCase, {
      successUrl: 'https://example.com/report?step=pay',
      cancelUrl: 'https://example.com/report?step=pay',
    })

    expect(result.provider).toBe('stripe')
    expect(result.sessionId).toBe('cs_test_session_123')
    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_test_session_123')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/checkout/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer sk_test_mock_secret_key',
        }),
      })
    )
  })

  // -------------------------------------------------------------------------
  // 5. Post-payment report workflow in mock mode
  // -------------------------------------------------------------------------
  it('5. Confirms post-payment report workflow functions end-to-end after mock payment', async () => {
    (env as any).PAYMENTS_MODE = 'mock'
    ;(env as any).NODE_ENV = 'production'

    // Step A: Mark case as paid via mock payment
    const paidCase: CaseRow = {
      ...sampleCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      amount_cents: 5900,
      currency: 'USD',
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'addToken').mockResolvedValue('secure_token_456')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...paidCase,
      ...patch,
    } as CaseRow))

    // Step B: Collect customer name & email after mock payment
    const customerResult = await caseService.submitCustomerInfo(sampleCase.id, {
      name: 'Alex Morgan',
      email: 'alex@example.com',
      consentNews: true,
    })

    expect(customerResult.success).toBe(true)
    expect(customerResult.customer.name).toBe('Alex Morgan')
    expect(customerResult.customer.email).toBe('alex@example.com')
    expect(customerResult.privateLink).toContain(`case=${sampleCase.id}`)
    expect(customerResult.privateLink).toContain('t=secure_token_456')

    // Step C: Delivery status shows paid and report ready
    const readyCase: CaseRow = {
      ...paidCase,
      email: 'alex@example.com',
      status: 'ready',
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(readyCase)
    const delivery = await caseService.getDeliveryStatus(sampleCase.id)
    expect(delivery.paid).toBe(true)
    expect(delivery.reportReady).toBe(true)
    expect(delivery.customer.email).toBe('alex@example.com')

    // Step D: Email report dispatch works in mock mode
    let emailSent = false
    emailService.setMockTransport(async (to, subject) => {
      if (to === 'alex@example.com' && subject.includes('FairExit')) {
        emailSent = true
      }
      return { sent: true, mocked: true }
    })

    const emailResult = await caseService.deliverReportEmail(readyCase, 'secure_token_456')
    expect(emailResult.status).toBe('sent')
    expect(emailSent).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 6. Public config & price endpoints propagate exact PAYMENTS_MODE
  // -------------------------------------------------------------------------
  it('6. Public config and case price endpoints expose the exact PAYMENTS_MODE setting', async () => {
    // Mode = mock
    ;(env as any).PAYMENTS_MODE = 'mock'
    const { req: reqMock, res: resMock } = createMockReqRes()
    await caseController.price(reqMock, resMock)
    expect(resMock.jsonBody?.data?.mode).toBe('mock')

    // Mode = live
    ;(env as any).PAYMENTS_MODE = 'live'
    const { req: reqLive, res: resLive } = createMockReqRes()
    await caseController.price(reqLive, resLive)
    expect(resLive.jsonBody?.data?.mode).toBe('live')
  })
})
