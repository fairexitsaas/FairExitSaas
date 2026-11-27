import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as CP from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { renderReportHtml, reportNumbers } from '../../src/fairexit/reportOutput'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { mockCallA, mockCallB } from '../../src/fairexit/mocks'
import { flowService } from '../../src/services/flow.service'
import { caseService } from '../../src/services/case.service'
import { reviewService } from '../../src/services/review.service'
import * as aiMod from '../../src/services/ai.service'
import * as bg from '../../src/utils/background'
import type { CaseRow } from '../../src/fairexit/types'
import {
  InlineMismatchPrompt,
  findMismatches,
  type Rows,
} from '../../../src/components/report/mismatch-row'
import { InlineOfferConflictBanner } from '../../../src/components/report/InlineOfferConflictBanner'
import BlockingErrorModal from '../../../src/components/dialogs/BlockingErrorModal'
import {
  buildMismatchRows,
  extractDocAge,
  extractDocAnnualPay,
  findUnresolvedMismatches,
  toPlainReportErrorMessage,
} from '../../../src/lib/confirmation-mismatch'

const rootDir = path.resolve(__dirname, '../../..')

function makeCase(overrides: Partial<CaseRow> = {}): CaseRow {
  const j = buildJurisdiction('CA-ON')!
  const callA = mockCallA(j, true)
  const facts = Array.isArray(callA.facts) ? [...callA.facts] : []
  const upsertFact = (key: string, value: unknown, source = 'letter', where = 'page 1', quote?: string) => {
    const idx = facts.findIndex((f: any) => f.key === key)
    const entry = { key, value, source, document: source, where, quote, confidence: 'high' }
    if (idx >= 0) facts[idx] = { ...facts[idx], ...entry }
    else facts.push(entry)
  }
  upsertFact('annual_pay', 175000, 'letter', 'paragraph 1', 'Annual salary is $175,000')
  upsertFact('offer_amount', 55000, 'letter', 'paragraph 2', 'Lump sum of $55,000')
  upsertFact('age', 54, 'letter', 'paragraph 1', 'Age 54')
  upsertFact('contract_start', '2017-01-15', 'contract', 'clause 1', 'Started Jan 15, 2017 (9 years)')
  upsertFact('years', 9, 'contract', 'clause 1', '9 years of service')

  return {
    id: '22222222-2222-2222-2222-222222222222',
    public_id: 'FX-TEST-A2',
    user_id: null,
    token_hashes: ['hash'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: j,
    covered: true,
    industry: null,
    answers: {
      province: 'Ontario',
      provinceName: 'Ontario',
      age: 45,
      years: 8,
      salary: 90000,
      offer: 20192,
      minClause: 'yes',
      employee_name: 'Alex Mercer',
      employer_name: 'Northbridge Corp',
    },
    free_result: null,
    status: 'checking',
    status_detail: null,
    job_started_at: null,
    email: 'alex@example.com',
    consent: null,
    remind: false,
    paid_at: new Date().toISOString(),
    payment_provider: 'mock',
    payment_ref: null,
    contract_status: 'added',
    call_a: { ...callA, facts, missing: [] } as any,
    check_state: { rows: {}, agreed: false, attested: false },
    call_b: null,
    report_id: null,
    report_json: null,
    report_html: null,
    report_pdf_path: null,
    report_ready_at: null,
    last_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as CaseRow
}

describe('Round 3 A2 — Mismatch Confirmation Fix', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Test 1 & 2: Single and multiple simultaneous mismatches render in red, ask customer to choose, and have no pre-selection', () => {
    const rows: Rows = {
      age: { value: 45, source: 'letter', user_value: 45, doc_value: 54 },
      annual_pay: { value: 90000, source: 'letter', user_value: 90000, doc_value: 175000 },
    }
    const mismatches = findMismatches(rows)
    expect(mismatches.map((m) => m.key)).toEqual(['age', 'annual_pay'])

    const payHtml = renderToStaticMarkup(
      React.createElement(InlineMismatchPrompt, {
        mismatch: mismatches[1],
        onConfirm: () => {},
      })
    )
    expect(payHtml).toContain('class="fx-mm-inline"')
    expect(payHtml).toContain('Mismatch')
    expect(payHtml).toContain('Please choose which value is correct.')
    expect(payHtml).toContain('Use my answer — $90,000')
    expect(payHtml).toContain('Use document — $175,000')
    expect(payHtml).toContain('aria-checked="false"')
    expect(payHtml).toMatch(/<button[^>]*class="fx-mm-continue"[^>]*disabled=""/)

    const offerHtml = renderToStaticMarkup(
      React.createElement(InlineOfferConflictBanner, {
        docSourceText: 'Your letter, paragraph 2, says:',
        docDisplay: '$55,000',
        docQuote: 'Lump sum of $55,000',
        keepDisplay: '$20,192',
        onUseDocument: () => {},
        onKeepCurrent: () => {},
        onAddClearerCopy: () => {},
      })
    )
    expect(offerHtml).toContain('needs-pick')
    expect(offerHtml).toContain('#D42E2B')
    expect(offerHtml).toContain('Mismatch')
    expect(offerHtml).toContain('Please choose which value is correct.')
    expect(offerHtml).toContain('Your answer')
    expect(offerHtml).toContain('$20,192')
    expect(offerHtml).toContain('Document says')
    expect(offerHtml).toContain('$55,000')
    expect(offerHtml).toContain('Use $55,000')
    expect(offerHtml).toContain('Keep $20,192')

    const css = fs.readFileSync(path.join(rootDir, 'src/components/report/mismatch-row.css'), 'utf8')
    expect(css).toContain('#d42e2b')
    expect(css).toContain('#fff8f8')
  })

  it('Test 2, 3, 4: Simultaneous mismatches resolve independently, Confirm all never overwrites prior picks, and mixed picks reach Call B & report HTML', async () => {
    let stored = makeCase()
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      stored = { ...stored, ...patch } as CaseRow
      return stored
    })
    vi.spyOn(caseService, 'get').mockImplementation(async () => stored)
    vi.spyOn(bg, 'reserveBackground').mockReturnValue('job-a2' as any)
    vi.spyOn(bg, 'runReservedBackground').mockImplementation(() => {})

    const initialRows = buildMismatchRows({
      answers: stored.answers,
      facts: stored.call_a!.facts,
      isUS: false,
    })
    expect(findUnresolvedMismatches(initialRows, findMismatches(initialRows)).map((m) => m.key)).toEqual([
      'age',
      'annual_pay',
    ])

    // Backend blocks attest & build while age & pay remain unresolved
    await expect(flowService.attest(stored, true)).rejects.toMatchObject({ statusCode: 422 })
    await expect(flowService.startBuild(stored)).rejects.toMatchObject({ statusCode: 422 })

    // Choose mixed picks: doc for salary ($175,000), user answer for offer ($20,192), doc for age (54), user answer for years (8)
    await flowService.resolveConflict(stored, 'pay', { choice: 'document' })
    let afterRows = buildMismatchRows({
      answers: stored.answers,
      facts: stored.call_a!.facts,
      checkRows: stored.check_state.rows,
      isUS: false,
    })
    expect(findUnresolvedMismatches(afterRows, findMismatches(afterRows)).map((m) => m.key)).toEqual(['age'])

    await flowService.resolveConflict(stored, 'offer_amount', { choice: 'answers' })
    await flowService.resolveConflict(stored, 'age', { choice: 'document' })
    await flowService.resolveConflict(stored, 'years', { choice: 'answers' })

    afterRows = buildMismatchRows({
      answers: stored.answers,
      facts: stored.call_a!.facts,
      checkRows: stored.check_state.rows,
      isUS: false,
    })
    expect(findUnresolvedMismatches(afterRows, findMismatches(afterRows))).toEqual([])

    // Run Confirm all (saveUserCorrection confirm_all -> autoConfirmAll + attest)
    await reviewService.saveUserCorrection(stored.id, { action: 'confirm_all' })
    expect(stored.check_state.attested).toBe(true)

    // Verify Confirm all NEVER overwrote mixed choices!
    expect(stored.check_state.rows!.pay.value).toBe(175000)
    expect(stored.check_state.rows!.offer_amount.value).toBe(20192)
    expect(stored.check_state.rows!.offer_amount.status).toBe('corrected')
    expect(stored.check_state.rows!.age.value).toBe(54)
    expect(stored.check_state.rows!.years.value).toBe(8)
    expect(stored.check_state.rows!.years.status).toBe('confirmed')
    expect(stored.answers.salary).toBe(175000)
    expect(stored.answers.age).toBe(54)
    expect(stored.answers.offer).toBe(20192)
    expect(stored.answers.years).toBe(8)

    // Reload simulation: buildMismatchRows stays clean and open conflicts are gone
    const ctx: CP.CheckCtx = {
      country: 'CA',
      answers: stored.answers,
      callA: stored.call_a,
      contractStatus: 'added',
      check: stored.check_state,
    }
    expect(CP.conflicts(ctx).map((c) => c.key)).not.toContain('offer_amount')

    // Report input & HTML render reflect mixed confirmed choices
    const { input } = buildCallBInput(stored, ctx)
    expect((input.answers as any).age).toBe(54)
    expect((input.answers as any).pay).toBe(175000)
    expect((input.answers as any).offer).toBe(20192)
    expect((input.answers as any).years).toBe(8)
    expect((input.confirmed_facts as any).rows.age.value).toBe(54)
    expect((input.confirmed_facts as any).rows.pay.value).toBe(175000)
    expect((input.confirmed_facts as any).rows.offer_amount.value).toBe(20192)
    expect((input.confirmed_facts as any).rows.years.value).toBe(8)
    const caOn = buildJurisdiction('CA-ON')!
    const callB = mockCallB(input)
    const html = renderReportHtml(callB as any, {
      reportId: 'RPT-A2-MIX',
      jurisdiction: caOn,
      sources: [],
      rulesAsOf: '2026-11-26',
      attestedAt: stored.check_state.attested_at || new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      numbers: reportNumbers(input),
      answers: stored.answers,
      input,
    })
    expect(reportNumbers(input)?.factorValues.age).toBe('54')
    expect(html).toContain('$20,192')
    expect(html).toContain('$175,000')
    expect(html).toMatch(/\b54\b/)
  })

  it('Test 4 & 5: CanadaReviewPage, USReviewPage, and ReportFlow block Confirm all on mismatches and never auto-resolve or swallow resolveConflict errors', () => {
    const caSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx'), 'utf8')
    const usSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/us/USReviewPage.tsx'), 'utf8')
    const rfSrc = fs.readFileSync(path.join(rootDir, 'src/app/report/ReportFlow.tsx'), 'utf8')

    for (const src of [caSrc, usSrc]) {
      expect(src).toContain('disabled={hasBlockingMismatches}')
      expect(src).toContain('Pick which pay is right (in red above) to continue.')
      expect(src).toContain('scrollToFirstUnresolvedMismatch')
      expect(src).toContain('if (hasBlockingMismatches)')
      expect(src).not.toContain('applySingleMismatchChoice(next, k, "doc")')
      expect(src).not.toContain('setOfferConflictChoice("letter")')
      expect(src).not.toContain('setOfferConflictChoice("agreement")')
      expect(src).not.toContain('setYearsConflictChoice("contract")')
      expect(src).not.toContain('setServiceConflictChoice("contract")')
      expect(src).not.toContain('setContractConflictChoice("contract")')
      expect(src).not.toContain('setNoticeConflictChoice("agreement")')
      expect(src).toContain('apiErr instanceof FairExitApiError && apiErr.status === 404')
      expect(src).not.toMatch(/saveReviewData\(activeCaseId,\s*\{\s*action:\s*'confirm_all'\s*\}\)\.catch\(\(\)\s*=>\s*\{\}\)/)
    }

    expect(rfSrc).toContain('hasBlockingCheckMismatches')
    expect(rfSrc).toContain('Pick which pay is right (in red above) to continue.')
    expect(rfSrc).toContain('Please choose which value is correct.')
  })

  it('Plain-English error translation & BlockingErrorModal hide HTTP codes and Request IDs from screen', () => {
    expect(toPlainReportErrorMessage(new Error('Resolve the mismatch for your yearly pay before continuing'))).toBe(
      "Your pay doesn't match your documents. Pick the right one in the red box above."
    )
    expect(toPlainReportErrorMessage(new Error('HTTP 422 Request ID req-12345 failed to save'))).not.toMatch(/422|Request\s*ID|req-12345/i)

    const modalHtml = renderToStaticMarkup(
      React.createElement(BlockingErrorModal, {
        isOpen: true,
        onClose: () => {},
        data: {
          title: 'Report Generation Failed',
          message: "Your pay doesn't match your documents. Pick the right one in the red box above.",
          stage: 'Report Generation',
          statusCode: 422,
          requestId: 'req-998877-secret',
        },
      })
    )
    expect(modalHtml).toContain("Your pay doesn&#x27;t match your documents. Pick the right one in the red box above.")
    expect(modalHtml).not.toContain('HTTP Status')
    expect(modalHtml).not.toContain('Request ID')
    expect(modalHtml).not.toContain('422')
    expect(modalHtml).not.toContain('req-998877-secret')
  })

  it('Test 7: Clean case with no mismatches allows attest and report build normally', async () => {
    const j = buildJurisdiction('CA-ON')!
    const callA = mockCallA(j, false)
    const docPay = extractDocAnnualPay(callA.facts || [], false)
    const docAge = extractDocAge(callA.facts || [], false)
    let cleanCase = makeCase({
      id: '33333333-3333-3333-3333-333333333333',
      contract_status: 'none',
      answers: {
        province: 'Ontario',
        provinceName: 'Ontario',
        age: docAge?.value ?? 44,
        years: 6,
        salary: docPay?.value ?? 112500,
        offer: 24000,
      },
      call_a: { ...callA, missing: [] } as any,
      check_state: { rows: {}, agreed: false, attested: false },
    })
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      cleanCase = { ...cleanCase, ...patch } as CaseRow
      return cleanCase
    })
    vi.spyOn(caseService, 'get').mockImplementation(async () => cleanCase)
    vi.spyOn(caseService, 'claimBuild').mockImplementation(async (_id, patch) => {
      cleanCase = { ...cleanCase, ...patch } as CaseRow
      return cleanCase
    })
    vi.spyOn(aiMod, 'assertDailyLimit').mockResolvedValue(undefined as any)
    vi.spyOn(bg, 'reserveBackground').mockReturnValue('job-clean' as any)
    vi.spyOn(bg, 'runReservedBackground').mockImplementation(() => {})

    const mm = buildMismatchRows({ answers: cleanCase.answers, facts: cleanCase.call_a!.facts, isUS: false })
    expect(findMismatches(mm)).toEqual([])
    await reviewService.saveUserCorrection(cleanCase.id, { action: 'confirm_all' })
    expect(cleanCase.check_state.attested).toBe(true)
    const built = await flowService.startBuild(cleanCase)
    expect(built.started).toBe(true)
    expect(built.status).toBe('building')
  })
})
