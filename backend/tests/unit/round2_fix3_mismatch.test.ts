import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as CP from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { renderReportHtml, reportNumbers } from '../../src/fairexit/reportOutput'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { mockCallB } from '../../src/fairexit/mocks'
import { flowService } from '../../src/services/flow.service'
import { caseService } from '../../src/services/case.service'
import { reviewService } from '../../src/services/review.service'
import type { CaseRow } from '../../src/fairexit/types'
import {
  MismatchStep,
  findMismatches,
  applyChoices,
  allChosen,
  type Rows,
} from '../../../src/components/report/mismatch-row'
import {
  buildMismatchRows,
  extractDocAge,
  extractDocAnnualPay,
} from '../../../src/lib/confirmation-mismatch'

describe('Round 2 Fix 3 — Confirmation Screen Mismatch (Age & Annual Pay)', () => {
  const usNY = buildJurisdiction('US-NY')!
  const caON = buildJurisdiction('CA-ON')!

  function makeCase(overrides: Partial<CaseRow> = {}): CaseRow {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      public_id: 'FX-TEST-1',
      user_id: null,
      token_hashes: ['hash'],
      platform: 'web',
      country: 'US',
      jurisdiction_code: 'US-NY',
      jurisdiction: usNY,
      covered: true,
      industry: null,
      answers: {
        usState: 'New York',
        state: 'New York',
        age: 45,
        years: 9,
        salary: 66554,
        offer: 20192,
      },
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
      call_a: {
        facts: [
          { key: 'age_stated', value: '54 (born February 9, 1972)', document: 'agreement', quote: 'date of birth February 9, 1972 (age 54)', where: 'page 2, Employee data', confidence: 'high' },
          { key: 'base_salary', value: '$175,000 per year effective January 1, 2025', document: 'contract', quote: 'later $175,000 effective January 1, 2025', where: 'page 2, Promotion letter', confidence: 'high' },
          { key: 'offer_amount', value: '$20,192.31', document: 'agreement', quote: '$20,192.31 in total', where: 'page 1, section 2', confidence: 'high' },
          { key: 'last_day', value: 'October 2, 2026', document: 'agreement', quote: 'October 2, 2026', where: 'page 1, section 1', confidence: 'high' },
          { key: 'release_required', value: 'Yes', document: 'agreement', quote: 'sign this Agreement', where: 'page 1, section 2', confidence: 'high' },
          { key: 'days_to_decide', value: '7 days', document: 'agreement', quote: 'seven (7) days', where: 'page 2, section 9', confidence: 'high' },
          { key: 'take_back', value: 'not mentioned', document: 'agreement', quote: null, where: 'page 2, section 9', confidence: 'high' },
          { key: 'attorney_line', value: 'Yes', document: 'agreement', quote: 'advised to consult an attorney', where: 'page 2, section 9', confidence: 'high' },
          { key: 'non_compete', value: 'Yes', document: 'contract', quote: 'eighteen (18) months', where: 'page 2, section 7', confidence: 'high' },
          { key: 'advance_notice', value: '2 days', document: 'agreement', quote: 'September 30, 2026', where: 'page 1', confidence: 'high' },
        ],
        missing: [],
      },
      call_a_at: new Date().toISOString(),
      check_state: { rows: {}, attested: false, attested_at: null, dismissed: [] },
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
      prompt_version: 'v0.7',
      prompt_sha256: 'sha',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Scenario A — Age mismatch (45 typed vs 54 document)
  // -------------------------------------------------------------------------
  it('Scenario A: detects age mismatch (45 vs 54), requires explicit selection, blocks bypass, and passes selected value to report', async () => {
    const c = makeCase({
      answers: { usState: 'New York', age: 45, years: 9, salary: 175000, offer: 20192 },
    })
    const ctx: CP.CheckCtx = {
      country: c.country,
      answers: { ...c.answers },
      callA: c.call_a,
      contractStatus: c.contract_status,
      check: c.check_state,
    }

    // Frontend mismatch row builder + client findMismatches
    const mmRows = buildMismatchRows({
      answers: c.answers,
      facts: c.call_a!.facts,
      checkRows: c.check_state.rows,
      isUS: true,
    })
    const mismatches = findMismatches(mmRows)
    expect(mismatches.map((m) => m.key)).toEqual(['age'])
    expect(mismatches[0].userValue).toBe(45)
    expect(mismatches[0].docValue).toBe(54)
    expect(allChosen(mismatches, {})).toBe(false)
    expect(allChosen(mismatches, { age: 'doc' })).toBe(true)

    // Backend conflicts & bypass prevention
    expect(CP.conflicts(ctx).map((x) => x.key)).toContain('age')
    await expect(flowService.attest(c, true)).rejects.toThrow(/age/i)
    await expect(flowService.startBuild(c)).rejects.toThrow(/age/i)

    // Mock persistence and resolve conflict choosing document value (54)
    let storedCase = c
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      storedCase = { ...storedCase, ...patch } as CaseRow
      return storedCase
    })
    await flowService.resolveConflict(storedCase, 'age', { choice: 'document' })

    expect(storedCase.check_state.rows.age.value).toBe(54)
    expect(storedCase.check_state.rows.age.status).toBe('confirmed')
    expect(storedCase.check_state.rows.age.user_value).toBe(45)
    expect(storedCase.check_state.rows.age.doc_value).toBe(54)
    expect(storedCase.answers.age).toBe(54)

    // Confirm remaining rows & build Call B input + HTML report
    const nextCtx: CP.CheckCtx = {
      country: storedCase.country,
      answers: storedCase.answers,
      callA: storedCase.call_a,
      contractStatus: storedCase.contract_status,
      check: storedCase.check_state,
    }
    CP.autoConfirmAll(nextCtx)
    nextCtx.check.attested = true
    nextCtx.check.attested_at = new Date().toISOString()

    const { input } = buildCallBInput(storedCase, nextCtx)
    expect((input.answers as any).age).toBe(54)
    expect((input.confirmed_facts as any).rows.age.value).toBe(54)
    expect(reportNumbers(input)?.factorValues.age).toBe('54')

    const html = renderReportHtml(mockCallB(input) as any, {
      reportId: 'RPT-TEST',
      jurisdiction: usNY,
      sources: [],
      rulesAsOf: '2026-11-24',
      attestedAt: nextCtx.check.attested_at,
      generatedAt: new Date().toISOString(),
      numbers: reportNumbers(input),
      answers: storedCase.answers,
      input,
    })
    expect(html).toContain('>54<')
    expect(html).not.toContain('>45<')
  })

  it('Scenario A (user choice): selecting typed age (45) replaces doc value and reaches report generation', async () => {
    const c = makeCase({
      answers: { usState: 'New York', age: 45, years: 9, salary: 175000, offer: 20192 },
    })
    let storedCase = c
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      storedCase = { ...storedCase, ...patch } as CaseRow
      return storedCase
    })

    await flowService.resolveConflict(storedCase, 'age', { choice: 'answers' })
    expect(storedCase.check_state.rows.age.value).toBe(45)
    expect(storedCase.check_state.rows.age.status).toBe('confirmed')
    expect(storedCase.answers.age).toBe(45)

    const nextCtx: CP.CheckCtx = {
      country: storedCase.country,
      answers: storedCase.answers,
      callA: storedCase.call_a,
      contractStatus: storedCase.contract_status,
      check: storedCase.check_state,
    }
    const { input } = buildCallBInput(storedCase, nextCtx)
    expect((input.answers as any).age).toBe(45)
    expect((input.confirmed_facts as any).rows.age.value).toBe(45)
  })

  // -------------------------------------------------------------------------
  // Scenario B — Annual pay mismatch ($66,554 typed vs $175,000 document)
  // -------------------------------------------------------------------------
  it('Scenario B: detects annual pay mismatch ($66,554 vs $175,000), blocks bypass, and feeds $175,000 to rules engine and report', async () => {
    const c = makeCase({
      country: 'CA',
      jurisdiction_code: 'CA-ON',
      jurisdiction: caON,
      answers: { province: 'ON', age: 54, years: 9, salary: 66554, payroll: 'yes', offer: 20192 },
    })
    const ctx: CP.CheckCtx = {
      country: 'CA',
      answers: { ...c.answers },
      callA: c.call_a,
      contractStatus: c.contract_status,
      check: c.check_state,
    }

    const mmRows = buildMismatchRows({
      answers: c.answers,
      facts: c.call_a!.facts,
      checkRows: c.check_state.rows,
      isUS: false,
    })
    const mismatches = findMismatches(mmRows)
    expect(mismatches.map((m) => m.key)).toEqual(['annual_pay'])
    expect(mismatches[0].userValue).toBe(66554)
    expect(mismatches[0].docValue).toBe(175000)
    expect(allChosen(mismatches, {})).toBe(false)
    expect(allChosen(mismatches, { annual_pay: 'doc' })).toBe(true)

    expect(CP.conflicts(ctx).map((x) => x.key)).toContain('pay')
    await expect(flowService.attest(c, true)).rejects.toThrow(/pay/i)

    let storedCase = c
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      storedCase = { ...storedCase, ...patch } as CaseRow
      return storedCase
    })
    await flowService.resolveConflict(storedCase, 'pay', { choice: 'document' })

    expect(storedCase.check_state.rows.pay.value).toBe(175000)
    expect(storedCase.check_state.rows.pay.status).toBe('confirmed')
    expect(storedCase.answers.salary).toBe(175000)

    const nextCtx: CP.CheckCtx = {
      country: 'CA',
      answers: storedCase.answers,
      callA: storedCase.call_a,
      contractStatus: storedCase.contract_status,
      check: storedCase.check_state,
    }
    CP.autoConfirmAll(nextCtx)
    nextCtx.check.attested = true
    nextCtx.check.attested_at = new Date().toISOString()

    const { input, engine } = buildCallBInput(storedCase, nextCtx)
    expect((engine.input as any).salary).toBe(175000)
    expect((input.answers as any).pay).toBe(175000)
    expect((input.confirmed_facts as any).rows.pay.value).toBe(175000)

    const html = renderReportHtml(mockCallB(input) as any, {
      reportId: 'RPT-TEST-CA',
      jurisdiction: caON,
      sources: [],
      rulesAsOf: '2026-11-24',
      attestedAt: nextCtx.check.attested_at,
      generatedAt: new Date().toISOString(),
      numbers: reportNumbers(input),
      answers: storedCase.answers,
      input,
    })
    expect(html).toContain('Your pay: $175,000 a year')
    expect(html).not.toContain('66,554')
  })

  it('Scenario B (hourly guard): does not treat hourly pay_rate ($32.00 per hour) as an annual salary mismatch', () => {
    const facts = [{ key: 'pay_rate', value: '$32.00 per hour', document: 'agreement', quote: '$32.00 per hour', where: 'page 1' }]
    expect(extractDocAnnualPay(facts, true)).toBeNull()

    const rows = buildMismatchRows({
      answers: { salary: 66554 },
      facts,
      isUS: true,
    })
    expect(findMismatches(rows)).toEqual([])
  })

  it('Scenario B (v0.7 fallback): extracts age and base salary from Call A `other` or `pay_rate` facts', () => {
    const facts = [
      { key: 'pay_rate', value: '$175,000 per year', document: 'letter', quote: 'base salary $175,000', where: 'page 2' },
      { key: 'other', value: 'Employee data: date of birth February 9, 1972 (age 54)', document: 'letter', quote: 'age 54', where: 'page 2' },
    ]
    expect(extractDocAge(facts, true)?.value).toBe(54)
    expect(extractDocAnnualPay(facts, true)?.value).toBe(175000)
  })

  // -------------------------------------------------------------------------
  // Scenario C — Both age and annual pay mismatch
  // -------------------------------------------------------------------------
  it('Scenario C: when both age and annual pay mismatch, requires both selections and supports replacing choices', () => {
    const c = makeCase()
    const mmRows = buildMismatchRows({
      answers: c.answers,
      facts: c.call_a!.facts,
      checkRows: c.check_state.rows,
      isUS: true,
    })
    const mismatches = findMismatches(mmRows)
    expect(mismatches.map((m) => m.key)).toEqual(['age', 'annual_pay'])

    // Partial selection still blocks Continue
    expect(allChosen(mismatches, {})).toBe(false)
    expect(allChosen(mismatches, { age: 'doc' })).toBe(false)
    expect(allChosen(mismatches, { age: 'doc', annual_pay: 'user' })).toBe(true)

    // Replacing a selection changes the applied result
    const choices: Record<string, 'user' | 'doc'> = { age: 'user', annual_pay: 'user' }
    choices.age = 'doc'
    choices.annual_pay = 'doc'
    const applied = applyChoices(mmRows, choices)
    expect(applied.age.value).toBe(54)
    expect(applied.age.status).toBe('confirmed_from_document')
    expect(applied.annual_pay.value).toBe(175000)
    expect(applied.annual_pay.status).toBe('confirmed_from_document')

    // MismatchStep renders side-by-side tiles, "which is right?", "1 of 2", and disabled Continue initially
    const markup = renderToStaticMarkup(React.createElement(MismatchStep, { rows: mmRows, onDone: () => {} }))
    expect(markup).toContain('1 of 2')
    expect(markup).toContain('Your age: which is right?')
    expect(markup).toContain('What you told us')
    expect(markup).toContain('>45<')
    expect(markup).toContain('What your agreement says')
    expect(markup).toContain('>54<')
    expect(markup).toMatch(/<button[^>]*class="fx-mm-continue"[^>]*disabled=""/)

    // Single annual pay mismatch renders $66,554 vs $175,000 side-by-side with Continue disabled
    const payOnlyRows = buildMismatchRows({
      answers: { age: 54, salary: 66554 },
      facts: c.call_a!.facts,
      isUS: true,
    })
    const payMarkup = renderToStaticMarkup(React.createElement(MismatchStep, { rows: payOnlyRows, onDone: () => {} }))
    expect(payMarkup).toContain('Your yearly pay: which is right?')
    expect(payMarkup).toContain('$66,554')
    expect(payMarkup).toContain('$175,000')
    expect(payMarkup).toMatch(/<button[^>]*class="fx-mm-continue"[^>]*disabled=""/)
  })

  // -------------------------------------------------------------------------
  // Scenario D — Matching values (and within 2% tolerance)
  // -------------------------------------------------------------------------
  it('Scenario D: preserves normal confirmation when typed and document values match (or are within 2%)', () => {
    const c = makeCase({
      answers: { usState: 'New York', age: 54, years: 9, salary: 174000, offer: 20192 },
    })
    const mmRows = buildMismatchRows({
      answers: c.answers,
      facts: c.call_a!.facts,
      checkRows: c.check_state.rows,
      isUS: true,
    })
    expect(findMismatches(mmRows)).toEqual([])

    const ctx: CP.CheckCtx = {
      country: 'US',
      answers: c.answers,
      callA: c.call_a,
      contractStatus: c.contract_status,
      check: c.check_state,
    }
    expect(CP.conflicts(ctx).some((x) => x.key === 'age' || x.key === 'pay')).toBe(false)
  })

  // -------------------------------------------------------------------------
  // Scenario E — Existing offer amount confirmation card unaffected
  // -------------------------------------------------------------------------
  it('Scenario E: preserves existing offer_amount conflict detection and UI card', () => {
    const c = makeCase({
      answers: { usState: 'New York', age: 54, years: 9, salary: 175000, offer: 15000 },
    })
    const ctx: CP.CheckCtx = {
      country: 'US',
      answers: c.answers,
      callA: c.call_a,
      contractStatus: c.contract_status,
      check: c.check_state,
    }
    const conflicts = CP.conflicts(ctx)
    expect(conflicts.some((x) => x.key === 'offer_amount')).toBe(true)

    const rootDir = path.resolve(__dirname, '../../..')
    const caSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx'), 'utf8')
    const usSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/us/USReviewPage.tsx'), 'utf8')
    expect(caSrc).toContain('hasOfferConflict && (')
    expect(caSrc).toContain('handleChooseOfferConflict')
    expect(usSrc).toContain('handleChooseOfferConflict')
  })

  // -------------------------------------------------------------------------
  // Scenario F — Navigation & reload persistence
  // -------------------------------------------------------------------------
  it('Scenario F: resolved mismatch selections survive reload / backward-forward navigation without reverting', async () => {
    let storedCase = makeCase()
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => {
      storedCase = { ...storedCase, ...patch } as CaseRow
      return storedCase
    })
    vi.spyOn(caseService, 'get').mockImplementation(async () => storedCase)

    // User resolves both mismatches on the confirmation screen
    await flowService.resolveConflict(storedCase, 'age', { choice: 'document' })
    await flowService.resolveConflict(storedCase, 'pay', { choice: 'document' })

    // Simulate returning to confirmation screen / refreshing via getReviewData
    const review = await reviewService.getReviewData(storedCase.id)
    const mmAfterReturn = buildMismatchRows({
      answers: review.answers,
      facts: review.originalExtractedFacts,
      checkRows: review.checkState.rows,
      conflicts: review.reviewModel?.conflicts,
      isUS: true,
    })
    expect(findMismatches(mmAfterReturn)).toEqual([])
    expect(review.checkState.rows.age.value).toBe(54)
    expect(review.checkState.rows.age.status).toBe('confirmed')
    expect(review.checkState.rows.pay.value).toBe(175000)
    expect(review.checkState.rows.pay.status).toBe('confirmed')
    expect(review.answers.age).toBe(54)
    expect(review.answers.salary).toBe(175000)

    // User later changes their mind via rowAction ('confirm' with explicit new value via reviewService)
    await reviewService.saveUserCorrection(storedCase.id, { key: 'age', action: 'confirm', value: 45 })
    expect(storedCase.check_state.rows.age.value).toBe(45)
    expect(storedCase.answers.age).toBe(45)
  })
})
