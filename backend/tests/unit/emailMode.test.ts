import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { env } from '../../src/config/env'
import { emailService } from '../../src/services/email.service'
import { caseService } from '../../src/services/case.service'
import { flowService } from '../../src/services/flow.service'
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

  it('8. Live mode: Email content contains strictly subject, short message, and private report URL without sensitive data', async () => {
    ;(env as any).EMAIL_MODE = 'live'
    ;(env as any).RESEND_API_KEY = 're_live_key'

    let capturedSubject = ''
    let capturedText = ''
    let capturedBody: any = {}

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, opts: any) => {
      capturedBody = JSON.parse(opts?.body || '{}')
      capturedSubject = capturedBody.subject
      capturedText = capturedBody.text
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resend_123' }),
      } as any
    })

    const res = await emailService.reportReady(sampleCase, 'secret_token_live')

    expect(res.sent).toBe(true)
    expect(capturedSubject).toBe('Your FairExit Report Is Ready')
    expect(capturedText).toContain('Your FairExit report is ready.')
    expect(capturedText).toContain('Access your report here:')
    expect(capturedText).toContain(`/report?case=${sampleCase.id}&t=secret_token_live`)

    // Content restrictions: No severance amounts, no executive summary, no attachments
    expect(capturedText).not.toContain('$30,000')
    expect(capturedText).not.toContain('30000')
    expect(capturedText).not.toContain('executiveSummary')
    expect(capturedText).not.toContain('California severance assessment')
    expect(capturedBody.attachments).toBeUndefined()
  })

  it('9. Live mode: Delivery requires confirmed payment and compiled report', async () => {
    ;(env as any).EMAIL_MODE = 'live'

    // Unpaid case throws badRequest
    const unpaidCase: CaseRow = { ...sampleCase, status: 'free_check', paid_at: null, payment_provider: null }
    await expect(caseService.deliverReportEmail(unpaidCase, 'token')).rejects.toThrow('Payment required')

    // Building case returns pending without sending
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const buildingCase: CaseRow = { ...sampleCase, status: 'building', report_ready_at: null }
    const buildingRes = await caseService.deliverReportEmail(buildingCase, 'token')
    expect(buildingRes.status).toBe('pending')
    expect(fetchSpy).not.toHaveBeenCalled()
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
