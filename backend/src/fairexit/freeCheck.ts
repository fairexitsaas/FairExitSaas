/**
 * Free check (steps 0 to 4, no AI). The verdict wording stays in the clients; the server gives
 * every client (web, iOS, Android) the same numbers from the same rules engine.
 */
import { estimate, marketAdjust, RULES_VERSION } from './severanceRules'
import { buildJurisdiction, codeFromAnswers, Country, CA_NOT_COVERED } from './jurisdictions'

const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Engine inputs from the free-check answers (field names match the web flow's state). */
export function engineInputs(answers: Record<string, any>) {
  return {
    age: num(answers.age),
    years: num(answers.years),
    salary: num(answers.salary ?? answers.pay),
    roleFactor: num(answers.roleFactor ?? answers.roleF) || 1,
    payrollGlobal: String(answers.payroll) === 'yes' ? 3000000 : 0,
  }
}

export function computeFreeResult(country: Country, answers: Record<string, any>) {
  const code = codeFromAnswers(country, answers)
  const jurisdiction = code ? buildJurisdiction(code) : null
  if (!jurisdiction) {
    const prov = String(answers.province || '').toUpperCase()
    return {
      covered: false,
      reason: 'jurisdiction_not_covered',
      code,
      name: CA_NOT_COVERED[prov] || (country === 'US' ? 'outside the US' : prov || null),
      rules_version: RULES_VERSION,
    }
  }
  const inp = engineInputs(answers)
  const est = marketAdjust(estimate(code!, inp), answers.market)
  const offer = num(answers.offer)
  const weekly = est.weekly

  if (country === 'CA') {
    const st = est.statutory
    const cl = est.commonLaw
    // demo-v3 showVerdict(): a minimum-only clause in a current contract caps the top of the range
    const clauseHolds = answers.clause === 'yes' && answers.contract === 'current'
    const low = st ? st.amount : 0
    const high = cl && !clauseHolds ? cl.highAmount : low
    return {
      covered: true,
      jurisdiction,
      rules_version: RULES_VERSION,
      weekly: Math.round(weekly),
      monthly: Math.round(est.monthly),
      minimum: st ? { ...st, statute_short: jurisdiction.statute_short } : null,
      common_law: cl,
      range: { low, high, clause_caps_range: clauseHolds },
      offer: offer ? { amount: offer, weeks: weekly ? +(offer / weekly).toFixed(1) : null } : null,
      offer_vs_minimum: offer && st ? (offer >= st.amount ? 'at_or_above_minimum' : 'below_minimum') : null,
      note: est.note,
    }
  }

  // US: no legal minimum (except where a state rule sets one, e.g. NJ). Show the offer's own math.
  const st = est.statutory
  const hasFloor = !!(st && !st.none && st.weeks > 0)
  return {
    covered: true,
    jurisdiction,
    rules_version: RULES_VERSION,
    weekly: Math.round(weekly),
    minimum: hasFloor ? { ...st } : { none: true },
    offer: offer ? { amount: offer, weeks: weekly ? +(offer / weekly).toFixed(1) : null } : null,
    federal_only: jurisdiction.regime === 'us_federal_only',
    note: est.note,
  }
}
