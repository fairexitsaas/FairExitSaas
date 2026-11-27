import { describe, it, expect, vi } from 'vitest'
import {
  PROMPT_VERSION,
  promptSha256,
  systemPromptCallA,
  systemPromptCallB,
} from '../../src/fairexit/prompts'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { sourcesFor } from '../../src/fairexit/regionData'
import {
  buildModel,
  autoConfirmAll,
  exportConfirmedFacts,
  setRow,
  CheckCtx,
} from '../../src/fairexit/checkPage'
import { buildCallBInput, buildMinimumAndRange } from '../../src/fairexit/reportInputs'
import {
  validateShape,
  ruleWarnings,
  allowedAmounts,
  renderReportHtml,
  reportNumbers,
  ReportJson,
  RenderMeta,
} from '../../src/fairexit/reportOutput'
import * as severanceRules from '../../src/fairexit/severanceRules'
import type { CaseRow } from '../../src/fairexit/types'

function makeCase(country: 'CA' | 'US', jCode: string, answers: Record<string, any>, facts: any[]): CaseRow {
  return {
    id: 'case-r3-test',
    country,
    jurisdiction_code: jCode,
    answers,
    call_a: { facts },
    call_a2: {},
    documents: [],
  } as unknown as CaseRow
}

describe('Round 3 B1: report prompt v0.9', () => {
  it('loads verbatim report-prompt-v0.9.txt across all AI calls and strips NOTES FOR THE SITE', () => {
    expect(PROMPT_VERSION).toBe('v0.9')
    const expectedHash = 'ba2a7a622ff2b67a620f7ac5c7192c68c8852dbe116d5e683873ab5391cee038'
    expect(promptSha256('A1')).toBe(expectedHash)
    expect(promptSha256('A2')).toBe(expectedHash)
    expect(promptSha256('B')).toBe(expectedHash)

    const callA = systemPromptCallA(buildJurisdiction('CA-ON')!)
    const callB = systemPromptCallB()
    expect(callA).toContain('bonus_history')
    expect(callB).toContain('rules_as_of')
    expect(callB).toContain('payments')
    expect(callB).not.toContain('=== NOTES FOR THE SITE')
  })
})

describe('Round 3 B2: confirmed values, Ontario payroll/severance, weeksWorked=0, inputs & warn', () => {
  it('computes Ontario legal minimum (~$48,894), ESA severance ($31,370), termination pay ($17,308), and 0 working notice from confirmed document values despite stale typed answers', () => {
    const j = buildJurisdiction('CA-ON')!
    const answers = {
      province: 'ON',
      age: 45,
      years: 12,
      salary: 112500,
      payroll: 'unsure',
      working_notice_weeks: 2,
    }
    const facts = [
      {
        key: 'contract_start',
        value: '2011-08-22',
        quote: 'Start Date: August 22, 2011',
        where: 'Employment Contract, page 1',
        document: 'contract',
      },
      {
        key: 'last_day',
        value: '2026-03-31',
        quote: 'Last day of employment: March 31, 2026',
        where: 'Termination letter, page 1',
        document: 'letter',
      },
      {
        key: 'age',
        value: 57,
        quote: '57 years old',
        where: 'Personnel record',
        document: 'letter',
      },
      {
        key: 'annual_pay',
        value: 112500,
        quote: 'annual salary of $112,500',
        where: 'Termination letter, page 1',
        document: 'letter',
      },
      {
        key: 'notice_weeks',
        value: 8,
        quote: '8 weeks termination pay ($17,308)',
        where: 'Termination letter, page 2',
        document: 'letter',
      },
      {
        key: 'severance_weeks',
        value: 14.5,
        quote: '14.5 weeks statutory severance ($31,370)',
        where: 'Termination letter, page 2',
        document: 'letter',
      },
      {
        key: 'offer_amount',
        value: 48678,
        quote: 'Total statutory pay of $48,678',
        where: 'Termination letter, page 2',
        document: 'letter',
      },
    ]

    const c = makeCase('CA', 'CA-ON', answers, facts)
    const ctx: CheckCtx = {
      country: 'CA',
      jurisdiction: j,
      answers,
      callA: { facts },
      check: { rows: {} },
    } as CheckCtx

    buildModel(ctx)
    setRow(ctx, 'age', 57, 'confirmed')
    setRow(ctx, 'years', 14.6, 'confirmed')
    autoConfirmAll(ctx)
    setRow(ctx, 'working_notice_weeks', 0, 'confirmed')
    const confirmed = exportConfirmedFacts(ctx)

    expect(confirmed.rows.age?.value).toBe(57)
    expect(Number(confirmed.rows.years?.value)).toBeCloseTo(14.6, 1)

    const calc = buildMinimumAndRange(c, ctx, j)
    expect(calc.minimum).toBeTruthy()
    expect(calc.range).toBeTruthy()

    const weeklyPay = 112500 / 52
    const expectedMin = Math.round((8 + 14.6) * weeklyPay)
    expect(expectedMin).toBe(48894)
    expect(calc.minimum!.amount).toBe(48894)
    expect(calc.minimum!.terminationWeeks).toBe(8)
    expect(calc.minimum!.severanceWeeks).toBeCloseTo(14.6, 1)
    expect(calc.minimum!.working_notice_weeks).toBe(0)
    expect(calc.minimum!.inputs).toEqual({ years: 14.6, pay: 112500, age: 57 })
    expect(calc.range!.inputs).toEqual({ years: 14.6, pay: 112500, age: 57 })

    const est = severanceRules.estimate('CA-ON', {
      years: 14.6,
      salary: 112500,
      age: 57,
      payrollGlobal: 2500000,
      payrollUnknown: false,
      weeksWorked: 0,
    })
    expect(calc.range!.low).toBe(est.commonLaw!.lowAmount)
    expect(calc.range!.high).toBe(est.commonLaw!.highAmount)

    const { input: callB } = buildCallBInput(c, ctx) as any
    expect(callB.minimum.amount).toBe(48894)
    expect(callB.minimum.working_notice_weeks).toBe(0)
    expect(callB.minimum.inputs).toEqual({ years: 14.6, pay: 112500, age: 57 })
    expect(callB.range.inputs).toEqual({ years: 14.6, pay: 112500, age: 57 })
  })

  it('passes potential severance through for Ontario when payroll is unknown and letter does not pay ESA severance', () => {
    const j = buildJurisdiction('CA-ON')!
    const answers = {
      province: 'ON',
      age: 50,
      years: 10,
      salary: 104000,
      payroll: 'unsure',
      working_notice_weeks: 0,
    }
    const c = makeCase('CA', 'CA-ON', answers, [])
    const ctx: CheckCtx = {
      country: 'CA',
      jurisdiction: j,
      answers,
      callA: { facts: [] },
      check: { rows: {} },
    } as CheckCtx
    buildModel(ctx)
    autoConfirmAll(ctx)
    const { minimum } = buildMinimumAndRange(c, ctx, j)
    expect(minimum).toBeTruthy()
    expect(minimum!.potentialSeveranceWeeks).toBe(10)
    expect(minimum!.potentialSeveranceAmount).toBe(20000)
    expect(minimum!.severanceMaybe).toEqual({
      weeks: 10,
      amount: 20000,
      message: 'may apply, up to 10 wks ($20,000)',
    })
    expect(minimum!.potentialSeveranceMessage).toContain('$20,000')
  })

  it('forwards US WARN warning on minimum.warn when returned by the estimator without inventing one when absent', () => {
    const j = buildJurisdiction('US-NY')!
    const answers = {
      state: 'NY',
      age: 42,
      years: 6,
      salary: 100000,
      company_size: '50_plus',
      groupLayoff: 'yes',
      groupSize: 75,
      advance_notice: 0,
    }
    const c = makeCase('US', 'US-NY', answers, [])
    const ctx: CheckCtx = {
      country: 'US',
      jurisdiction: j,
      answers,
      callA: { facts: [] },
      check: { rows: {} },
    } as CheckCtx
    buildModel(ctx)
    autoConfirmAll(ctx)

    // Without warn on estimate result, nothing is fabricated
    const plain = buildMinimumAndRange(c, ctx, j)
    expect(plain.minimum).toBeTruthy()
    expect(plain.minimum!.warn).toBeUndefined()
    expect(plain.minimum!.inputs).toEqual({ years: 6, pay: 100000, age: 42 })

    // When estimator returns est.warn, forward it on minimum.warn
    const realEst = severanceRules.estimate('US-NY', { years: 6, salary: 100000, age: 42 })
    const spy = vi.spyOn(severanceRules, 'estimate').mockReturnValueOnce({
      ...realEst,
      warn: {
        statute: 'Federal WARN Act',
        requiredDays: 60,
        backPayMaxAmount: 16438,
      },
    })
    try {
      const withWarn = buildMinimumAndRange(c, ctx, j)
      expect(withWarn.minimum!.warn).toEqual({
        statute: 'Federal WARN Act',
        requiredDays: 60,
        backPayMaxAmount: 16438,
      })
    } finally {
      spy.mockRestore()
    }
  })
})

describe('Round 3 B3: clauses what_it_means, engine range amounts, payments block, rules_as_of, multi-row payment_items', () => {
  it('supports multiple payment_items rows on check page without overwriting', () => {
    const j = buildJurisdiction('CA-ON')!
    const ctx: CheckCtx = {
      country: 'CA',
      jurisdiction: j,
      answers: { province: 'ON', age: 57, years: 14.6, salary: 112500 },
      callA: {
        facts: [
          {
            key: 'payment_items',
            value: '8 weeks termination pay ($17,308)',
            quote: '8 weeks termination pay of $17,308',
            where: 'Letter p.2',
            document: 'letter',
          },
          {
            key: 'payment_items',
            value: '14.5 weeks statutory severance ($31,370)',
            quote: '14.5 weeks severance pay of $31,370',
            where: 'Letter p.2',
            document: 'letter',
          },
          {
            key: 'payment_items',
            value: '$5,000 lump sum if you sign',
            quote: 'additional $5,000 conditional upon signing',
            where: 'Letter p.2',
            document: 'letter',
          },
        ],
      },
      check: { rows: {} },
    } as CheckCtx

    const model = buildModel(ctx)
    const allRows = model.groups.flatMap((g) => g.rows)
    const payRows = allRows.filter((r) => r.key.startsWith('payment_items_'))
    expect(payRows.length).toBe(3)
    expect(payRows.map((r) => r.value)).toEqual([
      '8 weeks termination pay ($17,308)',
      '14.5 weeks statutory severance ($31,370)',
      '$5,000 lump sum if you sign',
    ])

    const exported = exportConfirmedFacts(ctx)
    expect(exported.rows['payment_items_1']?.value).toContain('$17,308')
    expect(exported.rows['payment_items_2']?.value).toContain('$31,370')
    expect(exported.rows['payment_items_3']?.value).toContain('$5,000')
  })

  it('renders each clause what_it_means, uses engine lowAmount/highAmount directly, renders optional payments & rules_as_of safely', () => {
    const j = buildJurisdiction('CA-ON')!
    const verifiedSources = sourcesFor(j)
    const reportWithV09: ReportJson = {
      rules_as_of: 'April 2026',
      cover: {
        title: 'Severance Review for Maple Logistics Inc.',
        prepared_for: 'Prepared for Client',
        summary: 'Review of your termination offer in Ontario.',
      },
      glance: {
        offer_amount: 48678,
        offer_weeks: 22.5,
        minimum_amount: 48894,
        minimum_weeks: 22.6,
        range_low: 103125,
        range_high: 140625,
        range_months: '11-15',
        headline: 'You are being offered $48,678 regardless, plus $5,000 if you sign.',
      },
      confirmed_line: 'Age 57 · 14.6 years of service · $112,500/year',
      payments: {
        unconditional: [
          { label: 'Termination pay (8 weeks)', amount: 17308, note: 'Paid even if you do not sign' },
          { label: 'ESA severance pay (14.5 weeks)', amount: 31370, note: 'Paid even if you do not sign' },
        ],
        total_unconditional: 48678,
        conditional: [{ label: 'Additional lump sum', amount: 5000, note: 'Only if you sign the release' }],
        total_if_signed: 5000,
      },
      checks: [
        {
          id: 'release',
          title: 'Release date check',
          status: 'watch',
          why: 'Signing early waives your right to claim additional common-law notice.',
          detail: 'Review deadline applies.',
        },
      ],
      clauses: [
        {
          title: 'Non-disparagement',
          what_it_says: 'You agree not to speak negatively about the company.',
          what_it_means: 'Covers what you say publicly or privately about the company.',
          question_to_ask: 'Does this stop you from talking about your experience?',
          status: 'watch',
        },
        {
          title: 'Confidentiality',
          what_it_says: 'You must keep the terms of this package confidential.',
          what_it_means: 'You cannot share settlement amounts except with advisers or family.',
          question_to_ask: 'Are family and legal advisers carved out?',
          status: 'ok',
        },
      ],
      myths: [],
      questions: ['Can the deadline be extended?'],
      next_steps: ['Consult an Ontario employment lawyer before signing.'],
      citations_used: verifiedSources.slice(0, 1).map((s) => s.id),
    } as unknown as ReportJson

    const shaped = validateShape(reportWithV09)
    expect(shaped.ok).toBe(true)

    const input: any = {
      jurisdiction: j,
      answers: { age: 57, years: 14.6, salary: 112500, employer_name: 'Maple Logistics Inc.', working_notice_weeks: 0 },
      minimum: {
        amount: 48894,
        weeks: 22.6,
        terminationWeeks: 8,
        severanceWeeks: 14.6,
        inputs: { years: 14.6, pay: 112500, age: 57 },
      },
      range: {
        low: 103125,
        high: 140625,
        lowMonths: 11,
        highMonths: 15,
        inputs: { years: 14.6, pay: 112500, age: 57 },
      },
      payments: reportWithV09.payments,
      confirmed_facts: {
        rows: {
          age: { value: 57 },
          years: { value: 14.6 },
          annual_pay: { value: 112500 },
          offer_amount: { value: 48678 },
          employer_name: { value: 'Maple Logistics Inc.' },
          payment_items_1: { value: 'Termination pay $17,308' },
          payment_items_2: { value: 'ESA severance $31,370' },
          payment_items_3: { value: '$5,000 additional lump sum if you sign' },
        },
      },
      sources: verifiedSources,
    }

    const allow = allowedAmounts(input)
    expect(ruleWarnings(reportWithV09, verifiedSources.map((s) => s.id), allow)).toEqual([])
    const meta: RenderMeta = {
      reportId: 'RPT-TEST01',
      jurisdiction: j,
      sources: verifiedSources,
      rulesAsOf: reportWithV09.rules_as_of || null,
      attestedAt: '2026-04-01T00:00:00Z',
      generatedAt: '2026-04-01T00:00:00Z',
      numbers: reportNumbers(input),
      answers: input.answers,
      input,
    }
    const html = renderReportHtml(reportWithV09, meta)

    // B3.1: each clause shows its own what_it_means
    expect(html).toContain('Covers what you say publicly or privately about the company.')
    expect(html).toContain('You cannot share settlement amounts except with advisers or family.')
    // B3.2: exact engine lowAmount & highAmount displayed directly
    expect(html).toContain('$103,125')
    expect(html).toContain('$140,625')
    // B3.3: confirmed service & minimum shown, no "2 weeks you worked"
    expect(html).toContain('14.6')
    expect(html).toContain('$48,894')
    expect(html).not.toContain('2 weeks you worked')
    // B3.4: payments block + rules_as_of shown when present
    expect(html).toContain('Termination pay (8 weeks)')
    expect(html).toContain('Additional lump sum')
    expect(html).toContain('April 2026')

    // Optional fields absent: omits rules_as_of and payments block safely without fabricated dates
    const minimalReport: ReportJson = {
      ...(reportWithV09 as any),
      rules_as_of: undefined,
      payments: undefined,
    }
    expect(validateShape(minimalReport).ok).toBe(true)
    const htmlNoOptional = renderReportHtml(minimalReport, { ...meta, rulesAsOf: null })
    expect(htmlNoOptional).not.toContain('April 2026')
    expect(htmlNoOptional).not.toContain('Paid either way')
    expect(allow.includes(48894)).toBe(true)
  })
})
