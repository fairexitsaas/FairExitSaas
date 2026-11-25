import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { emailService } from '../../src/services/email.service'
import { leadService } from '../../src/services/lead.service'
import * as dbModule from '../../src/config/db'
import { caseService, hashToken } from '../../src/services/case.service'
import { caseAccess } from '../../src/middleware/caseAccess'
import { caseController } from '../../src/controllers/case.controller'
import { env } from '../../src/config/env'
import { logger } from '../../src/utils/logger'
import type { CaseRow } from '../../src/fairexit/types'

describe('FairExit: Report Email Redesign, Lawyer Request & UI Corrections', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const readSource = (relPath: string) => fs.readFileSync(path.join(rootDir, relPath), 'utf-8')

  const dummyPdfBytes = Buffer.from(
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n170\n%%EOF'
  )

  const sampleCanadaCase: CaseRow = {
    id: '11111111-1111-1111-1111-111111111111',
    public_id: 'FX-CA-001',
    user_id: null,
    token_hashes: ['hash_ca'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON' } as any,
    covered: true,
    industry: null,
    answers: { name: 'Alex Tremblay', province: 'ON', years: 5, salary: 90000 },
    free_result: null,
    status: 'ready',
    status_detail: null,
    job_started_at: null,
    email: 'alex.tremblay@example.ca',
    consent: null,
    remind: false,
    paid_at: new Date().toISOString(),
    payment_provider: 'stripe',
    amount_cents: 5900,
    currency: 'CAD',
    contract_status: 'never',
    call_a: null,
    call_a_at: null,
    check_state: null,
    attested_at: null,
    report_id: 'RPT-CA-001',
    report: { headline: 'Confidential Report' },
    report_inputs: null,
    report_ready_at: new Date().toISOString(),
    report_pdf_path: 'reports/11111111-1111-1111-1111-111111111111/report.pdf',
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.7',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const sampleUSCase: CaseRow = {
    ...sampleCanadaCase,
    id: '22222222-2222-2222-2222-222222222222',
    public_id: 'FX-US-002',
    country: 'US',
    jurisdiction_code: 'US-NY',
    jurisdiction: { name: 'New York', code: 'US-NY' } as any,
    answers: { name: 'Morgan Taylor', state: 'NY', years: 7, salary: 140000 },
    email: 'morgan.taylor@example.com',
    currency: 'USD',
    report_id: 'RPT-US-002',
  }

  beforeEach(() => {
    emailService.setMockTransport(null)
    vi.restoreAllMocks()
  })

  describe('1. Dedicated Lawyer CTA Token Lifecycle & Security', () => {
    it('creates a dedicated, short-lived lawyer token and stores only its SHA-256 hash', async () => {
      const mockUpdate = vi.spyOn(caseService, 'update').mockResolvedValue(sampleCanadaCase)
      vi.spyOn(caseService, 'get').mockResolvedValue(sampleCanadaCase)

      const lawyerToken = await caseService.createLawyerToken(sampleCanadaCase, 168)

      // Dedicated token starts with fxl_ prefix
      expect(lawyerToken).toMatch(/^fxl_/)

      // Plain token is NEVER stored; only its SHA-256 hash is persisted
      expect(mockUpdate).toHaveBeenCalled()
      const updatePayload = mockUpdate.mock.calls[0][1] as any
      const storedTokens = updatePayload.answers?.lawyer_tokens
      expect(storedTokens).toBeDefined()
      expect(storedTokens.length).toBeGreaterThan(0)

      const storedEntry = storedTokens[storedTokens.length - 1]
      expect(storedEntry.hash).toBe(hashToken(lawyerToken))
      expect(storedEntry.hash).not.toBe(lawyerToken)
      expect(new Date(storedEntry.expires_at).getTime()).toBeGreaterThan(Date.now())
    })

    it('hasLawyerToken verifies valid tokens and strictly rejects expired or fake tokens', () => {
      const validToken = 'fxl_valid_token_test_123'
      const expiredToken = 'fxl_expired_token_test_456'
      const fakeToken = 'fxl_fake_random_token_789'
      const generalReportToken = 'fxc_general_report_token'

      const caseWithTokens: CaseRow = {
        ...sampleCanadaCase,
        answers: {
          ...sampleCanadaCase.answers,
          lawyer_tokens: [
            {
              hash: hashToken(validToken),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
            },
            {
              hash: hashToken(expiredToken),
              expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
              created_at: new Date(Date.now() - 10000).toISOString(),
            },
          ],
        },
      }

      // Valid token accepted
      expect(caseService.hasLawyerToken(caseWithTokens, validToken)).toBe(true)

      // Expired token rejected
      expect(caseService.hasLawyerToken(caseWithTokens, expiredToken)).toBe(false)

      // Unknown token rejected
      expect(caseService.hasLawyerToken(caseWithTokens, fakeToken)).toBe(false)

      // General case token without fxl_ prefix rejected by hasLawyerToken
      expect(caseService.hasLawyerToken(caseWithTokens, generalReportToken)).toBe(false)

      // Dedicated lawyer token is NOT in token_hashes so hasToken returns false
      expect(caseService.hasToken(caseWithTokens, validToken)).toBe(false)
    })

    it('caseAccess strictly restricts lawyer_token to GET / and rejects report/pdf access with 404', async () => {
      const validLawyerToken = 'fxl_auth_token_999'
      const caseWithLawyerToken: CaseRow = {
        ...sampleCanadaCase,
        answers: {
          ...sampleCanadaCase.answers,
          lawyer_tokens: [
            {
              hash: hashToken(validLawyerToken),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
        },
      }
      vi.spyOn(caseService, 'get').mockResolvedValue(caseWithLawyerToken)

      // 1. Root GET / (allowed for lawyer request context retrieval)
      const allowedReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'GET',
        path: '/',
      }
      const mockNext = vi.fn()
      await caseAccess(allowedReq, {} as any, mockNext)
      expect(allowedReq.caseAccessVia).toBe('lawyer_token')
      expect(mockNext).toHaveBeenCalled()

      // 2. Report PDF route /report/pdf (MUST BE REJECTED with 404)
      const pdfReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'GET',
        path: '/report/pdf',
      }
      let pdfError: any = null
      await caseAccess(pdfReq, {} as any, (err?: any) => { pdfError = err })
      expect(pdfError).toBeDefined()
      expect(pdfError.statusCode).toBe(404)
      expect(pdfError.message).toBe('Case not found')

      // 3. Report JSON route /report (MUST BE REJECTED with 404)
      const reportReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'GET',
        path: '/report',
      }
      let reportError: any = null
      await caseAccess(reportReq, {} as any, (err?: any) => { reportError = err })
      expect(reportError).toBeDefined()
      expect(reportError.statusCode).toBe(404)

      // 4. Case answers mutation PATCH /answers (MUST BE REJECTED with 404)
      const patchReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'PATCH',
        path: '/answers',
      }
      let patchError: any = null
      await caseAccess(patchReq, {} as any, (err?: any) => { patchError = err })
      expect(patchError).toBeDefined()
      expect(patchError.statusCode).toBe(404)

      // 5. Documents list route /documents (MUST BE REJECTED with 404)
      const docsReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'GET',
        path: '/documents',
      }
      let docsError: any = null
      await caseAccess(docsReq, {} as any, (err?: any) => { docsError = err })
      expect(docsError?.statusCode).toBe(404)

      // 6. Checkout stripe route POST /checkout/stripe (MUST BE REJECTED with 404)
      const stripeReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'POST',
        path: '/checkout/stripe',
      }
      let stripeError: any = null
      await caseAccess(stripeReq, {} as any, (err?: any) => { stripeError = err })
      expect(stripeError?.statusCode).toBe(404)

      // 7. Report build route POST /report (MUST BE REJECTED with 404)
      const buildReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'POST',
        path: '/report',
      }
      let buildError: any = null
      await caseAccess(buildReq, {} as any, (err?: any) => { buildError = err })
      expect(buildError?.statusCode).toBe(404)

      // 8. Delete route DELETE / (MUST BE REJECTED with 404)
      const deleteReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': validLawyerToken },
        method: 'DELETE',
        path: '/',
      }
      let deleteError: any = null
      await caseAccess(deleteReq, {} as any, (err?: any) => { deleteError = err })
      expect(deleteError?.statusCode).toBe(404)

      // 9. Dedicated POST /lawyer-token/exchange route (ALLOWED for lawyer request)
      const exchangeReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        body: { token: validLawyerToken },
        method: 'POST',
        path: '/lawyer-token/exchange',
      }
      const exchangeNext = vi.fn()
      await caseAccess(exchangeReq, {} as any, exchangeNext)
      expect(exchangeReq.caseAccessVia).toBe('lawyer_token')
      expect(exchangeNext).toHaveBeenCalled()

      // 10. Unauthorized request (invalid lawyer token) -> 404
      const invalidReq: any = {
        params: { caseId: caseWithLawyerToken.id },
        headers: { 'x-case-token': 'fxl_invalid_token_xyz' },
        method: 'GET',
        path: '/',
      }
      let invalidError: any = null
      await caseAccess(invalidReq, {} as any, (err?: any) => { invalidError = err })
      expect(invalidError?.statusCode).toBe(404)

      // 11. General report token (fxc_...) retains full access to report and pdf
      const generalReportToken = 'fxc_valid_report_token'
      const caseWithReportToken: CaseRow = {
        ...sampleCanadaCase,
        token_hashes: [hashToken(generalReportToken)],
      }
      vi.spyOn(caseService, 'get').mockResolvedValue(caseWithReportToken)
      const validPdfReq: any = {
        params: { caseId: caseWithReportToken.id },
        headers: { 'x-case-token': generalReportToken },
        method: 'GET',
        path: '/report/pdf',
      }
      const pdfNext = vi.fn()
      await caseAccess(validPdfReq, {} as any, pdfNext)
      expect(validPdfReq.caseAccessVia).toBe('token')
      expect(pdfNext).toHaveBeenCalled()
    })

    it('caseController.exchangeLawyerToken returns minimal context via POST exchange', async () => {
      const req: any = {
        caseRow: sampleCanadaCase,
        caseAccessVia: 'lawyer_token',
      }
      let sentJson: any = null
      const res: any = {
        status: () => res,
        json: (data: any) => {
          sentJson = data
          return res
        },
      }

      await caseController.exchangeLawyerToken(req, res)

      expect(sentJson.success).toBe(true)
      expect(sentJson.data.id).toBe(sampleCanadaCase.id)
      expect(sentJson.data.email).toBe(sampleCanadaCase.email)
      expect(sentJson.data.jurisdictionCode).toBe('CA-ON')
      expect(sentJson.data.answers.salary).toBe(90000)

      // Confidential report and document details are omitted
      expect(sentJson.data.report).toBeUndefined()
      expect(sentJson.data.documents).toBeUndefined()
    })

    it('caseController.get returns minimal context when accessed via lawyer_token', async () => {
      const req: any = {
        caseRow: sampleCanadaCase,
        caseAccessVia: 'lawyer_token',
      }
      let sentJson: any = null
      const res: any = {
        status: () => res,
        json: (data: any) => {
          sentJson = data
          return res
        },
      }

      await caseController.get(req, res)

      expect(sentJson.success).toBe(true)
      // Minimal context returned
      expect(sentJson.data.id).toBe(sampleCanadaCase.id)
      expect(sentJson.data.email).toBe(sampleCanadaCase.email)
      expect(sentJson.data.answers.salary).toBe(90000)

      // Confidential report and document details are omitted
      expect(sentJson.data.report).toBeUndefined()
      expect(sentJson.data.documents).toBeUndefined()
    })
  })

  describe('2. Country-specific report-ready email redesign & PDF attachment', () => {
    it('uses report-email-CA template for Canada with dynamic first name and dedicated lawyer token in CTA', async () => {
      ;(env as any).EMAIL_MODE = 'live'
      ;(env as any).RESEND_API_KEY = 're_test_key_live'
      ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'

      let capturedPayload: any = null
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, opts: any) => {
        capturedPayload = JSON.parse(opts?.body || '{}')
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_email_ca_1' }),
        } as any
      })

      const rawReportToken = 'fxc_report_token_123'
      const rawLawyerToken = 'fxl_lawyer_dedicated_token_456'
      const res = await emailService.reportReady(sampleCanadaCase, rawReportToken, dummyPdfBytes, rawLawyerToken)

      expect(res.sent).toBe(true)
      expect(capturedPayload.to).toEqual(['alex.tremblay@example.ca'])
      expect(capturedPayload.subject).toBe('Your FairExit Severance Report is ready')

      // HTML template verification (Canada: "lawyer")
      expect(capturedPayload.html).toContain('Hi Alex,')
      expect(capturedPayload.html).toContain('See if a lawyer can help (free)')
      expect(capturedPayload.html).toContain('only a licensed lawyer can tell you what applies to you')

      // CTA link uses URL fragment (#t=...) to prevent URL token leakage to server logs/CDNs
      const expectedCta = `http://localhost:3000/lawyer-request?case=${sampleCanadaCase.id}#t=${encodeURIComponent(rawLawyerToken)}`
      expect(capturedPayload.html).toContain(expectedCta)
      expect(capturedPayload.html).not.toContain(rawReportToken)

      // Country-appropriate attachment filename
      expect(capturedPayload.attachments[0].filename).toBe('FairExit-Severance-Report-CA.pdf')
      expect(capturedPayload.attachments[0].content).toBe(dummyPdfBytes.toString('base64'))
    })

    it('uses report-email-US template for US with dynamic first name and attorney CTA', async () => {
      ;(env as any).EMAIL_MODE = 'live'
      ;(env as any).RESEND_API_KEY = 're_test_key_live'
      ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'

      let capturedPayload: any = null
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, opts: any) => {
        capturedPayload = JSON.parse(opts?.body || '{}')
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_email_us_2' }),
        } as any
      })

      const lawyerToken = 'fxl_lawyer_token_us'
      const res = await emailService.reportReady(sampleUSCase, lawyerToken, dummyPdfBytes)

      expect(res.sent).toBe(true)
      expect(capturedPayload.to).toEqual(['morgan.taylor@example.com'])

      // HTML template verification (US: "attorney")
      expect(capturedPayload.html).toContain('Hi Morgan,')
      expect(capturedPayload.html).toContain('See if an attorney can help (free)')

      const expectedCta = `http://localhost:3000/lawyer-request?case=${sampleUSCase.id}#t=${encodeURIComponent(lawyerToken)}`
      expect(capturedPayload.html).toContain(expectedCta)

      expect(capturedPayload.attachments[0].filename).toBe('FairExit-Severance-Report-US.pdf')
    })
  })

  describe('3. Lawyer Request Page — DB Persistence, Branded Emails & Deduplication', () => {
    function createInMemoryLeadsDb(initialRows: any[] = []) {
      const store: any[] = [...initialRows]
      let seq = 1
      const fromMock = (table: string) => {
        if (table !== 'leads') throw new Error(`Unexpected table: ${table}`)
        const filters: Array<(r: any) => boolean> = []
        let limitN = Infinity
        let updatePayload: any = null
        let insertPayload: any = null

        const builder: any = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters.push((r) => r[col] === val)
            return builder
          },
          in: (col: string, vals: unknown[]) => {
            filters.push((r) => vals.includes(r[col]))
            return builder
          },
          order: () => builder,
          limit: (n: number) => {
            limitN = n
            return builder
          },
          insert: (row: any) => {
            insertPayload = row
            return builder
          },
          update: (upd: any) => {
            updatePayload = upd
            return builder
          },
          maybeSingle: async () => {
            if (updatePayload) {
              const idx = store.findIndex((r) => filters.every((f) => f(r)))
              if (idx === -1) return { data: null, error: null }
              store[idx] = { ...store[idx], ...updatePayload }
              return { data: store[idx], error: null }
            }
            const match = store.filter((r) => filters.every((f) => f(r)))[0] || null
            return { data: match, error: null }
          },
          single: async () => {
            if (insertPayload) {
              const row = {
                id: `00000000-0000-4000-8000-00000000000${seq}`,
                public_id: `REQ-TEST-${String(seq).padStart(4, '0')}`,
                status: 'new',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...insertPayload,
              }
              seq++
              store.push(row)
              return { data: row, error: null }
            }
            const match = store.filter((r) => filters.every((f) => f(r)))[0] || null
            return { data: match, error: match ? null : { code: 'PGRST116', message: 'Not found' } }
          },
          then: (resolve: (v: any) => void) => {
            const matched = store.filter((r) => filters.every((f) => f(r))).slice(0, limitN)
            resolve({ data: matched, error: null })
          },
        }
        return builder
      }
      return { store, client: { from: fromMock } as any }
    }

    it('persists lawyer request to DB first and sends country-specific branded email (CA)', async () => {
      const { store, client } = createInMemoryLeadsDb()
      vi.spyOn(dbModule, 'db').mockReturnValue(client)
      const prevEmailMode = env.EMAIL_MODE
      ;(env as any).EMAIL_MODE = 'live'
      const orderLog: string[] = []
      const origFrom = client.from
      vi.spyOn(client, 'from').mockImplementation((table: string) => {
        const b = origFrom(table)
        const origInsert = b.insert
        b.insert = (row: any) => {
          orderLog.push('db_insert')
          return origInsert(row)
        }
        return b
      })

      const confirmSpy = vi.spyOn(emailService, 'lawyerRequestConfirmation').mockImplementation(async () => {
        orderLog.push('send_email')
        expect(store.length).toBe(1) // Must already be in DB before email is sent
        return { sent: true, id: 'resend_lr_ca_1' }
      })
      vi.spyOn(emailService, 'opsNewLead').mockResolvedValue({ sent: true, id: 'ops_1' })

      try {
        const result = await leadService.create({
          caseRow: sampleCanadaCase,
          caseId: sampleCanadaCase.id,
          country: 'CA',
          jurisdictionCode: 'CA-ON',
          regionName: 'Ontario',
          name: 'Jordan Miller',
          phone: '4165551234',
          email: 'jordan.miller@test.ca',
          enquiryType: 'lawyer_request_page',
          sourcePage: '/lawyer-request',
          consent: true,
          platform: 'web',
        })

        expect(orderLog).toEqual(['db_insert', 'send_email'])
        expect(result.status).toBe('new')
        expect(result.duplicate).toBe(false)
        expect(result.requestId).toMatch(/^REQ-/)
        expect(result.emailDelivery?.status).toBe('sent')
        expect(store).toHaveLength(1)
        expect(store[0].summary.email_delivery.status).toBe('sent')
        expect(confirmSpy).toHaveBeenCalledWith(expect.objectContaining({
          country: 'CA',
          region: 'Ontario',
          to: 'jordan.miller@test.ca',
        }))
      } finally {
        ;(env as any).EMAIL_MODE = prevEmailMode
      }
    })

    it('creates a new independent DB record and triggers its own confirmation email for every repeat submission, and retains/retries failed records independently', async () => {
      const { store, client } = createInMemoryLeadsDb()
      vi.spyOn(dbModule, 'db').mockReturnValue(client)
      const prevEmailMode = env.EMAIL_MODE
      ;(env as any).EMAIL_MODE = 'live'
      vi.spyOn(emailService, 'opsNewLead').mockResolvedValue({ sent: true, id: 'ops_1' })

      try {
        // Submission 1 fails email delivery -> DB row retained with failed delivery status
        // Submission 2 (same email & case) creates a brand-new DB row and sends its own email
        const confirmSpy = vi.spyOn(emailService, 'lawyerRequestConfirmation')
          .mockResolvedValueOnce({ sent: false, error: 'Resend temporary timeout' })
          .mockResolvedValueOnce({ sent: true, id: 'resend_second_ok' })
          .mockResolvedValueOnce({ sent: true, id: 'resend_retry_first_ok' })

        const submitParams = {
          caseRow: sampleUSCase,
          caseId: sampleUSCase.id,
          country: 'US' as const,
          jurisdictionCode: 'US-NY',
          regionName: 'New York',
          name: 'Alex Johnson',
          phone: '2125559876',
          email: 'alex.dup.test@example.com',
          enquiryType: 'lawyer_request_page',
          sourcePage: '/lawyer-request',
          consent: true,
          platform: 'web' as const,
        }

        const first = await leadService.create(submitParams)
        expect(first.duplicate).toBe(false)
        expect(first.emailDelivery?.status).toBe('failed')
        expect(store).toHaveLength(1)

        // Repeat submission with same email & case MUST create a second independent DB row and trigger a second email
        const second = await leadService.create(submitParams)
        expect(second.duplicate).toBe(false)
        expect(second.requestId).not.toBe(first.requestId)
        expect(second.id).not.toBe(first.id)
        expect(second.emailDelivery?.status).toBe('sent')
        expect(store).toHaveLength(2)
        expect(confirmSpy).toHaveBeenCalledTimes(2)

        // Retrying email for the first failed record updates ONLY that record without creating a 3rd DB row
        const retriedFirst = await leadService.retryConfirmationEmail(first.id)
        expect(retriedFirst.alreadySent).toBe(false)
        expect(retriedFirst.emailDelivery.status).toBe('sent')
        expect(store).toHaveLength(2)
        expect(confirmSpy).toHaveBeenCalledTimes(3)
      } finally {
        ;(env as any).EMAIL_MODE = prevEmailMode
      }
    })

    it('rejects submission if caseId is passed without authorized caseRow', async () => {
      await expect(
        leadService.create({
          caseRow: null, // Unauthorized or invalid token
          caseId: '33333333-3333-3333-3333-333333333333',
          country: 'CA',
          name: 'Hacker Attempt',
          phone: '4165559999',
          email: 'hacker@example.com',
          enquiryType: 'lawyer_request_page',
          sourcePage: '/lawyer-request',
          consent: true,
          platform: 'web',
        })
      ).rejects.toThrow(/unauthorized/i)
    })
  })

  describe('4. Tagline Strip — No clipping, no ellipsis, full text visible', () => {
    it('TaglineStrip does not use text-ellipsis or overflow-hidden on the phrase text', () => {
      const taglineContent = readSource('src/components/landing/TaglineStrip.tsx')

      // Ensure NO text-ellipsis
      expect(taglineContent).not.toContain('text-ellipsis')

      // Ensure NO overflow-hidden on the tagline text span
      expect(taglineContent).not.toMatch(/<span[^>]*overflow-hidden[^>]*>[^<]*Challenge your severance offer\./)

      // Complete wording must be present
      expect(taglineContent).toContain('Know your worth.')
      expect(taglineContent).toContain('Challenge your severance offer.')

      // Exact styles: DM Sans Bold & #0EB28D
      expect(taglineContent).toContain('font-sans')
      expect(taglineContent).toContain('font-bold')
      expect(taglineContent).toContain('#0EB28D')
      expect(taglineContent).toContain('whitespace-nowrap')
    })

    it('TaglineStrip scales responsively from 20px at 320px to 36px on desktop', () => {
      const taglineContent = readSource('src/components/landing/TaglineStrip.tsx')

      // Line 1: 18-20px
      expect(taglineContent).toMatch(/text-\[18px\]/)

      // Line 2: Responsive clamp with 20px min for 320px single line, scaling to 36px desktop
      expect(taglineContent).toContain('clamp(19.5px,6.15vw,36px)')
      expect(taglineContent).toContain('min-[320px]:text-[20px]')
      expect(taglineContent).toContain('min-[390px]:text-[25px]')
      expect(taglineContent).toContain('md:text-[36px]')
    })
  })

  describe('5. Lawyer Request Page — URL Fragment, Token Cleanup & POST Exchange', () => {
    it('reads lawyer token from URL fragment, immediately strips hash and query token, and calls exchangeLawyerToken via POST', () => {
      const pageContent = readSource('src/app/lawyer-request/page.tsx')

      // 1. Reads from URL fragment (hash)
      expect(pageContent).toContain('window.location.hash.replace(/^#/, "")')
      expect(pageContent).toContain('hashParams.get("t")')

      // 2. Removes hash and query param via window.history.replaceState
      expect(pageContent).toContain('currentUrl.hash = ""')
      expect(pageContent).toContain('currentUrl.searchParams.delete("t")')
      expect(pageContent).toContain('window.history.replaceState({}, document.title, cleanUrl)')

      // 3. Exchanges token with backend via POST request
      expect(pageContent).toContain('fairexit.exchangeLawyerToken(activeCaseId, tokenToExchange)')
    })

    it('implements a single-page form with all questions visible together and no three-step navigation', () => {
      const pageContent = readSource('src/app/lawyer-request/page.tsx')

      // 1. No 3-step navigation or next/back buttons
      expect(pageContent).not.toContain('Step 1 of 3')
      expect(pageContent).not.toContain('Step 2 of 3')
      expect(pageContent).not.toContain('Step 3 of 3')
      expect(pageContent).not.toContain('Continue to contact details')
      expect(pageContent).not.toContain('← Back')

      // 2. All 3 fields visible together on the same form
      expect(pageContent).toContain('Full name')
      expect(pageContent).toContain('Phone number')
      expect(pageContent).toContain('Email address')

      // 3. Submit button with loading spinner and duplicate prevention
      expect(pageContent).toContain('Submit request →')
      expect(pageContent).toContain('Submitting request…')
      expect(pageContent).toContain('if (submitting) return')
      expect(pageContent).toContain('disabled={submitting}')

      // 4. Inline success confirmation on the same page
      expect(pageContent).toContain('Thank you — your request has been received.')
      expect(pageContent).toContain('Return to homepage')
    })
  })

  describe('6. Referrer-Policy: no-referrer Verification', () => {
    it('enforces Referrer-Policy: no-referrer on HTTP headers and Next.js layout metadata', () => {
      const layoutContent = readSource('src/app/lawyer-request/layout.tsx')
      const nextConfigContent = readSource('next.config.ts')

      // Next.js metadata in layout.tsx
      expect(layoutContent).toContain("referrer: 'no-referrer'")

      // HTTP response header in next.config.ts for /lawyer-request
      expect(nextConfigContent).toContain("source: '/lawyer-request/:path*'")
      expect(nextConfigContent).toContain("key: 'Referrer-Policy'")
      expect(nextConfigContent).toContain("value: 'no-referrer'")
    })
  })

  describe('7. Logger Redaction — Complete Token Protection', () => {
    it('redacts sensitive token keys and inline token strings from log output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // 1. Redaction of sensitive keys
      logger.info('Test key masking', {
        lawyer_token: 'fxl_secret_lawyer_12345',
        case_token: 'fxc_secret_case_67890',
        t: 'fxl_url_token_param',
        unrelated: 'safe_value',
      })

      expect(consoleSpy).toHaveBeenCalled()
      const loggedJson = JSON.parse(consoleSpy.mock.calls[0][0])
      expect(loggedJson.details.lawyer_token).toBe('***REDACTED***')
      expect(loggedJson.details.case_token).toBe('***REDACTED***')
      expect(loggedJson.details.t).toBe('***REDACTED***')
      expect(loggedJson.details.unrelated).toBe('safe_value')

      // 2. Inline token string masking (defense-in-depth across messages, URLs, errors)
      logger.info('User arrived via http://fairexit.io/lawyer-request#t=fxl_inline_token_987654321')
      const loggedJson2 = JSON.parse(consoleSpy.mock.calls[1][0])
      expect(loggedJson2.message).not.toContain('fxl_inline_token_987654321')
      expect(loggedJson2.message).toContain('***REDACTED***')

      consoleSpy.mockRestore()
    })
  })
})
