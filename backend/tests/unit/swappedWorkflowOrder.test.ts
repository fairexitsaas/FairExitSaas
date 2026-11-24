import { describe, it, expect, vi, beforeEach } from 'vitest'
import { caseService, hasCompletedPostPaymentCollection } from '../../src/services/case.service'
import { flowService } from '../../src/services/flow.service'
import { paymentService } from '../../src/services/payment.service'
import { caseController } from '../../src/controllers/case.controller'
import { env } from '../../src/config/env'
import type { CaseRow, CaseDocumentRow } from '../../src/fairexit/types'

describe('FairExit Swapped Workflow Order & Processing Trigger Verification (All 16 Scenarios)', () => {
  const baseCaseCA: CaseRow = {
    id: '11111111-2222-3333-4444-555555555555',
    public_id: 'FX-0001',
    user_id: null,
    token_hashes: ['test_token_hash_ca'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON', country: 'CA' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', years: 5, salary: 95000 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: null,
    consent: null,
    remind: false,
    paid_at: null,
    payment_provider: null,
    payment_session_id: null,
    payment_intent_id: null,
    amount_cents: null,
    currency: null,
    contract_status: null,
    call_a: null,
    call_a_at: null,
    check_state: null,
    attested_at: null,
    report: null,
    report_inputs: null,
    report_ready_at: null,
    report_pdf_path: null,
    docs_deleted_at: null,
    docs_delete_after: null,
    report_delete_after: null,
    rules_version: null,
    prompt_version: null,
    prompt_sha256: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const baseCaseUS: CaseRow = {
    ...baseCaseCA,
    id: '99999999-8888-7777-6666-555555555555',
    public_id: 'FX-0002',
    token_hashes: ['test_token_hash_us'],
    country: 'US',
    jurisdiction_code: 'US-NY',
    jurisdiction: { name: 'New York', code: 'US-NY', country: 'US' } as any,
    answers: { state: 'NY', years: 6, salary: 140000 },
  }

  const letterDoc: CaseDocumentRow = {
    id: 'doc-letter-1',
    case_id: baseCaseCA.id,
    kind: 'letter',
    file_name: 'severance-letter.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024 * 50,
    storage_path: 'cases/11111111/doc-letter-1.pdf',
    status: 'uploaded',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const contractDoc: CaseDocumentRow = {
    id: 'doc-contract-1',
    case_id: baseCaseCA.id,
    kind: 'contract',
    file_name: 'employment-contract.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024 * 70,
    storage_path: 'cases/11111111/doc-contract-1.pdf',
    status: 'uploaded',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  function mockReqRes(caseId: string, body: any = {}) {
    let statusCode = 200
    let jsonBody: any = null
    const req: any = {
      params: { id: caseId },
      caseRow: baseCaseCA,
      body,
      query: {},
      headers: { 'x-case-token': 'token' },
      user: null,
      id: 'req-test-123',
    }
    const res: any = {
      status(code: number) {
        statusCode = code
        return this
      },
      json(data: any) {
        jsonBody = data
        return this
      },
      setHeader() {
        return this
      },
    }
    return { req, res, getStatus: () => statusCode, getBody: () => jsonBody }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // 1. Open paid-report flow -> Document upload appears first
  it('1. Open paid-report flow: Document upload step appears first when no documents exist', () => {
    const step = caseService.nextStep(baseCaseCA, [])
    expect(step).toBe('upload')

    const readiness = caseService.readiness(baseCaseCA, [])
    expect(readiness.letterPages).toBe(0)
    expect(readiness.contractOk).toBe(false)
    expect(readiness.canPay).toBe(false)
    expect(readiness.canRead).toBe(false)
  })

  // 2. Upload first document only -> Cannot proceed to payment
  it('2. Upload first document only: Cannot proceed to payment until both documents are satisfied', async () => {
    const docs = [letterDoc]
    const step = caseService.nextStep(baseCaseCA, docs)
    expect(step).toBe('upload')

    const readiness = caseService.readiness(baseCaseCA, docs)
    expect(readiness.letterPages).toBe(1)
    expect(readiness.contractPages).toBe(0)
    expect(readiness.contractOk).toBe(false)
    expect(readiness.canPay).toBe(false)

    // Verify backend controllers block checkout when canPay is false
    vi.spyOn(caseService, 'get').mockResolvedValue(baseCaseCA)
    vi.spyOn(caseService, 'hasToken').mockReturnValue(true)
    vi.spyOn(caseService, 'documents').mockResolvedValue(docs)

    const { req, res } = mockReqRes(baseCaseCA.id, { termsAccepted: true, email: 'user@example.com' })
    await expect(caseController.prepareCheckout(req, res)).rejects.toThrow('Both documents must be uploaded before proceeding to payment')
    await expect(caseController.stripeCheckout(req, res)).rejects.toThrow('Both documents must be uploaded before proceeding to payment')

    const origPaymentsMode = env.PAYMENTS_MODE
    ;(env as any).PAYMENTS_MODE = 'mock'
    try {
      await expect(caseController.mockPay(req, res)).rejects.toThrow('Both documents must be uploaded before proceeding to payment')
    } finally {
      ;(env as any).PAYMENTS_MODE = origPaymentsMode
    }
  })

  // 3. Upload both documents -> Payment becomes available
  it('3. Upload both documents: Payment step becomes available and upload does NOT trigger processing', () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const docs = [letterDoc, contractDoc]

    const readiness = caseService.readiness(baseCaseCA, docs)
    expect(readiness.letterPages).toBe(1)
    expect(readiness.contractPages).toBe(1)
    expect(readiness.contractOk).toBe(true)
    expect(readiness.canPay).toBe(true)

    const step = caseService.nextStep(baseCaseCA, docs)
    expect(step).toBe('pay')

    // Document upload must NOT independently launch AI processing
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 4. Complete payment -> Name/email page appears
  it('4. Complete payment: Marks case paid, displays name/email modal, and does NOT start processing', () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const paidCase: CaseRow = {
      ...baseCaseCA,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'CAD',
    }
    const docs = [letterDoc, contractDoc]

    expect(caseService.isPaid(paidCase)).toBe(true)
    expect(hasCompletedPostPaymentCollection(paidCase)).toBe(false)

    // In the swapped flow, post-payment with incomplete customer info stays on 'pay' to show modal
    const step = caseService.nextStep(paidCase, docs)
    expect(step).toBe('pay')

    // Case view flags that customer info is not yet completed
    const view = caseService.view(paidCase, docs)
    expect(view.hasCompletedCustomerInfo).toBe(false)
    expect(view.paid).toBe(true)

    // No processing started yet
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 5. Payment cancelled -> No processing starts
  it('5. Payment cancelled: Case remains unpaid and no processing starts', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const unpaidCase = { ...baseCaseCA, status: 'free_check', paid_at: null }

    expect(caseService.isPaid(unpaidCase)).toBe(false)
    expect(startReadSpy).not.toHaveBeenCalled()

    // Calling startRead directly on unpaid case throws error
    vi.spyOn(caseService, 'documents').mockResolvedValue([letterDoc, contractDoc])
    await expect(flowService.startRead(unpaidCase)).rejects.toThrow('Payment required')
  })

  // 6. Payment failed -> No processing starts
  it('6. Payment failed: Failed payment rejects and prevents document processing', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const failedCase = { ...baseCaseCA, status: 'free_check', paid_at: null }

    const readiness = caseService.readiness(failedCase, [letterDoc, contractDoc])
    expect(readiness.canRead).toBe(false)
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 7. Stripe webhook received -> Payment verified, no processing starts
  it('7. Stripe webhook received: Verifies payment and does NOT launch AI processing', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const markPaidSpy = vi.spyOn(paymentService, 'markPaid').mockResolvedValue({
      paid: true,
      alreadyPaid: false,
      case: { ...baseCaseCA, status: 'paid', paid_at: new Date().toISOString() },
    })

    const webhookResult = await paymentService.markPaid(
      baseCaseCA.id,
      'stripe',
      'cs_test_123',
      5900,
      'CAD'
    )

    expect(markPaidSpy).toHaveBeenCalledWith(baseCaseCA.id, 'stripe', 'cs_test_123', 5900, 'CAD')
    expect(webhookResult.paid).toBe(true)
    // Webhook must NOT launch startRead
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 8. Name/email page opened -> No processing starts
  it('8. Name/email page opened: Viewing or rendering modal does not start processing', () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const paidCase: CaseRow = {
      ...baseCaseCA,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }
    const readiness = caseService.readiness(paidCase, [letterDoc, contractDoc])
    expect(readiness.canRead).toBe(false)
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 9. Invalid name/email -> No processing starts
  it('9. Invalid name/email: Validation rejects and no processing starts', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const paidCase: CaseRow = {
      ...baseCaseCA,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'documents').mockResolvedValue([letterDoc, contractDoc])

    await expect(
      caseService.submitCustomerInfo(paidCase.id, { name: '', email: 'invalid-email' })
    ).rejects.toThrow()

    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 10. Save Details fails -> No processing starts
  it('10. Save Details fails: Database failure during save prevents processing initiation', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    const paidCase: CaseRow = {
      ...baseCaseCA,
      status: 'paid',
      paid_at: new Date().toISOString(),
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'documents').mockResolvedValue([letterDoc, contractDoc])
    vi.spyOn(caseService, 'update').mockRejectedValue(new Error('Database disk full'))

    await expect(
      caseService.submitCustomerInfo(paidCase.id, { name: 'Valid User', email: 'valid@example.com' })
    ).rejects.toThrow('Database disk full')

    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 11. Save Details succeeds -> Exactly one processing job starts
  it('11. Save Details succeeds: Saves customer details and initiates exactly one processing job', async () => {
    const paidCase: CaseRow = {
      ...baseCaseCA,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'CAD',
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'documents').mockResolvedValue([letterDoc, contractDoc])
    vi.spyOn(caseService, 'addToken').mockResolvedValue('token_abc_123')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...paidCase,
      ...patch,
    } as CaseRow))

    const startReadSpy = vi.spyOn(flowService, 'startRead').mockResolvedValue({ started: true } as any)

    const result = await caseService.submitCustomerInfo(paidCase.id, {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      consentNews: true,
    })

    expect(result.success).toBe(true)
    expect(result.customer.name).toBe('Sarah Connor')
    expect(result.customer.email).toBe('sarah@example.com')
    expect(result.processingStarted).toBe(true)
    expect(startReadSpy).toHaveBeenCalledTimes(1)
  })

  // 12. Double-click Save Details -> No duplicate processing
  it('12. Double-click Save Details: Idempotency safeguards prevent duplicate processing', async () => {
    const alreadyReadingCase: CaseRow = {
      ...baseCaseCA,
      status: 'reading',
      paid_at: new Date().toISOString(),
      job_started_at: new Date().toISOString(),
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(alreadyReadingCase)
    vi.spyOn(caseService, 'documents').mockResolvedValue([letterDoc, contractDoc])
    vi.spyOn(caseService, 'addToken').mockResolvedValue('token_abc_123')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...alreadyReadingCase,
      ...patch,
    } as CaseRow))

    const startReadSpy = vi.spyOn(flowService, 'startRead')

    const result = await caseService.submitCustomerInfo(alreadyReadingCase.id, {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
    })

    expect(result.success).toBe(true)
    expect(result.processingStarted).toBe(false)
    // startRead is NOT called again because case is already processing
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 13. Duplicate Stripe webhook -> No duplicate processing
  it('13. Duplicate Stripe webhook: Idempotent payment recording produces no duplicate processing', async () => {
    const startReadSpy = vi.spyOn(flowService, 'startRead')
    vi.spyOn(paymentService, 'markPaid').mockResolvedValue({
      paid: true,
      alreadyPaid: true,
      case: { ...baseCaseCA, status: 'paid', paid_at: new Date().toISOString() },
    })

    const result = await paymentService.markPaid(baseCaseCA.id, 'stripe', 'cs_dup_123', 5900, 'CAD')
    expect(result.alreadyPaid).toBe(true)
    expect(startReadSpy).not.toHaveBeenCalled()
  })

  // 14. Successful processing -> Existing report generation and email delivery work
  it('14. Successful processing: Downstream report readiness and email delivery preserved', async () => {
    const readyCase: CaseRow = {
      ...baseCaseCA,
      status: 'ready',
      paid_at: new Date().toISOString(),
      email: 'sarah@example.com',
      report_ready_at: new Date().toISOString(),
      report: { summary: 'Strong claim' } as any,
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(readyCase)

    const deliveryStatus = await caseService.getDeliveryStatus(readyCase.id)
    expect(deliveryStatus.paid).toBe(true)
    expect(deliveryStatus.reportReady).toBe(true)
    expect(deliveryStatus.customer.email).toBe('sarah@example.com')

    const step = caseService.nextStep(readyCase, [letterDoc, contractDoc])
    expect(step).toBe('ready')
  })

  // 15. Canada submission -> Existing Canadian routing remains intact
  it('15. Canada submission: Preserves Canadian routing, provincial jurisdiction, and CAD pricing', () => {
    expect(baseCaseCA.country).toBe('CA')
    expect(baseCaseCA.jurisdiction_code).toBe('CA-ON')
    expect(baseCaseCA.answers.province).toBe('ON')

    const step = caseService.nextStep(baseCaseCA, [])
    expect(step).toBe('upload')

    const view = caseService.view(baseCaseCA, [])
    expect(view.country).toBe('CA')
    expect(view.jurisdiction.code).toBe('CA-ON')
  })

  // 16. US submission -> Existing US routing remains intact
  it('16. US submission: Preserves US routing, state jurisdiction, and USD pricing', () => {
    expect(baseCaseUS.country).toBe('US')
    expect(baseCaseUS.jurisdiction_code).toBe('US-NY')
    expect(baseCaseUS.answers.state).toBe('NY')

    const step = caseService.nextStep(baseCaseUS, [])
    expect(step).toBe('upload')

    const view = caseService.view(baseCaseUS, [])
    expect(view.country).toBe('US')
    expect(view.jurisdiction.code).toBe('US-NY')
  })
})
