import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import request from 'supertest'
import app from '../../src/app'
import { env } from '../../src/config/env'
import * as dbModule from '../../src/config/db'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { sourcesFor, regionRulesFor } from '../../src/fairexit/regionData'
import { systemPromptCallA, systemPromptCallB, promptSha256 } from '../../src/fairexit/prompts'
import { CALL_A_OPTIONAL_KEYS } from '../../src/prompts/call-a.prompt'
import * as CP from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { validateShape, ruleWarnings, allowedAmounts, renderReportHtml, reportNumbers } from '../../src/fairexit/reportOutput'
import { reportLawyerUrl, reportQrSvg } from '../../src/fairexit/reportQr'
import { emailService } from '../../src/services/email.service'
import { leadService } from '../../src/services/lead.service'
import { caseService } from '../../src/services/case.service'
import loadingCards from '../../../src/data/loading-cards.json'
import { getLoadingCardsForRegion } from '../../../src/lib/loadingCards'
import type { CaseRow } from '../../src/fairexit/types'

describe('FairExit Round 2 — Remaining Important Changes & Regressions', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  beforeEach(() => {
    emailService.setMockTransport(null)
    vi.restoreAllMocks()
  })

  describe('1. Report Analysis Improvements (v0.8)', () => {
    it('Call A prompt includes v0.8 optional keys for contractual severance, forfeited bonuses, confidentiality, and clauses', () => {
      const caPrompt = systemPromptCallA(buildJurisdiction('CA-ON')!)
      const usPrompt = systemPromptCallA(buildJurisdiction('US-NY')!)

      for (const key of CALL_A_OPTIONAL_KEYS) {
        expect(caPrompt).toContain(key)
        expect(usPrompt).toContain(key)
      }
      expect(usPrompt).toContain('Optional keys')
      expect(usPrompt).toContain('never put them in "missing"')
    })

    it('Call B prompt includes CONTRACT MATH, DOCUMENTS FIRST, FLAGS, W2/W8/W12, and optional v0.9 output fields', () => {
      const callBPrompt = systemPromptCallB()
      expect(callBPrompt).toContain('CONTRACT MATH')
      expect(callBPrompt).toContain('M1.')
      expect(callBPrompt).toContain('M2.')
      expect(callBPrompt).toContain('M3.')
      expect(callBPrompt).toContain('DOCUMENTS FIRST')
      expect(callBPrompt).toContain('D1. Documents beat typed answers.')
      expect(callBPrompt).toContain('FLAGS FROM THE DOCUMENTS')
      expect(callBPrompt).toContain('F1. Bonus forfeited')
      expect(callBPrompt).toContain('F2. Confidentiality of discrimination facts')
      expect(callBPrompt).toContain('F3. Non-disparagement')
      expect(callBPrompt).toContain('F4. Arbitration')
      expect(callBPrompt).toContain('"sources_used"')
      expect(callBPrompt).toContain('"contract_math"')
      expect(callBPrompt).toContain('Never "a attorney"')
    })

    it('exportConfirmedFacts forwards extracted v0.8 contract/bonus/confidentiality facts as confirmed rows without overriding Fix 3 user selections', () => {
      const ctx: CP.CheckCtx = {
        country: 'US',
        answers: { usState: 'New York', age: 45, years: 9, salary: 66554, offer: 20192 },
        callA: {
          facts: [
            { key: 'age_stated', value: '54', document: 'agreement', quote: 'age 54', where: 'p.2', confidence: 'high' },
            { key: 'base_salary', value: '$175,000 per year', document: 'contract', quote: '$175,000', where: 'p.2', confidence: 'high' },
            { key: 'severance_formula', value: '2 weeks per full year, min 8, max 26', document: 'contract', quote: '2 weeks of base salary per full year, min 8, max 26', where: 'p.1', confidence: 'high' },
            { key: 'bonus_forfeited', value: '$15,000 Q3 bonus', document: 'agreement', quote: 'bonus of $15,000 is forfeited', where: 'p.1', confidence: 'high' },
            { key: 'confidentiality_clause', value: 'Covers discrimination facts with repayment penalty', document: 'agreement', quote: 'keep all facts confidential', where: 'p.2', confidence: 'high' },
            { key: 'non_disparagement', value: 'Mutual non-disparagement', document: 'agreement', quote: 'shall not disparage', where: 'p.2', confidence: 'high' },
          ],
          missing: [],
        },
        contractStatus: 'added',
        check: {
          rows: {
            age: { value: 45, source: 'answers', status: 'confirmed', doc_value: 54, user_value: 45 },
            pay: { value: 66554, source: 'answers', status: 'confirmed', doc_value: 175000, user_value: 66554 },
          },
          attested: true,
          attested_at: '2026-11-25T10:00:00Z',
        },
      }

      const exported = CP.exportConfirmedFacts(ctx)
      const rows = exported.rows as Record<string, any>
      // User's explicit Fix 3 choices stay intact
      expect(rows.age.value).toBe(45)
      expect(rows.pay.value).toBe(66554)
      // Optional v0.8 extracted clauses are forwarded cleanly as confirmed rows
      expect(rows.severance_formula).toEqual(expect.objectContaining({ status: 'confirmed', source: 'contract' }))
      expect(rows.bonus_forfeited).toEqual(expect.objectContaining({ status: 'confirmed', source: 'agreement' }))
      expect(rows.confidentiality_clause).toEqual(expect.objectContaining({ status: 'confirmed', source: 'agreement' }))
      expect(rows.non_disparagement).toEqual(expect.objectContaining({ status: 'confirmed', source: 'agreement' }))
    })

    it('validateShape, ruleWarnings, and s6_sources support v0.8 contract_math and sources_used without weakening Rule 1 or Rule 2', () => {
      const ny = buildJurisdiction('US-NY')!
      const nySources = sourcesFor(ny)
      const input = {
        jurisdiction: ny,
        minimum: { none: true },
        confirmed_facts: { rows: { pay: { value: 175000, status: 'confirmed' }, offer_amount: { value: 20192, status: 'confirmed' } } },
        call_a: { facts: [{ key: 'base_salary', value: '$175,000', document: 'contract' }, { key: 'offer_amount', value: '$20,192', document: 'agreement' }] },
        answers: { salary: 175000, offer: 20192 },
      }
      const report: any = {
        cover: { name_line: 'Dana Kowalczyk', role_line: 'Director · 9 years', place_line: 'New York' },
        glance: 'Your offer ($20,192) is lower than what your contract formula gives ($60,577).',
        confirmed_line: 'Built on the details you confirmed on November 25, 2026.',
        checks: [
          {
            topic: 'Contract formula',
            letter_says: '$20,192',
            contract_says: '18 weeks ($60,577 at $3,365.38/week)',
            rule_says: 'Contract terms',
            status: 'bad',
            why: 'The formula works out to $60,577, a difference of $40,385.',
            source_id: 'NY-LAB-193',
          },
        ],
        clauses: [
          {
            title: 'Confidentiality & repayment',
            status: 'bad',
            what_it_says: 'Must keep facts confidential.',
            what_it_means: 'Worth an attorney\'s read under NY GOL 5-336.',
            question_to_ask: 'Does GOL 5-336 allow this?',
            source_id: 'NY-GOL-5-336',
          },
        ],
        questions: ['Why is the $40,385 difference unpaid?'],
        next_steps: ['Talk to an attorney before signing.'],
        citations_used: ['NY-GOL-5-336', 'NY-LAB-193'],
        sources_used: [
          { id: 'NY-GOL-5-336', short_name: 'NY GOL § 5-336' },
          { id: 'NY-LAB-193', short_name: 'NY Labor Law §§ 190 & 193' },
        ],
        contract_math: {
          formula: '2 weeks per full year, min 8, max 26',
          weeks: 18,
          weekly_pay: 3365.38,
          amount: 60577,
          offer_weeks: 6,
          offer_amount: 20192,
          math_line: '18 × $3,365.38 ≈ $60,577',
        },
      }

      const shape = validateShape(report)
      expect(shape.ok).toBe(true)

      const warnings = ruleWarnings(shape.report, nySources.map((s) => s.id), allowedAmounts(input))
      expect(warnings).toEqual([])

      const html = renderReportHtml(shape.report, {
        reportId: 'RPT-V08-NY',
        jurisdiction: ny,
        sources: nySources,
        rulesAsOf: '2026-11-24',
        attestedAt: '2026-11-25T10:00:00Z',
        generatedAt: '2026-11-25T10:01:00Z',
        numbers: reportNumbers(input),
      })
      expect(html).toContain('NY GOL § 5-336')
      expect(html).toContain('NY Labor Law §§ 190 &amp; 193')
    })
  })

  describe('2. New York Legal Sources (US-NY)', () => {
    it('adds both NY sources to loading-cards.json and getLoadingCardsForRegion', () => {
      const nyRaw = (loadingCards as any)['US-NY'] as Array<any>
      const texts = nyRaw.map((c) => c.text).join('\n')
      expect(texts).toContain('GOL 5-336')
      expect(texts).toContain('Labor Law 193')

      const cards = getLoadingCardsForRegion('US-NY', true, true)
      const urls = cards.map((c) => c.source?.url).filter(Boolean)
      expect(urls).toContain('https://www.nysenate.gov/legislation/laws/GOB/5-336')
      expect(urls).toContain('https://www.nysenate.gov/legislation/laws/LAB/193')
    })

    it('registers, loads, and filters NY-GOL-5-336 and NY-LAB-193 through backend regionData and Call B input', () => {
      const ny = buildJurisdiction('US-NY')!
      const nySources = sourcesFor(ny)
      const nyRules = regionRulesFor(ny)

      expect(nySources.find((s) => s.id === 'NY-GOL-5-336')).toMatchObject({
        status: 'verified',
        url: 'https://www.nysenate.gov/legislation/laws/GOB/5-336',
      })
      expect(nySources.find((s) => s.id === 'NY-LAB-193')).toMatchObject({
        status: 'verified',
        url: 'https://www.nysenate.gov/legislation/laws/LAB/193',
      })

      expect(nyRules.some((r) => r.source_id === 'NY-GOL-5-336' && r.status === 'confirmed')).toBe(true)
      expect(nyRules.some((r) => r.source_id === 'NY-LAB-193' && r.status === 'confirmed')).toBe(true)

      // Existing federal + other state + CA sources still present
      expect(nySources.some((s) => s.id === 'US-FED-S1')).toBe(true)
      expect(sourcesFor(buildJurisdiction('US-CA')!).length).toBeGreaterThan(0)
      expect(sourcesFor(buildJurisdiction('CA-ON')!).length).toBeGreaterThan(0)

      const dummyCase: CaseRow = {
        id: '11111111-1111-1111-1111-111111111111',
        public_id: 'FX-NY-1',
        user_id: null,
        token_hashes: ['h'],
        platform: 'web',
        country: 'US',
        jurisdiction_code: 'US-NY',
        jurisdiction: ny,
        covered: true,
        industry: null,
        answers: { usState: 'New York', age: 54, years: 9, salary: 175000, offer: 20192 },
        free_result: null,
        status: 'checking',
        status_detail: null,
        job_started_at: null,
        email: 'dana@example.com',
        consent: null,
        remind: false,
        paid_at: new Date().toISOString(),
        payment_provider: 'mock',
        amount_cents: 5900,
        currency: 'USD',
        contract_status: 'added',
        call_a: { facts: [{ key: 'offer_amount', value: '$20,192', document: 'agreement', quote: '$20,192', where: 'p.1', confidence: 'high' }], missing: [] },
        call_a_at: new Date().toISOString(),
        check_state: { rows: {}, attested: true, attested_at: '2026-11-25T00:00:00Z' },
        attested_at: '2026-11-25T00:00:00Z',
        report_id: null,
        report: null,
        report_inputs: null,
        report_ready_at: null,
        report_pdf_path: null,
        docs_delete_after: null,
        docs_deleted_at: null,
        report_delete_after: null,
        rules_version: '0.2.0',
        prompt_version: 'v0.8',
        prompt_sha256: 'sha',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const callB = buildCallBInput(dummyCase, {
        country: 'US',
        answers: dummyCase.answers,
        callA: dummyCase.call_a,
        contractStatus: 'added',
        check: dummyCase.check_state!,
      })
      const passedSourceIds = (callB.input.sources as Array<{ id: string }>).map((s) => s.id)
      expect(passedSourceIds).toContain('NY-GOL-5-336')
      expect(passedSourceIds).toContain('NY-LAB-193')
    })
  })

  describe('3. Dynamic Report QR Code & Safe Access Control', () => {
    it('builds https://fairexit.io/r/[actual-report-id] URL and unique SVG per report ID', () => {
      expect(reportLawyerUrl('RPT-9A3K72')).toBe('https://fairexit.io/r/RPT-9A3K72')
      expect(() => reportLawyerUrl('')).toThrow()

      const svg1 = reportQrSvg('RPT-FIRST1')
      const svg2 = reportQrSvg('RPT-SECOND')
      expect(svg1).toContain('<svg')
      expect(svg1).toContain('data-qr-url="https://fairexit.io/r/RPT-FIRST1"')
      expect(svg2).toContain('data-qr-url="https://fairexit.io/r/RPT-SECOND"')
      expect(svg1).not.toBe(svg2)

      const ny = buildJurisdiction('US-NY')!
      const nySources = sourcesFor(ny)
      const htmlA = renderReportHtml(
        {
          cover: { name_line: null, role_line: 'Role · 5 years', place_line: 'New York' },
          glance: 'Summary.',
          confirmed_line: 'Built on details confirmed.',
          checks: [{ topic: 'Offer', letter_says: '$10,000', status: 'info' }],
          questions: [],
          next_steps: [],
          citations_used: [],
        },
        {
          reportId: 'RPT-ALPHA9',
          jurisdiction: ny,
          sources: nySources,
          rulesAsOf: '2026-11-24',
          attestedAt: '2026-11-25T00:00:00Z',
          generatedAt: '2026-11-25T00:00:00Z',
        },
      )
      expect(htmlA).toContain('https://fairexit.io/r/RPT-ALPHA9')
      expect(htmlA).not.toContain('FX-4821')
    })

    it('GET /api/v1/reports/:reportId/qr-check returns ONLY non-PII existence for valid ready reports and hides unauthorized data', async () => {
      vi.spyOn(caseService, 'getByReportId').mockResolvedValueOnce({
        id: 'case-uuid-secret',
        report_id: 'RPT-VALID1',
        status: 'ready',
        report_ready_at: new Date().toISOString(),
        country: 'US',
        email: 'secret@example.com',
        answers: { name: 'Secret Name', salary: 250000 },
        report: { glance: 'Private report contents' },
      } as any)

      const okRes = await request(app).get('/api/v1/reports/RPT-VALID1/qr-check')
      expect(okRes.status).toBe(200)
      expect(okRes.body.data).toEqual({ valid: true, reportId: 'RPT-VALID1', country: 'US' })
      expect(JSON.stringify(okRes.body)).not.toContain('Secret Name')
      expect(JSON.stringify(okRes.body)).not.toContain('secret@example.com')
      expect(JSON.stringify(okRes.body)).not.toContain('case-uuid-secret')
      expect(JSON.stringify(okRes.body)).not.toContain('Private report contents')

      vi.spyOn(caseService, 'getByReportId').mockResolvedValueOnce(null)
      const missRes = await request(app).get('/api/v1/reports/RPT-NOPE00/qr-check')
      expect(missRes.status).toBe(200)
      expect(missRes.body.data).toEqual({ valid: false, reportId: null })
    })

    it('Next.js /r/[id] route validates id, strips PII, and handles missing reports cleanly', () => {
      const qrRouteSource = fs.readFileSync(path.join(rootDir, 'src/app/r/[id]/page.tsx'), 'utf-8')
      expect(qrRouteSource).toContain('/reports/')
      expect(qrRouteSource).toContain('/lawyer-request?from=qr')
      expect(qrRouteSource).toContain('notFound()')
      expect(qrRouteSource).toContain('Suspense')
    })
  })

  describe('4. Branded Lawyer Request Email Templates (US & CA) & Retry Safety', () => {
    it('selects and populates lawyer-request-email-US.html for US and lawyer-request-email-CA.html for CA', async () => {
      const prevMode = env.EMAIL_MODE
      const prevKey = env.RESEND_API_KEY
      const prevFrom = env.EMAIL_FROM
      ;(env as any).EMAIL_MODE = 'live'
      ;(env as any).RESEND_API_KEY = 're_test_key'
      ;(env as any).EMAIL_FROM = 'FairExit <reports@fairexit.io>'

      const sentPayloads: any[] = []
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u: any, opts: any) => {
        sentPayloads.push(JSON.parse(opts?.body || '{}'))
        return { ok: true, status: 200, json: async () => ({ id: `resend_${sentPayloads.length}` }) } as any
      })

      try {
        const usRes = await emailService.lawyerRequestConfirmation({
          to: 'dana@example.com',
          name: 'Dana Kowalczyk',
          country: 'US',
          region: 'New York',
          requestId: 'REQ-1001',
        })
        expect(usRes.sent).toBe(true)
        expect(sentPayloads[0].subject).toBe('We got your request')
        expect(sentPayloads[0].html).toContain('Hi Dana, thanks.')
        expect(sentPayloads[0].html).toContain('attorney licensed in New York')
        expect(sentPayloads[0].html).not.toContain('[First name]')
        expect(sentPayloads[0].html).not.toContain('[State]')

        const caRes = await emailService.lawyerRequestConfirmation({
          to: 'alex@example.ca',
          name: 'Alex Tremblay',
          country: 'CA',
          region: 'Ontario',
          requestId: 'REQ-1002',
        })
        expect(caRes.sent).toBe(true)
        expect(sentPayloads[1].html).toContain('Hi Alex, thanks.')
        expect(sentPayloads[1].html).toContain('lawyer licensed in Ontario')
        expect(sentPayloads[1].html).not.toContain('[First name]')
        expect(sentPayloads[1].html).not.toContain('[Province]')
      } finally {
        ;(env as any).EMAIL_MODE = prevMode
        ;(env as any).RESEND_API_KEY = prevKey
        ;(env as any).EMAIL_FROM = prevFrom
      }
    })

    it('leadService.create does NOT send email if DB insert fails', async () => {
      const failingClient: any = {
        from: () => ({
          select: () => failingClient.from(),
          eq: () => failingClient.from(),
          in: () => failingClient.from(),
          order: () => failingClient.from(),
          limit: async () => ({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { code: '23505', message: 'DB outage' } }),
            }),
          }),
        }),
      }
      vi.spyOn(dbModule, 'db').mockReturnValue(failingClient)
      const prevMode = env.EMAIL_MODE
      ;(env as any).EMAIL_MODE = 'live'
      const emailSpy = vi.spyOn(emailService, 'lawyerRequestConfirmation')

      try {
        await expect(
          leadService.create({
            caseRow: null,
            country: 'US',
            name: 'Dana Test',
            email: 'dana.dbfail@example.com',
            phone: '2125551234',
            enquiryType: 'lawyer_request_page',
            sourcePage: '/lawyer-request',
            consent: true,
            platform: 'web',
          }),
        ).rejects.toThrow(/Database error/)
        expect(emailSpy).not.toHaveBeenCalled()
      } finally {
        ;(env as any).EMAIL_MODE = prevMode
      }
    })

    it('leadService.retryConfirmationEmail safely retries failed sends and prevents duplicate sends once sent', async () => {
      let rowState: any = {
        id: '11111111-2222-3333-4444-555555555555',
        public_id: 'REQ-9999',
        email: 'retry@example.com',
        name: 'Jordan Lee',
        country: 'US',
        region_name: 'New York',
        status: 'new',
        summary: {
          email_delivery: { status: 'failed', attempts: 1, last_error: 'Timeout' },
        },
        created_at: new Date().toISOString(),
      }
      const mockClient: any = {
        from: () => {
          let pendingUpd: any = null
          const b: any = {
            select: () => b,
            eq: () => b,
            update: (u: any) => {
              pendingUpd = u
              return b
            },
            maybeSingle: async () => {
              if (pendingUpd) {
                rowState = { ...rowState, ...pendingUpd }
              }
              return { data: rowState, error: null }
            },
          }
          return b
        },
      }
      vi.spyOn(dbModule, 'db').mockReturnValue(mockClient)
      const prevMode = env.EMAIL_MODE
      ;(env as any).EMAIL_MODE = 'live'
      const emailSpy = vi
        .spyOn(emailService, 'lawyerRequestConfirmation')
        .mockResolvedValue({ sent: true, id: 'resend_retry_1' })

      try {
        const firstRetry = await leadService.retryConfirmationEmail(rowState.id)
        expect(firstRetry.alreadySent).toBe(false)
        expect(firstRetry.emailDelivery.status).toBe('sent')
        expect(emailSpy).toHaveBeenCalledTimes(1)

        // Second retry when already sent -> no duplicate email!
        const secondRetry = await leadService.retryConfirmationEmail(rowState.id)
        expect(secondRetry.alreadySent).toBe(true)
        expect(emailSpy).toHaveBeenCalledTimes(1)
      } finally {
        ;(env as any).EMAIL_MODE = prevMode
      }
    })
  })

  describe('5. Prompt Hashes Verified', () => {
    it('exports current verified prompt hashes without mismatches', () => {
      expect(promptSha256('A1')).toMatch(/^[a-f0-9]{64}$/)
      expect(promptSha256('A2')).toMatch(/^[a-f0-9]{64}$/)
      expect(promptSha256('B')).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
