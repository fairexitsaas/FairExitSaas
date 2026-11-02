/**
 * FairExit rules engine, server copy.
 *
 * A line-for-line TypeScript port of the client's resource-hub-v2/severance-rules.js v0.2.0
 * (LAST_UPDATED 2026-10-23). The client says "just replace your copy of the file", so when a
 * new version arrives, port the RULES table and strategies again and bump RULES_VERSION.
 * tests/unit/severanceRules.test.ts checks this port against the original JS file.
 *
 * Two kinds of numbers, kept strictly separate:
 *   statutory  the legal MINIMUM (deterministic, per jurisdiction)
 *   commonLaw  "reasonable notice" (Canada only), an ESTIMATE shown as a range
 */

export const RULES_VERSION = '0.2.0'
export const RULES_LAST_UPDATED = '2026-10-23'

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
}

export interface EstimateInput {
  age?: number
  years?: number
  salary?: number
  roleFactor?: number
  payrollGlobal?: number
}

export interface Estimate {
  code: string
  name: string
  country: 'CA' | 'US'
  status: Rule['status']
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
    none: boolean
  } | null
  commonLaw: { lowMonths: number; highMonths: number; lowAmount: number; highAmount: number } | null
  note: string
}

function weeksFromTable(table: TableRow[], years: number): number {
  let w = 0
  for (const row of table) if (years >= row.minYears) w = row.weeks
  return w
}

const STRATEGY: Record<NonNullable<Rule['strategy']>, (rule: Rule, inp: { years: number; payrollGlobal: number }) => StrategyResult> = {
  ontario(rule, inp) {
    const term = weeksFromTable(rule.terminationTable || [], inp.years)
    let sev = 0
    const s = rule.severance
    // payroll test is GLOBAL (Hawkes v. Max Aicher)
    if (s && inp.years >= s.minYears && inp.payrollGlobal >= s.minPayrollGlobal) {
      sev = Math.min(s.maxWeeks, inp.years * s.perYearWeeks)
    }
    return { terminationWeeks: term, severanceWeeks: sev, weeks: term + sev, exact: true }
  },
  weeksTable(rule, inp) {
    const w = weeksFromTable(rule.terminationTable || [], inp.years)
    return { terminationWeeks: w, severanceWeeks: 0, weeks: w, exact: true }
  },
  federalCA(rule, inp) {
    const term = weeksFromTable(rule.terminationTable || [], inp.years)
    let sev = 0
    if (inp.years >= 1) sev = Math.max(5, 2 * Math.floor(inp.years)) / 5
    return { terminationWeeks: term, severanceWeeks: sev, weeks: term + sev, exact: true }
  },
  usNone() {
    return { terminationWeeks: 0, severanceWeeks: 0, weeks: 0, exact: true, none: true }
  },
  usPerYear(rule, inp) {
    const w = Math.floor(inp.years) * (rule.perYearWeeks || 1)
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
    terminationTable: [{ minYears: 0.25, weeks: 1 }, { minYears: 1, weeks: 2 }, { minYears: 3, weeks: 3 }, { minYears: 5, weeks: 5 }, { minYears: 8, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Statutory table TBD — structurally similar to BC/AB. Placeholder until verified.',
  }
}

export const RULES: Record<string, Rule> = {
  'CA-ON': {
    code: 'CA-ON', country: 'CA', name: 'Ontario', status: 'live', commonLaw: true, strategy: 'ontario',
    terminationTable: [{ minYears: 0.25, weeks: 1 }, { minYears: 1, weeks: 2 }, { minYears: 3, weeks: 3 }, { minYears: 4, weeks: 4 }, { minYears: 5, weeks: 5 }, { minYears: 6, weeks: 6 }, { minYears: 7, weeks: 7 }, { minYears: 8, weeks: 8 }],
    severance: { minYears: 5, minPayrollGlobal: 2500000, perYearWeeks: 1, maxWeeks: 26 },
    intake: ['age', 'years', 'salary', 'role', 'payrollGlobal'],
    note: 'Termination pay (max 8 wks) + severance pay (max 26 wks) if 5+ yrs AND GLOBAL payroll ≥ $2.5M (Hawkes v. Max Aicher). Common law up to ~24 mo.',
  },
  'CA-BC': {
    code: 'CA-BC', country: 'CA', name: 'British Columbia', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.25, weeks: 1 }, { minYears: 1, weeks: 2 }, { minYears: 3, weeks: 3 }, { minYears: 4, weeks: 4 }, { minYears: 5, weeks: 5 }, { minYears: 6, weeks: 6 }, { minYears: 7, weeks: 7 }, { minYears: 8, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'ESA compensation for length of service, max 8 wks. No separate severance category. Common law applies.',
  },
  'CA-AB': {
    code: 'CA-AB', country: 'CA', name: 'Alberta', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.247, weeks: 1 }, { minYears: 2, weeks: 2 }, { minYears: 4, weeks: 4 }, { minYears: 6, weeks: 5 }, { minYears: 8, weeks: 6 }, { minYears: 10, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Employment Standards Code termination pay, max 8 wks. No separate severance. Common law applies.',
  },
  'CA-FED': {
    code: 'CA-FED', country: 'CA', name: 'Federally regulated (banks, telecom, air, rail)', status: 'live', commonLaw: true, strategy: 'federalCA',
    terminationTable: [{ minYears: 0.25, weeks: 2 }, { minYears: 3, weeks: 3 }, { minYears: 4, weeks: 4 }, { minYears: 5, weeks: 5 }, { minYears: 6, weeks: 6 }, { minYears: 7, weeks: 7 }, { minYears: 8, weeks: 8 }],
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
    terminationTable: [{ minYears: 0.082, weeks: 1 }, { minYears: 1, weeks: 2 }, { minYears: 3, weeks: 4 }, { minYears: 5, weeks: 6 }, { minYears: 10, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Employment Standards Code s.61: notice from 30 days, max 8 wks. Common law applies.',
  },
  'CA-SK': {
    code: 'CA-SK', country: 'CA', name: 'Saskatchewan', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.2501, weeks: 1 }, { minYears: 1.0001, weeks: 2 }, { minYears: 3.0001, weeks: 4 }, { minYears: 5.0001, weeks: 6 }, { minYears: 10.0001, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'SEA s.2-60: notice after MORE THAN 13 wks / 1 / 3 / 5 / 10 yrs, max 8 wks. Common law applies.',
  },
  'CA-NS': {
    code: 'CA-NS', country: 'CA', name: 'Nova Scotia', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.25, weeks: 1 }, { minYears: 2, weeks: 2 }, { minYears: 5, weeks: 4 }, { minYears: 10, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Labour Standards Code s.72: notice from 3 months, max 8 wks. Common law applies.',
  },
  'CA-NB': {
    code: 'CA-NB', country: 'CA', name: 'New Brunswick', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.5, weeks: 2 }, { minYears: 5, weeks: 4 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'ESA s.30: 2 wks from 6 months, 4 wks from 5 yrs (max). Common law applies.',
  },
  'CA-PE': {
    code: 'CA-PE', country: 'CA', name: 'Prince Edward Island', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.247, weeks: 1 }, { minYears: 1, weeks: 2 }, { minYears: 5, weeks: 4 }, { minYears: 10, weeks: 6 }, { minYears: 15, weeks: 8 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'New ESA (in force June 30, 2026) s.59: notice from 90 days, max 8 wks. Terminations before that date used the old Act. Common law applies.',
  },
  'CA-NL': {
    code: 'CA-NL', country: 'CA', name: 'Newfoundland and Labrador', status: 'live', commonLaw: true, strategy: 'weeksTable',
    terminationTable: [{ minYears: 0.25, weeks: 1 }, { minYears: 2, weeks: 2 }, { minYears: 5, weeks: 3 }, { minYears: 10, weeks: 4 }, { minYears: 15, weeks: 6 }],
    intake: ['age', 'years', 'salary', 'role'],
    note: 'Labour Standards Act s.55: notice from 3 months, max 6 wks. Common law applies.',
  },
  'CA-NT': stub('CA-NT', 'Northwest Territories'),
  'CA-YT': stub('CA-YT', 'Yukon'),
  'CA-NU': stub('CA-NU', 'Nunavut'),

  'US-FED': {
    code: 'US-FED', country: 'US', name: 'United States (federal baseline)', status: 'planned', commonLaw: false, strategy: 'usNone',
    intake: ['headcount', 'layoffType', 'state', 'contract'],
    note: 'No federal severance mandate. At-will. WARN Act = 60 days\' NOTICE (or pay in lieu) for mass layoffs at 100+ employee employers. Severance is contractual.',
  },
  'US-NJ': {
    code: 'US-NJ', country: 'US', name: 'New Jersey', status: 'planned', commonLaw: false, strategy: 'usPerYear', perYearWeeks: 1,
    intake: ['headcount', 'layoffType', 'contract'],
    note: 'Only state with MANDATORY severance: 1 wk/yr + 4-wk penalty if employer misses NJ mini-WARN 90-day notice.',
  },
  'US-CA': {
    code: 'US-CA', country: 'US', name: 'California', status: 'planned', commonLaw: false, strategy: 'usNone',
    intake: ['headcount', 'layoffType', 'contract'],
    note: 'Cal-WARN: 75+ employees, 60 days\' notice, covers 100+ mile relocations. No statutory severance — contractual.',
  },
  'US-NY': {
    code: 'US-NY', country: 'US', name: 'New York', status: 'planned', commonLaw: false, strategy: 'usNone',
    intake: ['headcount', 'layoffType', 'contract'],
    note: 'NY mini-WARN: 90 days\' notice, covers smaller employers than federal. No statutory severance — contractual.',
  },
}

function syntheticPlanned(code: string): Rule {
  const country = (code || '').indexOf('US-') === 0 ? 'US' : 'CA'
  return { code, country, name: code, status: 'planned', commonLaw: country === 'CA', strategy: null, intake: [], note: 'Not yet built for this region.' }
}

export function getRule(code: string): Rule {
  return RULES[code] || syntheticPlanned(code)
}

/** The engine: one call, everything the UI needs. Same output shape as FairExitRules.estimate. */
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
    const st = STRATEGY[rule.strategy](rule, { years, payrollGlobal: +(inp.payrollGlobal || 0) })
    out.statutory = {
      weeks: st.weeks, terminationWeeks: st.terminationWeeks, severanceWeeks: st.severanceWeeks,
      amount: Math.round(weekly * st.weeks), exact: !!st.exact, none: !!st.none,
    }
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
 * easy x0.9, mid x1, hard x1.15 on the common-law band only. Never touches the minimum.
 */
export const MARKET_FACTOR: Record<string, number> = { easy: 0.9, mid: 1, hard: 1.15 }
export function marketAdjust(e: Estimate, market?: string): Estimate {
  if (e && e.commonLaw) {
    const f = MARKET_FACTOR[market || ''] || 1
    e.commonLaw = {
      lowMonths: Math.round(e.commonLaw.lowMonths * f),
      highMonths: Math.round(e.commonLaw.highMonths * f),
      lowAmount: Math.round(e.commonLaw.lowAmount * f),
      highAmount: Math.round(e.commonLaw.highAmount * f),
    }
  }
  return e
}
