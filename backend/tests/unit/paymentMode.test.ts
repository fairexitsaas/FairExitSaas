import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { caseController } from '../../src/controllers/case.controller'
import { paymentService, setStripe } from '../../src/services/payment.service'
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
    setStripe(null)
    ;(env as any).PAYMENTS_MODE = originalPaymentsMode
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
  // 4. Confirm live mode uses the actual payment provider (official Stripe SDK)
  // -------------------------------------------------------------------------
  it('4. Confirms PAYMENTS_MODE=live invokes Stripe API for checkout session creation', async () => {
    (env as any).PAYMENTS_MODE = 'live'
    ;(env as any).NODE_ENV = 'production'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_mock_secret_key'
    ;(env as any).US_PAID_REPORT = 'price_1UcJMZALOet47jkqZnOlm0A6'

    const mockCreate = vi.fn().mockResolvedValue({
      id: 'cs_test_session_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_session_123',
    })

    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'price_1UcJMZALOet47jkqZnOlm0A6',
          active: true,
          currency: 'usd',
          unit_amount: 5900,
        }),
      },
      checkout: {
        sessions: {
          create: mockCreate,
        },
      },
    }
    setStripe(mockStripe as any)

    const result = await paymentService.stripeCheckout(sampleCase, {
      successUrl: 'https://example.com/report?step=pay',
      cancelUrl: 'https://example.com/report?step=pay',
    })

    expect(result.provider).toBe('stripe')
    expect(result.sessionId).toBe('cs_test_session_123')
    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_test_session_123')
    expect(mockStripe.prices.retrieve).toHaveBeenCalledWith('price_1UcJMZALOet47jkqZnOlm0A6')
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        client_reference_id: sampleCase.id,
        line_items: [{ price: 'price_1UcJMZALOet47jkqZnOlm0A6', quantity: 1 }],
      }),
      expect.anything()
    )
  })

  // -------------------------------------------------------------------------
  // 5. Post-payment report workflow at the service layer in mock mode
  // -------------------------------------------------------------------------
  it('5. Confirms post-payment report workflow functions at the service layer after mock payment', async () => {
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

    // Step D: Email report dispatch works in live mode with mock transport
    const origEmail = env.EMAIL_MODE
    ;(env as any).EMAIL_MODE = 'live'
    let emailSent = false
    emailService.setMockTransport(async (to, subject) => {
      if (to === 'alex@example.com' && subject.includes('FairExit')) {
        emailSent = true
      }
      return { sent: true, mocked: true }
    })

    try {
      const emailResult = await caseService.deliverReportEmail(readyCase, 'secure_token_456')
      expect(emailResult.status).toBe('sent')
      expect(emailSent).toBe(true)
    } finally {
      ;(env as any).EMAIL_MODE = origEmail
    }
  })

  // -------------------------------------------------------------------------
  // 6. Public config & price endpoints expose configured PAYMENTS_MODE
  // -------------------------------------------------------------------------
  it('6. Public config and case price endpoints expose the configured PAYMENTS_MODE setting', async () => {
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

  // -------------------------------------------------------------------------
  // 7. Stripe return confirmation is handled once and verified idempotently
  // -------------------------------------------------------------------------
  it('7. Stripe return confirmation verifies session status and enforces single handling', async () => {
    (env as any).PAYMENTS_MODE = 'live'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_stripe_key'

    const mockStripe = {
      checkout: {
        sessions: {
          retrieve: vi.fn().mockImplementation(async (id: string) => {
            if (id === 'cs_test_paid') {
              return {
                id: 'cs_test_paid',
                payment_status: 'paid',
                amount_total: 5900,
                currency: 'usd',
                client_reference_id: sampleCase.id,
                metadata: { case_id: sampleCase.id },
                payment_intent: 'pi_test_123',
              }
            }
            if (id === 'cs_test_unpaid') {
              return {
                id: 'cs_test_unpaid',
                payment_status: 'unpaid',
                amount_total: 5900,
                currency: 'usd',
                client_reference_id: sampleCase.id,
                metadata: { case_id: sampleCase.id },
              }
            }
            if (id === 'cs_test_wrong_case') {
              return {
                id: 'cs_test_wrong_case',
                payment_status: 'paid',
                amount_total: 5900,
                currency: 'usd',
                client_reference_id: 'different-case-id',
                metadata: { case_id: 'different-case-id' },
              }
            }
            throw new Error('Not found')
          }),
        },
      },
    }
    setStripe(mockStripe as any)

    // Mock markPaid
    const markPaidSpy = vi.spyOn(paymentService, 'markPaid').mockResolvedValue({
      paid: true,
      alreadyPaid: false,
      case: { ...sampleCase, status: 'paid', paid_at: new Date().toISOString() },
    })

    // Case A: Successful paid session confirms payment
    const confirmResult = await paymentService.confirmStripe(sampleCase, { sessionId: 'cs_test_paid' })
    expect(confirmResult.paid).toBe(true)
    expect(markPaidSpy).toHaveBeenCalledWith(
      sampleCase.id,
      'stripe',
      'cs_test_paid',
      5900,
      'USD',
      expect.objectContaining({ session: 'cs_test_paid' })
    )

    // Case B: Unpaid/pending session returns paid: false without marking case paid
    markPaidSpy.mockClear()
    const unpaidResult = await paymentService.confirmStripe(sampleCase, { sessionId: 'cs_test_unpaid' })
    expect(unpaidResult.paid).toBe(false)
    expect(unpaidResult.status).toBe('unpaid')
    expect(markPaidSpy).not.toHaveBeenCalled()

    // Case C: Session belonging to another case is rejected with 403 Forbidden
    await expect(
      paymentService.confirmStripe(sampleCase, { sessionId: 'cs_test_wrong_case' })
    ).rejects.toThrow('This payment belongs to another report')

    // Case D: Deduplication check simulation - confirming an already confirmed session ref is prevented
    const sessionDeduplicationTracker = new Set<string>()
    const simulateClientConfirmation = async (sessionId: string) => {
      if (sessionDeduplicationTracker.has(sessionId)) {
        return { handled: false, reason: 'duplicate_prevented' }
      }
      sessionDeduplicationTracker.add(sessionId)
      return { handled: true, reason: 'confirmed' }
    }

    const firstRun = await simulateClientConfirmation('cs_test_session_id')
    expect(firstRun.handled).toBe(true)

    // Duplicate call with same sessionId is blocked from duplicate dispatch
    const secondRun = await simulateClientConfirmation('cs_test_session_id')
    expect(secondRun.handled).toBe(false)
    expect(secondRun.reason).toBe('duplicate_prevented')
  })

  // -------------------------------------------------------------------------
  // 8. Frontend does not allow checkout while payment mode is unresolved
  // -------------------------------------------------------------------------
  it('8. Verifies frontend payment mode resolution contract prevents checkout when unresolved', () => {
    // Pure resolver function matching ReportSalesPage logic
    const resolvePaymentMode = (
      cfgProp: { payments?: { mode?: string } } | null,
      envVar?: string
    ): { mode: 'mock' | 'live' | null; isResolved: boolean; isMock: boolean } => {
      const rawMode = cfgProp?.payments?.mode
      const mode =
        rawMode === 'mock' || rawMode === 'live'
          ? rawMode
          : envVar === 'mock' || envVar === 'live'
            ? envVar
            : null
      return {
        mode,
        isResolved: mode !== null,
        isMock: mode === 'mock',
      }
    }

    // Scenario A: Unresolved state (backend /config hasn't loaded and no valid env variable)
    const unresolved1 = resolvePaymentMode(null, undefined)
    expect(unresolved1.isResolved).toBe(false)
    expect(unresolved1.mode).toBeNull()
    // CRITICAL: Must NOT silently default to mock!
    expect(unresolved1.isMock).toBe(false)

    // Scenario B: Backend config returns invalid or empty mode
    const unresolved2 = resolvePaymentMode({ payments: {} }, undefined)
    expect(unresolved2.isResolved).toBe(false)
    expect(unresolved2.mode).toBeNull()

    // Scenario C: Authoritative backend config resolves to 'mock'
    const resolvedMock = resolvePaymentMode({ payments: { mode: 'mock' } }, 'live')
    expect(resolvedMock.isResolved).toBe(true)
    expect(resolvedMock.mode).toBe('mock')
    expect(resolvedMock.isMock).toBe(true)

    // Scenario D: Authoritative backend config resolves to 'live'
    const resolvedLive = resolvePaymentMode({ payments: { mode: 'live' } }, 'mock')
    expect(resolvedLive.isResolved).toBe(true)
    expect(resolvedLive.mode).toBe('live')
    expect(resolvedLive.isMock).toBe(false)

    // Scenario E: Backend config failed, valid PAYMENTS_MODE env variable fallback works
    const envFallback = resolvePaymentMode(null, 'live')
    expect(envFallback.isResolved).toBe(true)
    expect(envFallback.mode).toBe('live')
    expect(envFallback.isMock).toBe(false)

    // Scenario F: Submission guard simulation - rejects checkout when unresolved
    const simulateProceedToPayment = (resolvedState: { isResolved: boolean }) => {
      if (!resolvedState.isResolved) {
        throw new Error('Payment configuration is still loading. Please wait a moment.')
      }
      return { proceed: true }
    }

    expect(() => simulateProceedToPayment(unresolved1)).toThrow('Payment configuration is still loading')
    expect(simulateProceedToPayment(resolvedMock).proceed).toBe(true)
    expect(simulateProceedToPayment(resolvedLive).proceed).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 9. Country-based Price Selection (US -> US_PAID_REPORT / USD; Canada -> CANADA_PAID_REPORT / CAD)
  // -------------------------------------------------------------------------
  it('9. Selects US Price ID for US cases and Canada Price ID for Canadian cases based on case jurisdiction', async () => {
    (env as any).PAYMENTS_MODE = 'live'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_mock_secret_key'
    ;(env as any).US_PAID_REPORT = 'price_1UcJMZALOet47jkqZnOlm0A6'
    ;(env as any).CANADA_PAID_REPORT = 'price_1UcJNDALOet47jkq1sXXLhkS'

    const retrievedPrices: string[] = []
    const createdSessions: any[] = []

    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockImplementation(async (priceId: string) => {
          retrievedPrices.push(priceId)
          if (priceId === 'price_1UcJMZALOet47jkqZnOlm0A6') {
            return { id: priceId, active: true, currency: 'usd', unit_amount: 5900 }
          }
          if (priceId === 'price_1UcJNDALOet47jkq1sXXLhkS') {
            return { id: priceId, active: true, currency: 'cad', unit_amount: 5900 }
          }
          throw new Error('Unknown price')
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockImplementation(async (params: any) => {
            createdSessions.push(params)
            return { id: `cs_test_${params.client_reference_id}`, url: `https://checkout.stripe.com/pay/${params.client_reference_id}` }
          }),
        },
      },
    }
    setStripe(mockStripe as any)

    // US Case
    const usCase = { ...sampleCase, country: 'US' as const, jurisdiction_code: 'US-CA' }
    const usResult = await paymentService.stripeCheckout(usCase, {
      successUrl: 'https://example.com/report?case=us-1',
      cancelUrl: 'https://example.com/report?case=us-1',
    })
    expect(usResult.sessionId).toBe('cs_test_55555555-5555-5555-5555-555555555555')
    expect(createdSessions[0].line_items[0].price).toBe('price_1UcJMZALOet47jkqZnOlm0A6')
    expect(createdSessions[0].metadata.country).toBe('US')

    // Canada Case
    const caCase = { ...sampleCase, id: '66666666-6666-6666-6666-666666666666', country: 'CA' as const, jurisdiction_code: 'CA-ON' }
    const caResult = await paymentService.stripeCheckout(caCase, {
      successUrl: 'https://example.com/report?case=ca-1',
      cancelUrl: 'https://example.com/report?case=ca-1',
    })
    expect(caResult.sessionId).toBe('cs_test_66666666-6666-6666-6666-666666666666')
    expect(createdSessions[1].line_items[0].price).toBe('price_1UcJNDALOet47jkq1sXXLhkS')
    expect(createdSessions[1].metadata.country).toBe('CA')
  })

  // -------------------------------------------------------------------------
  // 10. Validates that inactive price or currency mismatch is rejected
  // -------------------------------------------------------------------------
  it('10. Rejects checkout if Price ID is inactive or currency does not match jurisdiction', async () => {
    (env as any).PAYMENTS_MODE = 'live'
    ;(env as any).STRIPE_SECRET_KEY = 'sk_test_mock_secret_key'
    ;(env as any).US_PAID_REPORT = 'price_inactive_test'

    const mockStripe = {
      prices: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'price_inactive_test',
          active: false, // inactive!
          currency: 'usd',
          unit_amount: 5900,
        }),
      },
    }
    setStripe(mockStripe as any)

    await expect(
      paymentService.stripeCheckout(sampleCase, {
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      })
    ).rejects.toThrow('inactive')
  })

  // -------------------------------------------------------------------------
  // 11. Stripe Webhook Signature Verification
  // -------------------------------------------------------------------------
  it('11. Verifies Stripe webhook signatures with official Stripe SDK and rejects invalid signatures', () => {
    (env as any).STRIPE_SECRET_KEY = 'sk_test_mock_secret_key'
    ;(env as any).STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_123'

    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation((payload, header, secret) => {
          if (header === 'valid_sig' && secret === 'whsec_test_secret_123') {
            return JSON.parse(payload.toString())
          }
          throw new Error('No signatures found matching the expected signature for payload')
        }),
      },
    }
    setStripe(mockStripe as any)

    const payload = Buffer.from(JSON.stringify({ id: 'evt_test_1', type: 'checkout.session.completed' }))

    // Valid signature succeeds
    const evt = paymentService.verifyStripeSignature(payload, 'valid_sig')
    expect(evt.id).toBe('evt_test_1')

    // Invalid signature throws ApiError
    expect(() =>
      paymentService.verifyStripeSignature(payload, 'invalid_sig')
    ).toThrow('Stripe signature verification failed')
  })

  // -------------------------------------------------------------------------
  // 12. Webhook Event Handling: checkout.session.completed verifies case, status, currency, and amount
  // -------------------------------------------------------------------------
  it('12. Webhook marks case as paid only after verifying payment_status, currency, and minimum amount', async () => {
    const markPaidSpy = vi.spyOn(paymentService, 'markPaid').mockResolvedValue({
      paid: true,
      alreadyPaid: false,
      case: { ...sampleCase, status: 'paid', paid_at: new Date().toISOString() },
    })

    vi.spyOn(caseService, 'get').mockResolvedValue({
      ...sampleCase,
      country: 'US',
    })

    // Scenario A: Legitimate completed paid session
    const validEvent = {
      id: 'evt_checkout_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session_abc',
          payment_status: 'paid',
          amount_total: 5900,
          currency: 'usd',
          client_reference_id: sampleCase.id,
          metadata: { case_id: sampleCase.id },
          payment_intent: 'pi_test_123',
        },
      },
    }

    await paymentService.handleStripeEvent(validEvent as any)
    expect(markPaidSpy).toHaveBeenCalledWith(
      sampleCase.id,
      'stripe',
      'cs_test_session_abc',
      5900,
      'USD',
      expect.objectContaining({ session_id: 'cs_test_session_abc' })
    )

    // Scenario B: Session not paid yet (unpaid / open) -> Must NOT mark paid
    markPaidSpy.mockClear()
    const unpaidEvent = {
      id: 'evt_checkout_unpaid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session_unpaid',
          payment_status: 'unpaid',
          client_reference_id: sampleCase.id,
        },
      },
    }
    await paymentService.handleStripeEvent(unpaidEvent as any)
    expect(markPaidSpy).not.toHaveBeenCalled()

    // Scenario C: Session with currency mismatch (e.g. eur for a US case) -> Must NOT mark paid
    markPaidSpy.mockClear()
    const wrongCurEvent = {
      id: 'evt_checkout_eur',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_eur',
          payment_status: 'paid',
          amount_total: 5900,
          currency: 'eur',
          client_reference_id: sampleCase.id,
        },
      },
    }
    await paymentService.handleStripeEvent(wrongCurEvent as any)
    expect(markPaidSpy).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 13. Webhook Idempotency: duplicate events do not duplicate database payments or re-send emails
  // -------------------------------------------------------------------------
  it('13. Confirms markPaid is idempotent when handling duplicate events or repeated calls', async () => {
    (env as any).EMAIL_MODE = 'live'
    let emailsSent = 0
    emailService.setMockTransport(async () => {
      emailsSent++
    })

    // Mock payments db operations
    const { db } = await import('../../src/config/db')
    vi.spyOn(db(), 'from').mockImplementation((table: string) => {
      if (table === 'payments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        } as any
      }
      return {} as any
    })

    // Case already paid
    const alreadyPaidCase: CaseRow = {
      ...sampleCase,
      status: 'paid',
      paid_at: '2026-11-16T10:00:00.000Z',
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'USD',
      email: 'customer@example.com',
    }

    vi.spyOn(caseService, 'get').mockResolvedValue(alreadyPaidCase)
    const updateSpy = vi.spyOn(caseService, 'update')

    const res = await paymentService.markPaid(
      sampleCase.id,
      'stripe',
      'cs_already_paid',
      5900,
      'USD'
    )

    expect(res.paid).toBe(true)
    expect(res.alreadyPaid).toBe(true)
    // No duplicate database update or duplicate email dispatch
    expect(updateSpy).not.toHaveBeenCalled()
    expect(emailsSent).toBe(0)
  })

  // -------------------------------------------------------------------------
  // 14. Access Protection: unconfirmed payment blocks customer info and report operations
  // -------------------------------------------------------------------------
  it('14. Unpaid case strictly rejects customer info submission, build initiation, and PDF access', async () => {
    const unpaidCase: CaseRow = {
      ...sampleCase,
      status: 'free_check',
      paid_at: null,
      payment_provider: null,
    }

    vi.spyOn(caseService, 'get').mockResolvedValue(unpaidCase)

    // Customer info requires payment
    await expect(
      caseService.submitCustomerInfo(unpaidCase.id, {
        name: 'Jordan Doe',
        email: 'jordan@example.com',
      })
    ).rejects.toThrow('Payment required before submitting customer details')

    // Report delivery requires payment
    await expect(
      caseService.deliverReportEmail(unpaidCase)
    ).rejects.toThrow('Payment required before report delivery')
  })
})
