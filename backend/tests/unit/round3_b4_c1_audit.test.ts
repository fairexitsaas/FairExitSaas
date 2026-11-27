import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import loadingCards from '../../../src/data/loading-cards.json'
import regionsData from '../../src/data/regions.json'
import { getLoadingCardsForRegion } from '../../../src/lib/loadingCards'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { sourcesFor } from '../../src/fairexit/regionData'
import {
  buildModel,
  autoConfirmAll,
  setRow,
  conflicts,
  CheckCtx,
} from '../../src/fairexit/checkPage'
import {
  answersForPrompt,
  buildCallBInput,
  buildMinimumAndRange,
} from '../../src/fairexit/reportInputs'
import {
  renderReportHtml,
  reportSections,
  reportNumbers,
  ReportJson,
  RenderMeta,
} from '../../src/fairexit/reportOutput'
import type { CaseRow } from '../../src/fairexit/types'

function makeCase(
  country: 'CA' | 'US',
  jCode: string,
  answers: Record<string, any>,
  facts: any[] = [],
): CaseRow {
  return {
    id: 'case-r3-b4-test',
    country,
    jurisdiction_code: jCode,
    jurisdiction: buildJurisdiction(jCode),
    answers,
    call_a: { facts, missing: [] },
    call_a2: {},
    documents: [],
  } as unknown as CaseRow
}

function minimalUsReport(overrides: Partial<ReportJson> = {}): ReportJson {
  const us = buildJurisdiction('US-NY')!
  const sources = sourcesFor(us)
  return {
    cover: {
      name_line: 'Jordan Taylor',
      role_line: 'Analyst · 9 years',
      place_line: 'New York',
    },
    glance: 'Your employer offered $20,192 for signing a separation agreement.',
    confirmed_line: 'Built on the details you confirmed on November 26, 2026.',
    rules_as_of: 'Rules as of November 26, 2026.',
    checks: [
      {
        topic: 'Your details',
        letter_says: '9 years',
        contract_says: '9 years',
        rule_says: 'Document values used',
        status: 'ask',
        why: 'Ask HR to confirm your dates in writing.',
        source_id: sources[0].id,
        from_answers: false,
      },
    ],
    release_check: [
      {
        status: 'bad',
        point: '21 days to consider',
        detail: 'ADEA waiver at age 40+ gives 21 days to consider.',
        source_id: sources[0].id,
      },
      {
        status: 'ok',
        point: '7 days to revoke',
        detail: '7 calendar days after signing to take it back.',
        source_id: sources[0].id,
      },
    ],
    myths: [],
    clauses: [
      {
        title: 'Arbitration',
        status: 'ask',
        what_it_says: 'Any dispute must go to binding individual arbitration.',
        what_it_means: 'Decides where any dispute is heard instead of court; worth an attorney read.',
        question_to_ask: 'Does arbitration apply to statutory wage claims?',
        source_id: 'from_documents',
      },
      {
        title: 'Non-disparagement',
        status: 'ask',
        what_it_says: 'You agree not to make disparaging statements.',
        what_it_means: 'Limits public or private criticism of the company.',
        question_to_ask: 'Is this mutual or limited to factual statements?',
        source_id: 'from_documents',
      },
    ],
    questions: ['Can arbitration be narrowed?'],
    next_steps: ['Review the release before signing.'],
    already_signed: false,
    citations_used: [sources[0].id],
    ...overrides,
  }
}

describe('Round 3 Part 1 (B4): US report corrections', () => {
  describe('B4.1: signed_yet passed accurately to Call B', () => {
    it('passes signed_yet = "no" when user answers No (including capitalized or signedYet variant), even with blank signature lines', () => {
      const us = buildJurisdiction('US-NY')!
      for (const ans of [
        { usState: 'New York', age: 54, years: 9, salary: 175000, signed: 'no' },
        { usState: 'New York', age: 54, years: 9, salary: 175000, signed: 'No' },
        { usState: 'New York', age: 54, years: 9, salary: 175000, signedYet: 'no' },
      ]) {
        const c = makeCase('US', 'US-NY', ans, [
          {
            key: 'release_required',
            value: 'yes',
            document: 'agreement',
            quote: 'Signature lines left blank for employee and employer',
            where: 'p.4',
            confidence: 'high',
          },
        ])
        const ctx: CheckCtx = {
          country: 'US',
          answers: { ...ans },
          callA: c.call_a,
          check: { rows: {} },
        }
        buildModel(ctx)
        autoConfirmAll(ctx)
        const { input } = buildCallBInput(c, ctx)
        expect((input.answers as any).signed_yet).toBe('no')
      }

      const promptsInput = answersForPrompt(
        makeCase('US', 'US-NY', { usState: 'New York', signed: 'no' }),
        us,
      )
      expect(promptsInput.signed_yet).toBe('no')
    })

    it('passes signed_yet = "yes" when user answers Yes and preserves null when missing', () => {
      const us = buildJurisdiction('US-NY')!
      expect(
        answersForPrompt(makeCase('US', 'US-NY', { usState: 'New York', signed: 'yes' }), us).signed_yet,
      ).toBe('yes')
      expect(
        answersForPrompt(makeCase('US', 'US-NY', { usState: 'New York', signedYet: 'Yes' }), us).signed_yet,
      ).toBe('yes')
      expect(
        answersForPrompt(makeCase('US', 'US-NY', { usState: 'New York', signed: '' }), us).signed_yet,
      ).toBeNull()
      expect(
        answersForPrompt(makeCase('US', 'US-NY', { usState: 'New York' }), us).signed_yet,
      ).toBeNull()
    })

    it('USFlow saves state.signed in both ensureCase and saveReportInputs', () => {
      const rootDir = path.resolve(__dirname, '../../..')
      const usFlowSrc = fs.readFileSync(path.join(rootDir, 'src/app/questions/USFlow.tsx'), 'utf8')
      expect(usFlowSrc).toContain('handleAnswer("signed", item.k)')
      expect(usFlowSrc).toContain('signed: state.signed === "yes" ? "Yes" : "No"')
    })
  })

  describe('B4.2: signed-status page selection and release box wording', () => {
    const us = buildJurisdiction('US-NY')!
    const makeMeta = (overrides: Partial<RenderMeta> = {}): RenderMeta => ({
      reportId: 'RPT-US-B4',
      jurisdiction: us,
      sources: sourcesFor(us),
      rulesAsOf: '2026-11-26',
      attestedAt: '2026-11-26T12:00:00Z',
      generatedAt: '2026-11-26T12:05:00Z',
      answers: { age: 54, years: 9, salary: 175000, signed: 'no' },
      ...overrides,
    })

    it('shows only "You\'ve already signed" when already_signed === true, and never "You don\'t have to sign today"', () => {
      const rep = minimalUsReport({ already_signed: true })
      const html = renderReportHtml(rep, makeMeta({ answers: { age: 54, years: 9, salary: 175000, signed: 'yes' } }))
      const secs = reportSections(rep, makeMeta())

      expect(secs.some((s) => s.id === 's5_already_signed')).toBe(true)
      expect(secs.some((s) => s.id === 's5_three_paths')).toBe(false)
      expect(html).toContain("You've already <i>signed.</i>")
      expect(html).toContain("You've already signed: what still matters")
      expect(html).not.toContain("You don't have to sign today")
      expect(html).not.toContain("You don't have to <i>sign today.</i>")
    })

    it('shows only "You don\'t have to sign today" when already_signed is false or omitted', () => {
      for (const flag of [false, undefined]) {
        const rep = minimalUsReport({ already_signed: flag })
        const html = renderReportHtml(rep, makeMeta())
        const secs = reportSections(rep, makeMeta())

        expect(secs.some((s) => s.id === 's5_three_paths')).toBe(true)
        expect(secs.some((s) => s.id === 's5_already_signed')).toBe(false)
        expect(html).toContain("You don't have to <i>sign today.</i>")
        expect(html).not.toContain("You've already <i>signed.</i>")
        expect(html).not.toContain("You've already signed: what still matters")
      }
    })

    it('builds release box from release_check points and never renders the fixed ADEA-not-waived sentence', () => {
      const banned = 'Because age discrimination (ADEA) claims are not waived, statutory consideration periods under OWBPA do not apply.'

      // Case 1: 40+ with agreement deadline and no adea_waiver flag (previously triggered line 1561)
      const rep1 = minimalUsReport()
      const html1 = renderReportHtml(
        rep1,
        makeMeta({ answers: { age: 54, years: 9, salary: 175000, days_to_decide: 7 } }),
      )
      expect(html1).not.toContain(banned)
      expect(html1).toContain('21 days to consider · 7 days to revoke')

      // Case 2: Call A adea_named = 'Yes' (v0.8/v0.9 key) establishes ADEA waiver -> 21 days + revocation
      const html2 = renderReportHtml(
        rep1,
        makeMeta({
          answers: { age: 54, years: 9, salary: 175000, days_to_decide: 7, others: 'me' },
          input: {
            call_a: {
              facts: [
                { key: 'adea_named', value: 'Yes', document: 'agreement', quote: 'including claims under the ADEA', where: 'p.2', confidence: 'high' },
              ],
            },
          },
        }),
      )
      expect(html2).not.toContain(banned)
      expect(html2).toContain('21 days')
      expect(html2).toContain('7 days after signing')
      expect(html2).toContain('21 days to consider · 7 days to revoke')

      // Case 3: Missing or empty release_check does not crash
      const repEmpty = minimalUsReport({ release_check: [] })
      expect(() => renderReportHtml(repEmpty, makeMeta())).not.toThrow()
      const repMissing = minimalUsReport({ release_check: undefined })
      expect(() => renderReportHtml(repMissing, makeMeta())).not.toThrow()
    })
  })

  describe('B4.3: US clause explanations and confirmed service years in At a glance', () => {
    it('renders Arbitration and other US clauses with their own what_it_means, never "Your details" check text', () => {
      const us = buildJurisdiction('US-NY')!
      const rep = minimalUsReport()
      const html = renderReportHtml(rep, {
        reportId: 'RPT-US-CL',
        jurisdiction: us,
        sources: sourcesFor(us),
        rulesAsOf: '2026-11-26',
        attestedAt: '2026-11-26T12:00:00Z',
        generatedAt: '2026-11-26T12:05:00Z',
        answers: { age: 54, years: 9, salary: 175000 },
      })

      expect(html).toContain('Decides where any dispute is heard instead of court; worth an attorney read.')
      expect(html).toContain('Limits public or private criticism of the company.')
      const clauseSection = html.split('Arbitration')[1] || ''
      expect(clauseSection).not.toContain('Why it matters:</b> Ask HR to confirm your dates in writing.')
    })

    it('uses confirmed 9 years instead of typed 8 years in US At a glance, and falls back when unconfirmed', () => {
      const us = buildJurisdiction('US-NY')!
      const answers = { usState: 'New York', age: 54, years: 8, salary: 175000 }
      const facts = [
        { key: 'contract_start', value: '2017-04-24', document: 'contract', quote: 'Start date April 24, 2017', where: 'p.1', confidence: 'high' },
        { key: 'last_day', value: '2026-04-24', document: 'agreement', quote: 'Last day April 24, 2026', where: 'p.1', confidence: 'high' },
      ]
      const c = makeCase('US', 'US-NY', answers, facts)
      const ctx: CheckCtx = {
        country: 'US',
        answers: { ...answers },
        callA: c.call_a,
        contractStatus: 'added',
        check: { rows: {} },
      }

      // Check page surfaces conflict even for 8 typed vs 9 documented (1 year >= 0.5 threshold)
      const openConflicts = conflicts(ctx)
      expect(openConflicts.some((x) => x.key === 'years')).toBe(true)

      // Confirm 9 years from documents
      setRow(ctx, 'years', 9, 'confirmed')
      autoConfirmAll(ctx)
      const { input } = buildCallBInput(c, ctx)
      const nums = reportNumbers(input)
      expect(nums?.factorValues.service).toBe('9 years')

      const rep = minimalUsReport()
      const html = renderReportHtml(rep, {
        reportId: 'RPT-US-YRS',
        jurisdiction: us,
        sources: sourcesFor(us),
        rulesAsOf: '2026-11-26',
        attestedAt: '2026-11-26T12:00:00Z',
        generatedAt: '2026-11-26T12:05:00Z',
        numbers: nums,
        answers: { ...answers },
        input,
      })
      const glancePart = html.split('class="glance-table"')[1]?.split('class="page-footer"')[0] || ''
      expect(glancePart).toContain('9 years')
      expect(glancePart).not.toContain('8 years')

      // Fallback when no confirmed service years exist
      const fallbackHtml = renderReportHtml(
        minimalUsReport({
          cover: { name_line: 'Jordan Taylor', role_line: 'Analyst', place_line: 'New York' },
        }),
        {
          reportId: 'RPT-US-YRS-FB',
          jurisdiction: us,
          sources: sourcesFor(us),
          rulesAsOf: '2026-11-26',
          attestedAt: '2026-11-26T12:00:00Z',
          generatedAt: '2026-11-26T12:05:00Z',
          answers: { age: 54, years: 8, salary: 175000 },
        },
      )
      const fbGlance = fallbackHtml.split('class="glance-table"')[1]?.split('class="page-footer"')[0] || ''
      expect(fbGlance).toContain('8 years')
    })
  })
})

describe('Round 3 Part 2 (C1): Region data changes', () => {
  it('C1.1: CA-FED has the exact federal unjust dismissal card appended at the end', () => {
    const fedCards = (loadingCards as Record<string, any[]>)['CA-FED']
    const last = fedCards[fedCards.length - 1]
    expect(last).toEqual({
      kind: 'region',
      text: 'Federally regulated · Unjust dismissal (section 240): after 12 consecutive months with the same employer, if you are not a manager and not covered by a collective agreement, you can file a complaint within 90 days of your dismissal. It does not apply when you were laid off because of lack of work or because your function ended (section 242(3.1)).',
      source: {
        name: 'Government of Canada',
        section: 'Filing a labour standards complaint: eligibility and timelines (unjust dismissal, 90 days)',
        url: 'https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/eligibility-timelines.html',
      },
    })
    const loaded = getLoadingCardsForRegion('CA-FED', false, true)
    expect(loaded[loaded.length - 1].text).toContain('Unjust dismissal (section 240)')
  })

  it('C1.2: US-WI has the exact Wisconsin severance & unemployment card appended at the end', () => {
    const wiCards = (loadingCards as Record<string, any[]>)['US-WI']
    const last = wiCards[wiCards.length - 1]
    expect(last).toEqual({
      kind: 'region',
      text: 'Wisconsin · Severance and unemployment: severance or dismissal pay, and pay in lieu of notice, must be reported. If it is assigned to a week, it counts as wages for that week and can reduce or stop benefits for that week. You can still file a claim while you receive severance.',
      source: {
        name: 'Wisconsin Department of Workforce Development',
        section: 'Unemployment Insurance Claimant Handbook (UCB-10-P): reporting dismissal/severance pay and pay in lieu of notice',
        url: 'https://dwd.wisconsin.gov/uiben/handbook/pdf/ucb10print.pdf',
      },
    })
    const loaded = getLoadingCardsForRegion('US-WI', true, true)
    expect(loaded[loaded.length - 1].text).toContain('Wisconsin · Severance and unemployment')
  })

  it('C1.3: WARN Act citation is 29 U.S.C. § 2101 (never 20 U.S.C. § 2101) with dol.gov URL intact', () => {
    const us = buildJurisdiction('US-NY')!
    const rep = minimalUsReport()
    const html = renderReportHtml(rep, {
      reportId: 'RPT-US-WARN',
      jurisdiction: us,
      sources: sourcesFor(us),
      rulesAsOf: '2026-11-26',
      attestedAt: '2026-11-26T12:00:00Z',
      generatedAt: '2026-11-26T12:05:00Z',
      answers: { age: 54, years: 9, salary: 175000 },
    })
    expect(html).toContain('29 U.S.C. § 2101')
    expect(html).toContain('https://www.dol.gov/agencies/eta/layoffs/warn')
    expect(html).not.toContain('20 U.S.C. § 2101')
  })

  it('C1.4: Vermont region data remains unchanged with 21 V.S.A. 342 citations intact', () => {
    const vtCards = (loadingCards as Record<string, any[]>)['US-VT']
    expect(vtCards.length).toBeGreaterThan(0)
    const regionVt = vtCards.filter((c) => c.kind === 'region')
    expect(regionVt[0].source.section).toContain('21 V.S.A. s.342')
    expect(regionVt[3].source.section).toContain('21 V.S.A. s.342')
    const vtSources = (regionsData as any).regions['US-VT']?.sources || []
    expect(Array.isArray(vtSources)).toBe(true)
  })
})

describe('Round 3 Part 3: Previous implementation audit findings 1 & 2', () => {
  describe('Audit Finding 1: Ontario $2.5M payroll override only from severance letter', () => {
    const baseAnswers = { province: 'ON', age: 57, years: 14.6, salary: 112500, payroll: 'unsure' }
    const on = buildJurisdiction('CA-ON')!

    const runOntario = (facts: any[]) => {
      const c = makeCase('CA', 'CA-ON', baseAnswers, facts)
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { ...baseAnswers },
        callA: { facts, missing: [] },
        check: { rows: {} },
      }
      setRow(ctx, 'age', 57, 'confirmed')
      setRow(ctx, 'years', 14.6, 'confirmed')
      setRow(ctx, 'pay', 112500, 'confirmed')
      setRow(ctx, 'working_notice_weeks', 0, 'confirmed')
      return buildMinimumAndRange(c, ctx, on)
    }

    it('1. Letter contains positive severance_weeks -> override applies ($48,894 minimum)', () => {
      const { minimum } = runOntario([
        { key: 'severance_weeks', value: 14.5, document: 'letter', quote: '14.5 weeks ESA severance', where: 'p.2', confidence: 'high' },
      ])
      expect(minimum.severanceWeeks).toBeCloseTo(14.6, 1)
      expect(minimum.amount).toBe(48894)
      expect(minimum.potentialSeveranceWeeks).toBeUndefined()
    })

    it('2. Contract contains positive severance_weeks and letter does not -> override does NOT apply', () => {
      const { minimum } = runOntario([
        { key: 'severance_weeks', value: 14.5, document: 'contract', quote: 'ESA severance if eligible', where: 's.6', confidence: 'high' },
      ])
      expect(minimum.severanceWeeks).toBe(0)
      expect(minimum.potentialSeveranceWeeks).toBeCloseTo(14.6, 1)
      expect(minimum.potentialSeveranceAmount).toBeGreaterThan(30000)
    })

    it('3. Letter contains zero, blank, "none", "not mentioned", or non-numeric text -> override does NOT apply', () => {
      for (const badVal of [0, '0', '', 'none', 'not mentioned', 'pending payroll review']) {
        const { minimum } = runOntario([
          { key: 'severance_weeks', value: badVal, document: 'letter', quote: String(badVal), where: 'p.2', confidence: 'high' },
        ])
        expect(minimum.severanceWeeks).toBe(0)
        expect(minimum.potentialSeveranceWeeks).toBeCloseTo(14.6, 1)
      }
    })
  })

  describe('Audit Finding 2: Raw extracted values never bypass confirmation status', () => {
    const on = buildJurisdiction('CA-ON')!
    const rawFacts = [
      { key: 'age', value: 57, document: 'letter', quote: 'Age 57', where: 'p.1', confidence: 'high' },
      { key: 'annual_pay', value: 112500, document: 'letter', quote: '$112,500', where: 'p.1', confidence: 'high' },
      { key: 'contract_start', value: '2011-08-22', document: 'contract', quote: 'Aug 22 2011', where: 'p.1', confidence: 'high' },
      { key: 'last_day', value: '2026-03-31', document: 'letter', quote: 'Mar 31 2026', where: 'p.1', confidence: 'high' },
    ]
    const typedAnswers = { province: 'ON', age: 45, years: 12, salary: 80000, payroll: 'yes' }

    it('unconfirmed raw extracted facts do NOT silently override fallback typed answers', () => {
      const c = makeCase('CA', 'CA-ON', typedAnswers, rawFacts)
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { ...typedAnswers },
        callA: { facts: rawFacts, missing: [] },
        check: { rows: {} },
      }
      const { minimum, range } = buildMinimumAndRange(c, ctx, on)
      expect(minimum.inputs).toEqual({ years: 12, pay: 80000, age: 45 })
      expect(range!.inputs).toEqual({ years: 12, pay: 80000, age: 45 })

      const pAns = answersForPrompt(c, on, ctx)
      expect(pAns.age).toBe(45)
      expect(pAns.years).toBe(12)
      expect(pAns.pay).toBe(80000)
    })

    it('unacknowledged corrected row (change_ack: false) does NOT override fallback answer', () => {
      const c = makeCase('CA', 'CA-ON', typedAnswers, rawFacts)
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { ...typedAnswers },
        callA: { facts: rawFacts, missing: [] },
        check: { rows: {} },
      }
      setRow(ctx, 'age', 60, 'corrected', { user: 60, doc: 57 }) // change_ack is false
      setRow(ctx, 'pay', 150000, 'corrected', { user: 150000, doc: 112500 }) // change_ack is false

      const { minimum } = buildMinimumAndRange(c, ctx, on)
      expect(minimum.inputs).toEqual({ years: 12, pay: 80000, age: 45 })
    })

    it('acknowledged corrected value (change_ack: true) and confirmed rows ARE used', () => {
      const c = makeCase('CA', 'CA-ON', typedAnswers, rawFacts)
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { ...typedAnswers },
        callA: { facts: rawFacts, missing: [] },
        check: { rows: {} },
      }
      setRow(ctx, 'age', 60, 'corrected', { user: 60, doc: 57 })
      ctx.check.rows.age.change_ack = true
      setRow(ctx, 'pay', 112500, 'confirmed')
      setRow(ctx, 'contract_start', '2011-08-22', 'confirmed')
      setRow(ctx, 'last_day', '2026-03-31', 'confirmed')

      // Confirmed contract dates yield 14.6 years (1 decimal) even when years row itself isn't set
      const { minimum, range } = buildMinimumAndRange(c, ctx, on)
      expect(minimum.inputs).toEqual({ years: 14.6, pay: 112500, age: 60 })
      expect(range!.inputs).toEqual({ years: 14.6, pay: 112500, age: 60 })
    })
  })

  describe('Post-Push Audit Additions (B4.1 empty-string edge case & B4.2 US release box)', () => {
    const ny = buildJurisdiction('US-NY')!
    const baseUsReport = (release_check: any): ReportJson => ({
      cover: { name_line: 'Jordan Lee', role_line: 'Analyst · 5 years', place_line: 'New York' },
      glance: 'Your employer offered $15,000 for a release.',
      confirmed_line: 'Confirmed facts',
      checks: [],
      release_check,
      myths: [],
      clauses: [],
      questions: [],
      next_steps: [],
      citations_used: [],
    })
    const makeUsMeta = (answers: Record<string, any>, alreadySigned = false): RenderMeta => ({
      reportId: 'RPT-AUDIT-B42',
      jurisdiction: ny,
      sources: [],
      rulesAsOf: '2026-10-01',
      attestedAt: '2026-10-15T12:00:00Z',
      generatedAt: '2026-10-15T12:05:00Z',
      answers: { ...answers, signed_yet: alreadySigned ? 'yes' : 'no' },
      numbers: {
        country: 'US',
        minimum: { amount: null, weeks: null, none: true },
        range: null,
        offer: 15000,
        gauge: null,
        factorValues: { service: '5 years' },
      },
    })

    it('B4.1: empty signed_yet does not shadow signed="no"', () => {
      const c = makeCase('US', 'US-NY', { state: 'NY', age: 45, years: 5, salary: 100000, signed_yet: '', signed: 'no' })
      expect(answersForPrompt(c, ny).signed_yet).toBe('no')
    })

    it('B4.2.1: release box displays actual release_check points joined with middle dot', () => {
      const rep = baseUsReport([
        { status: 'info', point: 'General release clause', detail: 'Covers employment claims.', source_id: null },
        { status: 'ask', point: 'Attorney review term', detail: 'Encourages consulting counsel.', source_id: null },
      ])
      const sec = reportSections(rep, makeUsMeta({ age: 45, adea_waiver: true, others: 'me' })).find((s) => s.id === 's1_release')!
      expect(sec.html).toContain('General release clause · Attorney review term')
    })

    it('B4.2.2–4: no 21-day, 45-day, or 7-day revocation period is invented when absent from release_check', () => {
      const rep = baseUsReport([
        { status: 'info', point: 'Agreement signed or under review', detail: 'No federal waiting period stated.', source_id: null },
      ])
      const indivHtml = reportSections(rep, makeUsMeta({ age: 45, adea_waiver: true, others: 'me' })).find((s) => s.id === 's1_release')!.html
      expect(indivHtml).not.toContain('21 days')
      expect(indivHtml).not.toContain('45 days')
      expect(indivHtml).not.toContain('7 days after signing')
      expect(indivHtml).not.toContain('revocation-panel')

      const groupHtml = reportSections(rep, makeUsMeta({ age: 45, adea_waiver: true, others: 'few', group_program: true })).find((s) => s.id === 's1_release')!.html
      expect(groupHtml).not.toContain('21 days')
      expect(groupHtml).not.toContain('45 days')
      expect(groupHtml).not.toContain('7 days after signing')
      expect(groupHtml).not.toContain('revocation-panel')
    })

    it('B4.2.5: existing consideration and revocation periods are displayed when present in release_check', () => {
      const repIndiv = baseUsReport([
        { status: 'ok', point: '21 days to consider', detail: 'Agreement gives 21 days for individual separation.', source_id: null },
        { status: 'ok', point: '7-day revocation right', detail: '7 days after signing to revoke under OWBPA.', source_id: null },
      ])
      const indivHtml = reportSections(repIndiv, makeUsMeta({ age: 45, adea_waiver: true, others: 'me' })).find((s) => s.id === 's1_release')!.html
      expect(indivHtml).toContain('<div class="feature-card-amount">21 days</div>')
      expect(indivHtml).toContain('class="revocation-panel"')
      expect(indivHtml).toContain('7 days after signing')
      expect(indivHtml).toContain('21 days to consider · 7-day revocation right')

      const repGroup = baseUsReport([
        { status: 'ok', point: '45 days to consider', detail: 'Agreement gives 45 days for group layoff program.', source_id: null },
        { status: 'ok', point: '7-day revocation right', detail: '7 days after signing to revoke.', source_id: null },
      ])
      const groupHtml = reportSections(repGroup, makeUsMeta({ age: 52, adea_waiver: true, others: 'few', group_program: true, disclosures_complete: true })).find((s) => s.id === 's1_release')!.html
      expect(groupHtml).toContain('<div class="feature-card-amount">45 days</div>')
      expect(groupHtml).toContain('class="revocation-panel"')
      expect(groupHtml).toContain('45 days to consider · 7-day revocation right')
    })

    it('B4.2.6: null, missing, empty, or incomplete-point release_check never crashes or invents periods', () => {
      for (const rc of [undefined, null, [], [{ status: 'info', point: '', detail: 'No deadline given.' }], [{ status: 'info', detail: 'Missing point key' }]]) {
        const rep = baseUsReport(rc)
        const html = renderReportHtml(rep, makeUsMeta({ age: 50, adea_waiver: true, group_program: true }))
        expect(html).not.toContain('<div class="feature-card-amount">21 days</div>')
        expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
        expect(html).not.toContain('7 days after signing')
        expect(html).not.toContain('class="revocation-panel"')
      }
    })

    it('B4.2.7: signed vs unsigned, under-40, unknown-age, and individual vs group stay consistent without fabricated periods', () => {
      const repNoPeriods = baseUsReport([
        { status: 'info', point: 'General waiver of claims', detail: 'Agreement includes release language.', source_id: null },
      ])
      for (const ans of [
        { age: 30, adea_waiver: true, others: 'me' },
        { age: 'unknown', adea_waiver: true, others: 'few', group_program: 'unknown', days_to_decide: 10 },
        { age: 45, adea_waiver: true, others: 'few', group_program: 'unknown', days_to_decide: 10 },
        { age: 45, adea_waiver: true, others: 'me' },
        { age: 45, adea_waiver: true, others: 'few', group_program: true },
      ]) {
        for (const signedFlag of [false, true]) {
          const fullHtml = renderReportHtml({ ...repNoPeriods, already_signed: signedFlag }, makeUsMeta(ans, signedFlag))
          expect(fullHtml).not.toContain('21 days')
          expect(fullHtml).not.toContain('45 days')
          expect(fullHtml).not.toContain('7 days after signing')
          expect(fullHtml).toContain(signedFlag ? "You've already signed" : "don't have to sign")
          if (signedFlag) expect(fullHtml).not.toContain("You don't have to sign today")
          else expect(fullHtml).not.toContain("You've already signed")
        }
      }
    })
  })
})
