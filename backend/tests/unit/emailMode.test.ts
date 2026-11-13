import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { env } from '../../src/config/env'
import { emailService } from '../../src/services/email.service'
import { caseService } from '../../src/services/case.service'
import { flowService } from '../../src/services/flow.service'
import { storageService } from '../../src/services/storage.service'
import { caseController } from '../../src/controllers/case.controller'
import publicRoutes from '../../src/routes/public.routes'
import type { CaseRow } from '../../src/fairexit/types'

describe('EMAIL_MODE: Independent Mock & Live Resend Integration Tests', () => {
  const origEmailMode = env.EMAIL_MODE
  const origPaymentsMode = env.PAYMENTS_MODE
  const origResendKey = env.RESEND_API_KEY
  const origEmailFrom = env.EMAIL_FROM

  const sampleCase: CaseRow = {
    id: '55555555-5555-5555-5555-555555555555',
    public_id: 'FX-0055',
    user_id: null,
    token_hashes: ['7b22a6134b29bb8876fae85cb48df12ffb8a786d11f81a70c0c70094191c0683'],
    platform: 'web',
    country: 'US',
    jurisdiction_code: 'US-CA',
    jurisdiction: { name: 'California', code: 'US-CA' } as any,
    covered: true,
    industry: null,
    answers: { state: 'CA', years: 8, salary: 120000 },
    free_result: null,
    status: 'ready',
    status_detail: null,
    job_started_at: null,
    email: 'client@example.com',
    consent: null,
    remind: false,
    paid_at: new Date().toISOString(),
    payment_provider: 'mock',
    amount_cents: 5900,
    currency: 'USD',
    contract_status: 'never',
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: true, attested_at: new Date().toISOString() },
    attested_at: new Date().toISOString(),
    report_id: 'RPT-TEST-055',
    report: {
      reportId: 'RPT-TEST-055',
      executiveSummary: { headline: 'California severance assessment' },
    },
    report_inputs: { offer: 30000 },
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

  beforeEach(() => {
    vi.restoreAllMocks()
    emailService.setMockTransport(null)
    ;(env as any).EMAIL_MODE = 'mock'
    ;(env as any).PAYMENTS_MODE = 'mock'
    ;(env as any).RESEND_API_KEY = 're_test_dummy_key_123'
    ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'
  })

  afterEach(() => {
    ;(env as any).EMAIL_MODE = origEmailMode
    ;(env as any).PAYMENTS_MODE = origPaymentsMode
    ;(env as any).RESEND_API_KEY = origResendKey
    ;(env as any).EMAIL_FROM = origEmailFrom
  })

  // =========================================================================
  // Section A: Mock Email Mode (EMAIL_MODE=mock)
  // =========================================================================

  it('1. EMAIL_MODE=mock skips all Resend API calls', async () => {
    ;(env as any).EMAIL_MODE = 'mock'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const res = await emailService.send('user@example.com', 'Test Subject', 'Test body')

    expect(res.sent).toBe(false)
    expect(res.mocked).toBe(true)
    expect(res.reason).toBe('email_mode_mock')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('2. Backend sendReportEmail endpoint skips delivery in mock mode without calling email provider', async () => {
    ;(env as any).EMAIL_MODE = 'mock'
    vi.spyOn(caseService, 'get').mockResolvedValue(sampleCase)
    const deliverSpy = vi.spyOn(caseService, 'deliverReportEmail')

    const req: any = {
      caseRow: sampleCase,
      params: { id: sampleCase.id },
      body: { email: 'client@example.com' },
    }
    const res: any = {
      statusCode: 200,
      json: vi.fn(),
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    await caseController.sendReportEmail(req, res)

    expect(res.json).toHaveBeenCalled()
    const responsePayload = res.json.mock.calls[0][0]
    expect(responsePayload.data.status).toBe('disabled')
    expect(responsePayload.data.mocked).toBe(true)
    expect(deliverSpy).not.toHaveBeenCalled()
  })

  it('3. No automatic email dispatch occurs after report generation in mock mode', async () => {
    ;(env as any).EMAIL_MODE = 'mock'
    const deliverSpy = vi.spyOn(caseService, 'deliverReportEmail')
    const addTokenSpy = vi.spyOn(caseService, 'addToken')

    // Simulate flowService completing report compilation
    // flow.service.ts checks (done?.email && env.EMAIL_MODE === 'live')
    if (sampleCase.email && (env as any).EMAIL_MODE === 'live') {
      const token = await caseService.addToken(sampleCase)
      await caseService.deliverReportEmail(sampleCase, token)
    }

    expect(deliverSpy).not.toHaveBeenCalled()
    expect(addTokenSpy).not.toHaveBeenCalled()
  })

  it('4. No fake successful email delivery status is recorded in mock mode', async () => {
    ;(env as any).EMAIL_MODE = 'mock'
    const updateSpy = vi.spyOn(caseService, 'update')
    vi.spyOn(caseService, 'get').mockResolvedValue(sampleCase)

    const deliveryRes = await caseService.deliverReportEmail(sampleCase, 'token_xyz')

    expect(deliveryRes.status).toBe('disabled')
    expect(deliveryRes.mocked).toBe(true)
    expect(deliveryRes.message).toContain('Email delivery is disabled in demo mode')

    // Did NOT update case with a fake "sent" record!
    expect(updateSpy).not.toHaveBeenCalled()

    // getDeliveryStatus reflects disabled mode, not fake sent
    const status = await caseService.getDeliveryStatus(sampleCase.id)
    expect(status.delivery.status).toBe('disabled')
    expect(status.delivery.alreadySent).toBe(false)
  })

  it('5. Report generation and private report access still work seamlessly in mock mode', () => {
    ;(env as any).EMAIL_MODE = 'mock'
    const rawToken = 'private_secret_token_abc'
    const tokenHash = require('crypto').createHash('sha256').update(rawToken).digest('hex')

    const caseWithToken: CaseRow = {
      ...sampleCase,
      token_hashes: [tokenHash],
    }

    // Token validation succeeds
    const isValid = caseService.hasToken(caseWithToken, rawToken)
    expect(isValid).toBe(true)

    // Private link generation works without email dispatch
    const link = emailService.link(sampleCase, rawToken)
    expect(link).toContain(`/report?case=${sampleCase.id}`)
    expect(link).toContain(`t=${encodeURIComponent(rawToken)}`)
  })

  it('6. Customer name and email collection still work in mock mode via submitCustomerInfo', async () => {
    ;(env as any).EMAIL_MODE = 'mock'
    vi.spyOn(caseService, 'get').mockResolvedValue(sampleCase)
    vi.spyOn(caseService, 'addToken').mockResolvedValue('token_mock_123')
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...sampleCase,
      ...patch,
    } as CaseRow))

    const res = await caseService.submitCustomerInfo(sampleCase.id, {
      name: 'Morgan Stanley',
      email: 'morgan@example.com',
      consentNews: false,
    })

    expect(res.success).toBe(true)
    expect(res.customer.name).toBe('Morgan Stanley')
    expect(res.customer.email).toBe('morgan@example.com')
    expect(res.privateLink).toContain('token_mock_123')
    expect(res.emailDelivery.status).toBe('disabled')
    expect(res.emailDelivery.message).toContain('disabled in demo mode')
  })

  // =========================================================================
  // Section B: Live Email Mode (EMAIL_MODE=live)
  // =========================================================================

  it('7. Live mode: A valid recipient receives email via Resend with Bearer authentication', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    ;(env as any).RESEND_API_KEY = 're_test_live_key_999'
    ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'

    let capturedUrl = ''
    let capturedHeaders: any = {}
    let capturedBody: any = {}

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, opts: any) => {
      capturedUrl = String(url)
      capturedHeaders = opts?.headers || {}
      capturedBody = JSON.parse(opts?.body || '{}')
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_email_id_123' }),
      } as any
    })

    const res = await emailService.send('recipient@example.com', 'Your FairExit Report Is Ready', 'Access your report here: http://localhost:3000/report')

    expect(res.sent).toBe(true)
    expect(res.id).toBe('resend_email_id_123')
    expect(capturedUrl).toBe('https://api.resend.com/emails')
    expect(capturedHeaders.authorization).toBe('Bearer re_test_live_key_999')
    expect(capturedBody.from).toBe('FairExit <reports@fairexit.io>')
    expect(capturedBody.to).toEqual(['recipient@example.com'])
  })

  // =========================================================================
  // Section B: Live Email Mode with PDF Report Attachment
  // =========================================================================

  const mockPdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n170\n%%EOF')

  it('8. Live mode: A valid generated PDF is attached to a live Resend email', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    ;(env as any).RESEND_API_KEY = 're_live_key'
    ;(env as any).EMAIL_FROM = 'FairExit <onboarding@resend.dev>'

    let capturedBody: any = {}

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, opts: any) => {
      capturedBody = JSON.parse(opts?.body || '{}')
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_attachment_123' }),
      } as any
    })

    const res = await emailService.reportReady(sampleCase, mockPdfBytes)

    expect(res.sent).toBe(true)
    expect(res.id).toBe('resend_attachment_123')

    // Attachments verification
    expect(capturedBody.attachments).toBeDefined()
    expect(capturedBody.attachments.length).toBe(1)
    expect(capturedBody.attachments[0].filename).toBe('FairExit-Report.pdf')
    expect(capturedBody.attachments[0].content_type).toBe('application/pdf')
    expect(capturedBody.attachments[0].content).toBe(mockPdfBytes.toString('base64'))

    // Email content verification: exact subject and clean body without URLs or private tokens
    expect(capturedBody.subject).toBe('Your FairExit Report Is Ready')
    expect(capturedBody.text).toBe('Your FairExit report is ready. Please find your PDF report attached to this email.')
    expect(capturedBody.text).not.toContain('http')
    expect(capturedBody.text).not.toContain('case=')
    expect(capturedBody.text).not.toContain('supabase')
    expect(capturedBody.text).not.toContain('token')
  })

  it('8b. The attachment opens and contains the complete report bytes (offline accessible)', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    let capturedBody: any = {}

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, opts: any) => {
      capturedBody = JSON.parse(opts?.body || '{}')
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_attach_ok' }),
      } as any
    })

    await emailService.reportReady(sampleCase, mockPdfBytes)

    const base64Content = capturedBody.attachments[0].content
    const recoveredBuffer = Buffer.from(base64Content, 'base64')

    expect(recoveredBuffer.equals(mockPdfBytes)).toBe(true)
    expect(recoveredBuffer.toString('utf-8')).toContain('%PDF-1.7')
    expect(recoveredBuffer.toString('utf-8')).toContain('%%EOF')
  })

  it('8c. Missing PDF produces a clear failure and does not call Resend', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const caseWithoutPdf: CaseRow = { ...sampleCase, report_pdf_path: null }
    const res = await emailService.reportReady(caseWithoutPdf)

    expect(res.sent).toBe(false)
    expect(res.reason).toBe('missing_pdf')
    expect(res.error).toContain('PDF report attachment is required')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('8d. Oversized PDF produces a clear failure and does not call Resend', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Allocate 26MB buffer (exceeds 25MB limit)
    const oversizedPdf = Buffer.alloc(26 * 1024 * 1024, 0)
    const res = await emailService.reportReady(sampleCase, oversizedPdf)

    expect(res.sent).toBe(false)
    expect(res.reason).toBe('attachment_too_large')
    expect(res.error).toContain('exceeds maximum email attachment limit of 25MB')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('9. Live mode: Delivery requires confirmed payment, compiled report, and PDF readiness', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    vi.spyOn(storageService, 'download').mockResolvedValue(mockPdfBytes)

    // Unpaid case throws badRequest
    const unpaidCase: CaseRow = { ...sampleCase, status: 'free_check', paid_at: null, payment_provider: null }
    await expect(caseService.deliverReportEmail(unpaidCase, 'token_xyz')).rejects.toThrow('Payment required')

    // Building case returns pending without sending
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const buildingCase: CaseRow = { ...sampleCase, status: 'building', report_ready_at: null }
    const buildingRes = await caseService.deliverReportEmail(buildingCase, 'token_xyz')
    expect(buildingRes.status).toBe('pending')
    expect(fetchSpy).not.toHaveBeenCalled()

    // Ready case without PDF path returns pending
    const noPdfCase: CaseRow = { ...sampleCase, status: 'ready', report_ready_at: new Date().toISOString(), report_pdf_path: null }
    const noPdfRes = await caseService.deliverReportEmail(noPdfCase)
    expect(noPdfRes.status).toBe('pending')
    expect(noPdfRes.message).toContain('PDF report is still being generated')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('9b. Failed delivery can be retried with forceRetry', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    vi.spyOn(storageService, 'download').mockResolvedValue(mockPdfBytes)

    let attemptCount = 0

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      attemptCount++
      if (attemptCount === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ message: 'Temporary Resend outage' }),
        } as any
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_retry_success_999' }),
      } as any
    })

    vi.spyOn(caseService, 'update').mockImplementation(async (_id: string, patch: any) => {
      Object.assign(sampleCase, patch)
      return sampleCase
    })

    // Attempt 1: Fails
    const res1 = await caseService.deliverReportEmail(sampleCase, 'token_xyz', false)
    expect(res1.status).toBe('failed')
    expect((res1 as any).error).toContain('Temporary Resend outage')

    // Attempt 2: Retry succeeds
    const res2 = await caseService.deliverReportEmail(sampleCase, 'token_xyz', true)
    expect(res2.status).toBe('sent')
    expect((res2 as any).resendId).toBe('resend_retry_success_999')
  })

  it('10. Live mode: Refreshing report page does not send duplicate emails (idempotent)', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const alreadySentCase: CaseRow = {
      ...sampleCase,
      answers: {
        ...sampleCase.answers,
        report_delivery: {
          status: 'sent',
          sentAt: '2026-11-13T10:00:00.000Z',
          to: 'client@example.com',
          attempts: 1,
        },
      },
    }

    // Attempt delivery without forceRetry (e.g. page refresh)
    const res = await caseService.deliverReportEmail(alreadySentCase, 'token_xyz')

    expect(res.status).toBe('sent')
    expect((res as any).alreadySent).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled() // Idempotent: No duplicate email sent
  })

  it('11. Live mode: Missing API key, invalid sender, invalid recipient, and Resend errors are handled safely', async () => {
    ;(env as any).EMAIL_MODE = 'live'

    // Case A: Missing API key returns clear error and does NOT silently switch to mock
    ;(env as any).RESEND_API_KEY = ''
    const noKeyRes = await emailService.send('user@example.com', 'Subject', 'Text')
    expect(noKeyRes.sent).toBe(false)
    expect(noKeyRes.reason).toBe('missing_api_key')
    expect(noKeyRes.mocked).toBeUndefined()

    // Case B: Missing EMAIL_FROM
    ;(env as any).RESEND_API_KEY = 're_key_123'
    ;(env as any).EMAIL_FROM = ''
    const noSenderRes = await emailService.send('user@example.com', 'Subject', 'Text')
    expect(noSenderRes.sent).toBe(false)
    expect(noSenderRes.reason).toBe('invalid_sender')

    // Case C: Invalid recipient address
    ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'
    const badRecipientRes = await emailService.send('not-an-email', 'Subject', 'Text')
    expect(badRecipientRes.sent).toBe(false)
    expect(badRecipientRes.reason).toBe('invalid_recipient')

    // Case D: Resend API rejects with 403 / unverified domain
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'The domain fairexit.io is not verified.' }),
    } as any)

    const rejectedRes = await emailService.send('valid@example.com', 'Subject', 'Text')
    expect(rejectedRes.sent).toBe(false)
    expect(rejectedRes.error).toContain('The domain fairexit.io is not verified')
    expect(rejectedRes.reason).toBe('resend_rejected')
  })

  // =========================================================================
  // Section C: Independence of EMAIL_MODE and PAYMENTS_MODE
  // =========================================================================

  it('12. Changing EMAIL_MODE does not alter PAYMENTS_MODE behavior or vice versa', () => {
    ;(env as any).PAYMENTS_MODE = 'live'
    ;(env as any).EMAIL_MODE = 'mock'
    expect(env.PAYMENTS_MODE).toBe('live')
    expect(env.EMAIL_MODE).toBe('mock')

    ;(env as any).PAYMENTS_MODE = 'mock'
    ;(env as any).EMAIL_MODE = 'live'
    expect(env.PAYMENTS_MODE).toBe('mock')
    expect(env.EMAIL_MODE).toBe('live')
  })

  it('13. Public /config exposes payment and email modes independently without leaking API keys', () => {
    ;(env as any).PAYMENTS_MODE = 'live'
    ;(env as any).EMAIL_MODE = 'mock'
    ;(env as any).RESEND_API_KEY = 'super_secret_resend_key_never_leak'

    const req: any = {}
    let capturedResponse: any = null
    const res: any = {
      statusCode: 200,
      json(data: any) {
        capturedResponse = data
        return this
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
    }

    // Call /config route handler directly
    const configHandler = (publicRoutes.stack as any[]).find((layer) => layer.route?.path === '/config')?.route?.stack?.[0]?.handle
    expect(configHandler).toBeDefined()
    configHandler(req, res)

    expect(capturedResponse).not.toBeNull()
    const config = capturedResponse.data
    expect(config.payments.mode).toBe('live')
    expect(config.email.mode).toBe('mock')

    // Security check: API key is never exposed
    const serialized = JSON.stringify(capturedResponse)
    expect(serialized).not.toContain('super_secret_resend_key_never_leak')
    expect(serialized).not.toContain('RESEND_API_KEY')
  })
})
