/**
 * FairExit rules engine, server copy.
 *
 * A line-for-line TypeScript port of the client's resource-hub-v2/severance-rules.js v0.4.0
 * (LAST_UPDATED 2026-11-06). The client says "just replace your copy of the file", so when a
 * new version arrives, port the RULES table and strategies again and bump RULES_VERSION.
 * tests/unit/severanceRules.test.ts checks this port against the original JS file.
 *
 * Two kinds of numbers, kept strictly separate:
 *   statutory  the legal MINIMUM (deterministic, per jurisdiction)
 *   commonLaw  "reasonable notice" (Canada only), an ESTIMATE shown as a range
 */

export const RULES_VERSION = '0.4.0'
export const RULES_LAST_UPDATED = '2026-11-06'

export interface TableRow {
  minYears: number
  weeks: number
}

export interface Rule {
  code: string
  country: 'CA' | 'US'
  name: string
  status: 'live' | 'ready' | 'planned'
  commonLaw: boolean
  strategy: 'ontario' | 'weeksTable' | 'federalCA' | 'usNone' | 'usPerYear' | null
  terminationTable?: TableRow[]
  severance?: { minYears: number; minPayrollGlobal: number; perYearWeeks: number; maxWeeks: number }
  perYearWeeks?: number
  intake: string[]
  note: string
}

export interface StrategyResult {
  terminationWeeks: number
  severanceWeeks: number
  weeks: number
  exact: boolean
  none?: boolean
  individualNoticeWeeks?: number
  groupWeeks?: number
  appliedNoticeWeeks?: number
  potentialSeveranceWeeks?: number
  potentialSeveranceAmount?: number
  potentialSeveranceMessage?: string
  conditionalGroupNoticeWeeks?: number
  conditionalGroupNoticeAmount?: number
  conditionalGroupMessage?: string
}

export interface EstimateInput {
  age?: number
  years?: number
  salary?: number
  roleFactor?: number
  payrollGlobal?: number
  payrollUnknown?: boolean
  groupLayoff?: boolean
  groupSize?: number
  workforceQuarter?: 'yes' | 'no' | 'unsure' | boolean
  workforce?: number
  offered?: number
}

export interface Estimate {
  code: string
  name: string
  country: 'CA' | 'US'
  status: 'live' | 'ready' | 'planned'
  live: boolean
  commonLawApplies: boolean
  weekly: number
  monthly: number
  statutory: {
    weeks: number
    terminationWeeks: number
    severanceWeeks: number
    amount: number
    exact: boolean
    none?: boolean
    individualNoticeWeeks?: number
    groupWeeks?: number
    appliedNoticeWeeks?: number
    potentialSeveranceWeeks?: number
    potentialSeveranceAmount?: number
    potentialSeveranceMessage?: string
    conditionalGroupNoticeWeeks?: number
    conditionalGroupNoticeAmount?: number
    conditionalGroupMessage?: string
  } | null
  commonLaw: {
    lowMonths: number
    highMonths: number
    lowAmount: number
    highAmount: number
  } | null
  note: string
}

function weeksFromTable(table: TableRow[] = [], years: number): number {
  let w = 0
  for (let i = 0; i < table.length; i++) {
    if (years >= table[i].minYears) w = table[i].weeks
  }
  return w
}

function groupNoticeWeeks(
  code: string,
  groupSize: number,
  quarter?: string | boolean,
  workforce?: number
): { weeks: number; conditional: boolean; addedOnTop: boolean; ministerOnly: boolean } {
  const isQuarter = quarter === 'yes' || quarter === true || (workforce && groupSize && (groupSize / workforce) >= 0.25)
  switch (code) {
    case 'CA-ON': {
      let w = 0
      if (groupSize >= 500) w = 16
      else if (groupSize >= 200) w = 12
      else if (groupSize >= 50) w = 8
      return { weeks: w, conditional: false, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-BC': {
      let w = 0
      if (groupSize >= 301) w = 16
      else if (groupSize >= 101) w = 12
      else if (groupSize >= 50) w = 8
      return { weeks: w, conditional: false, addedOnTop: true, ministerOnly: false }
    }
    case 'CA-AB': {
      return { weeks: 0, conditional: false, addedOnTop: false, ministerOnly: true }
    }
    case 'CA-SK': {
      let w = 0
      if (groupSize >= 100) w = 12
      else if (groupSize >= 50) w = 8
      else if (groupSize >= 25) w = 4
      return { weeks: w, conditional: true, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-MB': {
      let w = 0
      if (groupSize >= 300) w = 18
      else if (groupSize >= 101) w = 14
      else if (groupSize >= 50) w = 10
      return { weeks: w, conditional: false, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-NS': {
      let w = 0
      if (groupSize >= 300) w = 16
      else if (groupSize >= 100) w = 12
      else if (groupSize >= 10) w = 8
      return { weeks: w, conditional: false, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-NB': {
      let w = 0
      if (groupSize >= 10 && isQuarter) w = 6
      return { weeks: w, conditional: true, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-PE': {
      let w = 0
      if (groupSize >= 10 && isQuarter) w = 6
      return { weeks: w, conditional: false, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-NL': {
      let w = 0
      if (groupSize >= 500) w = 16
      else if (groupSize >= 200) w = 12
      else if (groupSize >= 50) w = 8
      return { weeks: w, conditional: false, addedOnTop: false, ministerOnly: false }
    }
    case 'CA-FED': {
      return { weeks: 0, conditional: false, addedOnTop: false, ministerOnly: true }
    }
    default:
      return { weeks: 0, conditional: false, addedOnTop: false, ministerOnly: false }
  }
}

const STRATEGY = {
  ontario: (rule: Rule, inp: EstimateInput, weekly: number): StrategyResult => {
    const ind = weeksFromTable(rule.terminationTable, inp.years || 0)
    const gn = inp.groupLayoff ? groupNoticeWeeks(rule.code, inp.groupSize || 0, inp.workforceQuarter, inp.workforce) : { weeks: 0, conditional: false, addedOnTop: false, ministerOnly: false }
    const appliedNotice = Math.max(ind, gn.weeks || 0)

    let sev = 0
    let potSevWeeks = 0
    const s = rule.severance
    const years = inp.years || 0
    if (s && years >= s.minYears) {
      if ((inp.payrollGlobal || 0) >= s.minPayrollGlobal) {
        sev = Math.min(s.maxWeeks, years * s.perYearWeeks)
      } else if (inp.payrollUnknown) {
        potSevWeeks = Math.min(s.maxWeeks, years * s.perYearWeeks)
      }
    }

    const potSevAmount = potSevWeeks > 0 ? Math.round(weekly * potSevWeeks) : undefined
    const potSevMsg = potSevWeeks > 0 ? `may apply, up to ${potSevWeeks} wks ($${potSevAmount!.toLocaleString('en-CA')})` : undefined

    const res: StrategyResult = {
      individualNoticeWeeks: ind,
      groupWeeks: gn.weeks || 0,
      appliedNoticeWeeks: appliedNotice,
      terminationWeeks: appliedNotice,
      severanceWeeks: sev,
      weeks: appliedNotice + sev,
      exact: true,
    }
    if (potSevWeeks > 0) {
      res.potentialSeveranceWeeks = potSevWeeks
      res.potentialSeveranceAmount = potSevAmount
      res.potentialSeveranceMessage = potSevMsg
    }
    return res
  },

  weeksTable: (rule: Rule, inp: EstimateInput, weekly: number): StrategyResult => {
    const ind = weeksFromTable(rule.terminationTable, inp.years || 0)
    const gn = inp.groupLayoff ? groupNoticeWeeks(rule.code, inp.groupSize || 0, inp.workforceQuarter, inp.workforce) : { weeks: 0, conditional: false, addedOnTop: false, ministerOnly: false }
    let appliedNotice = ind
    let condWeeks: number | undefined
    let condAmount: number | undefined
    let condMsg: string | undefined

    if (gn.weeks > 0) {
      if (gn.addedOnTop) {
        appliedNotice = ind + gn.weeks
      } else if (gn.conditional) {
        appliedNotice = ind
        if (gn.weeks > ind) {
          condWeeks = gn.weeks - ind
          condAmount = Math.round(weekly * condWeeks)
          condMsg = `may add ${condWeeks} wks ($${condAmount.toLocaleString('en-CA')}), ask a lawyer`
        }
      } else {
        appliedNotice = Math.max(ind, gn.weeks)
      }
    }

    const res: StrategyResult = {
      individualNoticeWeeks: ind,
      groupWeeks: gn.weeks || 0,
      appliedNoticeWeeks: appliedNotice,
      terminationWeeks: appliedNotice,
      severanceWeeks: 0,
      weeks: appliedNotice,
      exact: true,
    }
    if (condWeeks !== undefined) {
      res.conditionalGroupNoticeWeeks = condWeeks
      res.conditionalGroupNoticeAmount = condAmount
      res.conditionalGroupMessage = condMsg
    }
    return res
  },

  federalCA: (rule: Rule, inp: EstimateInput): StrategyResult => {
    const ind = weeksFromTable(rule.terminationTable, inp.years || 0)
    let sev = 0
    const years = inp.years || 0
    if (years >= 1) {
      sev = Math.max(5, 2 * Math.floor(years)) / 5
    }
    return {
      individualNoticeWeeks: ind,
      groupWeeks: 0,
      appliedNoticeWeeks: ind,
      terminationWeeks: ind,
      severanceWeeks: sev,
      weeks: ind + sev,
      exact: true,
    }
  },

  usNone: (): StrategyResult => {
    return { terminationWeeks: 0, severanceWeeks: 0, weeks: 0, exact: true, none: true }
  },

  usPerYear: (rule: Rule, inp: EstimateInput): StrategyResult => {
    const w = Math.floor(inp.years || 0) * (rule.perYearWeeks || 1)
    return { terminationWeeks: 0, severanceWeeks: w, weeks: w, exact: true }
  },
}

export function commonLawMonths(inp: { age?: number; years?: number; roleFactor?: number }) {
  let m = (inp.years || 0) * 1.0
  const age = inp.age || 0
  if (age >= 55) m += 3
  else if (age >= 50) m += 2
  else if (age >= 45) m += 1
  m *= inp.roleFactor || 1
  m = Math.min(24, m)
  const low = Math.max(1, Math.round(m * 0.8))
  let high = Math.min(24, Math.round(m * 1.15))
  if (high < low) high = low
  return { lowMonths: low, highMonths: high }
}

function stub(code: string, name: string): Rule {
  return {
    code, country: 'CA', name, status: 'planned', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 5, weeks: 5 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Statutory table TBD — structurally similar to BC/AB. Placeholder until verified.',
  }
}

export const RULES: Record<string, Rule> = {
  'CA-ON': {
    code: 'CA-ON', country: 'CA', name: 'Ontario', status: 'live', commonLaw: true, strategy: 'ontario',
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    severance: { minYears: 5, minPayrollGlobal: 2500000, perYearWeeks: 1, maxWeeks: 26 },
    intake: ['age', 'years', 'salary', 'role', 'payrollGlobal'],
    note: 'Termination pay (max 8 wks) + severance pay (max 26 wks) if 5+ yrs AND GLOBAL payroll ≥ $2.5M (Hawkes v. Max Aicher). Common law up to ~24 mo.',
  },
  'CA-BC': {
    code: 'CA-BC', country: 'CA', name: 'British Columbia', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'ESA compensation for length of service, max 8 wks. No separate severance category. Common law applies.',
  },
  'CA-AB': {
    code: 'CA-AB', country: 'CA', name: 'Alberta', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.247, weeks: 1 },
      { minYears: 2, weeks: 2 },
      { minYears: 4, weeks: 4 },
      { minYears: 6, weeks: 5 },
      { minYears: 8, weeks: 6 },
      { minYears: 10, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Employment Standards Code termination pay, max 8 wks. No separate severance. Common law applies.',
  },
  'CA-FED': {
    code: 'CA-FED', country: 'CA', name: 'Federally regulated (banks, telecom, air, rail)', status: 'live', commonLaw: true, strategy: 'federalCA',
    terminationTable: [
      { minYears: 0.25, weeks: 2 },
      { minYears: 3, weeks: 3 },
      { minYears: 4, weeks: 4 },
      { minYears: 5, weeks: 5 },
      { minYears: 6, weeks: 6 },
      { minYears: 7, weeks: 7 },
      { minYears: 8, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role', 'federalRegulated'],
    note: 'Canada Labour Code: graduated notice (up to 8 wks, 2024) + severance = greater of 2 days/yr or 5 days, after 12 mo. Common law applies.',
  },
  'CA-QC': {
    code: 'CA-QC', country: 'CA', name: 'Quebec', status: 'planned', commonLaw: false, strategy: null,
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Civil-law regime; enhanced unjust-dismissal recourse after 2 yrs. NOT common-law — build separately.',
  },
  'CA-MB': {
    code: 'CA-MB', country: 'CA', name: 'Manitoba', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.082, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 3, weeks: 4 },
      { minYears: 5, weeks: 6 },
      { minYears: 10, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Employment Standards Code s.61: notice from 30 days, max 8 wks. Common law applies.',
  },
  'CA-SK': {
    code: 'CA-SK', country: 'CA', name: 'Saskatchewan', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.2501, weeks: 1 },
      { minYears: 1.0001, weeks: 2 },
      { minYears: 3.0001, weeks: 4 },
      { minYears: 5.0001, weeks: 6 },
      { minYears: 10.0001, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'SEA s.2-60: notice after MORE THAN 13 wks / 1 / 3 / 5 / 10 yrs, max 8 wks. Common law applies.',
  },
  'CA-NS': {
    code: 'CA-NS', country: 'CA', name: 'Nova Scotia', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 2, weeks: 2 },
      { minYears: 5, weeks: 4 },
      { minYears: 10, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Labour Standards Code s.72: notice from 3 months, max 8 wks. Common law applies.',
  },
  'CA-NB': {
    code: 'CA-NB', country: 'CA', name: 'New Brunswick', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.5, weeks: 2 },
      { minYears: 5, weeks: 4 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'ESA s.30: 2 wks from 6 months, 4 wks from 5 yrs (max). Common law applies.',
  },
  'CA-PE': {
    code: 'CA-PE', country: 'CA', name: 'Prince Edward Island', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.247, weeks: 1 },
      { minYears: 1, weeks: 2 },
      { minYears: 5, weeks: 4 },
      { minYears: 10, weeks: 6 },
      { minYears: 15, weeks: 8 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'New ESA (in force June 30, 2026) s.59: notice from 90 days, max 8 wks. Terminations before that date used the old Act. Common law applies.',
  },
  'CA-NL': {
    code: 'CA-NL', country: 'CA', name: 'Newfoundland and Labrador', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [
      { minYears: 0.25, weeks: 1 },
      { minYears: 2, weeks: 2 },
      { minYears: 5, weeks: 3 },
      { minYears: 10, weeks: 4 },
      { minYears: 15, weeks: 6 },
    ],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Labour Standards Act s.55: notice from 3 months, max 6 wks. Common law applies.',
  },
  'CA-NT': stub('CA-NT', 'Northwest Territories'),
  'CA-YT': stub('CA-YT', 'Yukon'),
  'CA-NU': stub('CA-NU', 'Nunavut'),

  /* -------- United States (at-will; no federal statutory severance) -------- */
  'US-FED': {
    code: 'US-FED', country: 'US', name: 'United States (federal baseline)', status: 'planned', commonLaw: false,
    strategy: 'usNone', intake: ['headcount', 'layoffType', 'state', 'contract'],
    note: "No federal severance mandate. At-will. WARN Act = 60 days' NOTICE (or pay in lieu) for mass layoffs at 100+ employee employers. Severance is contractual.",
  },
  'US-NJ': {
    code: 'US-NJ', country: 'US', name: 'New Jersey', status: 'planned', commonLaw: false,
    strategy: 'usPerYear', perYearWeeks: 1, intake: ['headcount', 'layoffType', 'contract'],
    note: 'Only state with MANDATORY severance: 1 wk/yr + 4-wk penalty if employer misses NJ mini-WARN 90-day notice.',
  },
  'US-CA': {
    code: 'US-CA', country: 'US', name: 'California', status: 'planned', commonLaw: false,
    strategy: 'usNone', intake: ['headcount', 'layoffType', 'contract'],
    note: 'Cal-WARN: 75+ employees, 60 days\' notice, covers 100+ mile relocations. No statutory severance — contractual.',
  },
  'US-NY': {
    code: 'US-NY', country: 'US', name: 'New York', status: 'planned', commonLaw: false,
    strategy: 'usNone', intake: ['headcount', 'layoffType', 'contract'],
    note: 'NY mini-WARN: 90 days\' notice, covers smaller employers than federal. No statutory severance — contractual.',
  },
}

function syntheticPlanned(code: string): Rule {
  const country = (code || '').indexOf('US-') === 0 ? 'US' : 'CA'
  return {
    code, country, name: code, status: 'planned',
    commonLaw: country === 'CA', strategy: null, intake: [],
    note: 'Not yet built for this region.',
  }
}

export function getRule(code: string): Rule { return RULES[code] || syntheticPlanned(code) }
export function list(filter?: string): Rule[] {
  return Object.keys(RULES).map((k) => RULES[k]).filter((r) => !filter || r.status === filter)
}

export function estimate(code: string, inp: EstimateInput = {}): Estimate {
  const rule = getRule(code)
  const salary = +(inp.salary || 0)
  const years = +(inp.years || 0)
  const weekly = salary / 52
  const monthly = salary / 12
  const out: Estimate = {
    code: rule.code, name: rule.name, country: rule.country, status: rule.status, live: rule.status === 'live',
    commonLawApplies: !!rule.commonLaw, weekly, monthly, statutory: null, commonLaw: null, note: rule.note,
  }
  if (rule.strategy && STRATEGY[rule.strategy]) {
    const st = STRATEGY[rule.strategy](rule, inp, weekly)
    const outStatutory: any = {
      weeks: st.weeks, terminationWeeks: st.terminationWeeks, severanceWeeks: st.severanceWeeks,
      amount: Math.round(weekly * st.weeks), exact: !!st.exact, none: !!st.none,
    }
    if (st.individualNoticeWeeks !== undefined) outStatutory.individualNoticeWeeks = st.individualNoticeWeeks
    if (st.groupWeeks !== undefined) outStatutory.groupWeeks = st.groupWeeks
    if (st.appliedNoticeWeeks !== undefined) outStatutory.appliedNoticeWeeks = st.appliedNoticeWeeks
    if (st.potentialSeveranceWeeks !== undefined) outStatutory.potentialSeveranceWeeks = st.potentialSeveranceWeeks
    if (st.potentialSeveranceAmount !== undefined) outStatutory.potentialSeveranceAmount = st.potentialSeveranceAmount
    if (st.potentialSeveranceMessage !== undefined) outStatutory.potentialSeveranceMessage = st.potentialSeveranceMessage
    if (st.conditionalGroupNoticeWeeks !== undefined) outStatutory.conditionalGroupNoticeWeeks = st.conditionalGroupNoticeWeeks
    if (st.conditionalGroupNoticeAmount !== undefined) outStatutory.conditionalGroupNoticeAmount = st.conditionalGroupNoticeAmount
    if (st.conditionalGroupMessage !== undefined) outStatutory.conditionalGroupMessage = st.conditionalGroupMessage
    out.statutory = outStatutory
  }
  if (rule.commonLaw) {
    const cm = commonLawMonths({ age: +(inp.age || 0), years, roleFactor: +(inp.roleFactor || 1) })
    out.commonLaw = {
      lowMonths: cm.lowMonths, highMonths: cm.highMonths,
      lowAmount: Math.round(monthly * cm.lowMonths), highAmount: Math.round(monthly * cm.highMonths),
    }
  }
  return out
}

/**
 * "Similar jobs nearby" adjustment used by the free check (demo-v3.html mkAdj):
 * easy x0.9, mid x1, hard x1.15 on the common-law band only.
 * Re-enforces 24-month cap after adjustment. Never touches statutory floor.
 */
export const MARKET_FACTOR: Record<string, number> = { easy: 0.9, mid: 1, hard: 1.15 }
export function marketAdjust(e: Estimate, market?: string): Estimate {
  if (e && e.commonLaw) {
    const f = MARKET_FACTOR[market || ''] || 1
    const monthly = e.monthly || (e.weekly ? (e.weekly * 52) / 12 : 0)
    const lowMonths = Math.min(24, Math.max(1, Math.round(e.commonLaw.lowMonths * f)))
    let highMonths = Math.min(24, Math.max(1, Math.round(e.commonLaw.highMonths * f)))
    if (highMonths < lowMonths) highMonths = lowMonths

    let lowAmount = Math.min(Math.round(monthly * 24), Math.round(e.commonLaw.lowAmount * f))
    let highAmount = Math.min(Math.round(monthly * 24), Math.round(e.commonLaw.highAmount * f))

    if (e.statutory && e.statutory.amount) {
      if (lowAmount < e.statutory.amount) lowAmount = e.statutory.amount
      if (highAmount < e.statutory.amount) highAmount = e.statutory.amount
    }

    e.commonLaw = {
      lowMonths,
      highMonths,
      lowAmount,
      highAmount,
    }
  }
  return e
}

export const FairExitRules = {
  version: RULES_VERSION,
  lastUpdated: RULES_LAST_UPDATED,
  rules: RULES,
  getRule,
  list,
  estimate,
  commonLawMonths,
  MARKET_FACTOR,
  marketAdjust,
}
