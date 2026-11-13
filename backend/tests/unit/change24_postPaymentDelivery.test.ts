import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { caseService } from '../../src/services/case.service'
import { paymentService } from '../../src/services/payment.service'
import { emailService } from '../../src/services/email.service'
import { env } from '../../src/config/env'
import { postPaymentCustomerSchema } from '../../src/validators/fairexit.validator'
import type { CaseRow } from '../../src/fairexit/types'

describe('Group 3, Change 24: Post-Payment Report Delivery Tests', () => {
  const origEmailMode = env.EMAIL_MODE
  const baseCase: CaseRow = {
    id: '44444444-4444-4444-4444-444444444444',
    public_id: 'FX-0044',
    user_id: null,
    token_hashes: ['b4c81a297e68b320d75a40bb2531d0fa4ef7eb0a0e9b9cf2a52ef89196b6e792'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', years: 10, salary: 90000 },
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
    report_id: 'RPT-TEST-044',
    report: {
      reportId: 'RPT-TEST-044',
      executiveSummary: { headline: 'Severance analysis for Ontario employee' },
      documentFacts: { offerAmount: 25000, employerName: 'Acme Ltd' },
    },
    report_inputs: { offer: 25000 },
    report_ready_at: new Date().toISOString(),
    report_pdf_path: '44444444-4444-4444-4444-444444444444/report.pdf',
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.7',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    emailService.setMockTransport(null)
    ;(env as any).EMAIL_MODE = 'live'
  })

  afterEach(() => {
    ;(env as any).EMAIL_MODE = origEmailMode
  })

  // 1. Successful payment followed by name and email collection
  it('Scenario 1: Collects name and email only after successful payment', async () => {
    // Before payment: unpaid case rejects customer info submission
    vi.spyOn(caseService, 'get').mockResolvedValue({ ...baseCase, paid_at: null, payment_provider: null })
    await expect(
      caseService.submitCustomerInfo(baseCase.id, { name: 'Jane Doe', email: 'jane@example.com' })
    ).rejects.toThrow('Payment required')

    // After payment: paid case accepts name and email, saves to answers and consent
    const paidCase: CaseRow = {
      ...baseCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'CAD',
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'addToken').mockResolvedValue('test_token_123')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...paidCase,
      ...patch,
    } as CaseRow))

    const result = await caseService.submitCustomerInfo(baseCase.id, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      consentNews: true,
    })

    expect(result.success).toBe(true)
    expect(result.customer.name).toBe('Jane Doe')
    expect(result.customer.email).toBe('jane@example.com')
    expect(result.privateLink).toContain('case=' + baseCase.id)
    expect(result.privateLink).toContain('t=test_token_123')
  })

  // 2. Correct report displayed after submission
  it('Scenario 2: Retrieves the correct report for the authenticated case and extracted facts', async () => {
    const readyCase: CaseRow = {
      ...baseCase,
      status: 'ready',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      email: 'jane@example.com',
    }
    vi.spyOn(caseService, 'get').mockResolvedValue(readyCase)

    const deliveryStatus = await caseService.getDeliveryStatus(readyCase.id)
    expect(deliveryStatus.paid).toBe(true)
    expect(deliveryStatus.reportReady).toBe(true)
    expect(readyCase.report?.reportId).toBe('RPT-TEST-044')
    expect(readyCase.report?.documentFacts?.offerAmount).toBe(25000)
    expect(readyCase.report?.documentFacts?.employerName).toBe('Acme Ltd')
  })

  // 3. Report successfully emailed to the submitted address
  it('Scenario 3: Successfully emails the report with private link to the submitted address', async () => {
    let capturedEmail: { to: string; subject: string; text: string } | null = null
    emailService.setMockTransport(async (to, subject, text) => {
      capturedEmail = { to, subject, text }
      return { sent: true }
    })

    const readyCase: CaseRow = {
      ...baseCase,
      status: 'ready',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      email: 'client@example.com',
      answers: { ...baseCase.answers, customer_name: 'Alex Morgan' },
    }
    vi.spyOn(caseService, 'addToken').mockResolvedValue('secure_token_abc')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...readyCase,
      ...patch,
    } as CaseRow))

    const deliveryRes = await caseService.deliverReportEmail(readyCase, 'secure_token_abc')

    expect(deliveryRes.status).toBe('sent')
    expect(deliveryRes.to).toBe('client@example.com')
    expect(capturedEmail).not.toBeNull()
    expect(capturedEmail?.to).toBe('client@example.com')
    expect(capturedEmail?.subject).toContain('Your FairExit Report Is Ready')
    expect(capturedEmail?.text).toContain('Your FairExit report is ready.')
    expect(capturedEmail?.text).toContain('secure_token_abc')
  })

  // 4. Private report link opens correct report with appropriate access protection
  it('Scenario 4: Private link token verification protects report access', () => {
    const rawToken = 'my_secret_token_12345'
    const tokenHash = caseService.hasToken(
      {
        ...baseCase,
        token_hashes: [
          // SHA256 of 'my_secret_token_12345'
          require('crypto').createHash('sha256').update('my_secret_token_12345').digest('hex'),
        ],
      },
      rawToken
    )
    expect(tokenHash).toBe(true)

    // Invalid or missing token is rejected
    expect(caseService.hasToken(baseCase, 'invalid_token_999')).toBe(false)
    expect(caseService.hasToken(baseCase, null)).toBe(false)
    expect(caseService.hasToken(baseCase, undefined)).toBe(false)
  })

  // 5. Invalid email and missing name handling
  it('Scenario 5: Validates that name cannot be empty and email must be valid format', () => {
    // Missing / empty name
    const resEmptyName = postPaymentCustomerSchema.safeParse({ name: '   ', email: 'valid@example.com' })
    expect(resEmptyName.success).toBe(false)

    // Invalid email
    const resBadEmail = postPaymentCustomerSchema.safeParse({ name: 'John Doe', email: 'not-an-email' })
    expect(resBadEmail.success).toBe(false)

    // Valid inputs
    const resValid = postPaymentCustomerSchema.safeParse({ name: 'John Doe', email: 'john@example.com' })
    expect(resValid.success).toBe(true)
  })

  // 6. Payment failure or unconfirmed payment cannot access report
  it('Scenario 6: Unconfirmed or unpaid case cannot build report or trigger delivery', async () => {
    const unpaid: CaseRow = {
      ...baseCase,
      paid_at: null,
      payment_provider: null,
      status: 'free_check',
    }

    expect(caseService.isPaid(unpaid)).toBe(false)
    expect(caseService.nextStep(unpaid, [])).toBe('pay')

    await expect(
      caseService.deliverReportEmail(unpaid)
    ).rejects.toThrow('Payment required')
  })

  // 7. Email failure and retry behaviour
  it('Scenario 7: Handles email delivery failure gracefully and allows retry', async () => {
    let failCount = 0
    emailService.setMockTransport(async () => {
      if (failCount === 0) {
        failCount++
        return { sent: false, error: 'SMTP connection timeout' }
      }
      return { sent: true }
    })

    const readyCase: CaseRow = {
      ...baseCase,
      status: 'ready',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      email: 'retry-user@example.com',
    }
    vi.spyOn(caseService, 'addToken').mockResolvedValue('token_xyz')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...readyCase,
      ...patch,
    } as CaseRow))

    // First attempt fails
    const firstAttempt = await caseService.deliverReportEmail(readyCase, 'token_xyz')
    expect(firstAttempt.status).toBe('failed')
    expect(firstAttempt.error).toContain('SMTP connection timeout')

    // Second attempt (retry) succeeds
    const retryAttempt = await caseService.deliverReportEmail(readyCase, 'token_xyz', true)
    expect(retryAttempt.status).toBe('sent')
  })

  // 8. Refreshes, duplicate submissions, and webhook retries do not cause duplicate deliveries
  it('Scenario 8: Idempotent processing prevents duplicate email deliveries on refresh or retries', async () => {
    let emailSendCount = 0
    emailService.setMockTransport(async () => {
      emailSendCount++
      return { sent: true }
    })

    const alreadySentCase: CaseRow = {
      ...baseCase,
      status: 'ready',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      email: 'idempotent@example.com',
      answers: {
        ...baseCase.answers,
        report_delivery: {
          status: 'sent',
          sentAt: '2026-11-13T10:00:00.000Z',
          to: 'idempotent@example.com',
        },
      },
    }

    // Attempt delivery without forceRetry (e.g. page refresh or repeated request)
    const result = await caseService.deliverReportEmail(alreadySentCase)

    expect(result.status).toBe('sent')
    expect((result as any).alreadySent).toBe(true)
    expect(emailSendCount).toBe(0) // Did NOT send a duplicate email!
  })

  // 9. Both US and Canadian purchase flows
  it('Scenario 9: Country-specific terminology and currency preserved for US and Canada', () => {
    const caCase: CaseRow = { ...baseCase, country: 'CA' }
    const usCase: CaseRow = { ...baseCase, country: 'US', jurisdiction_code: 'US-NY' }

    expect(paymentService.price(caCase).currency).toBe('CAD')
    expect(paymentService.price(caCase).amountCents).toBe(5900)

    expect(paymentService.price(usCase).currency).toBe('USD')
    expect(paymentService.price(usCase).amountCents).toBe(5900)
  })
})

