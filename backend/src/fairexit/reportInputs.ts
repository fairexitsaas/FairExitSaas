/**
 * Builds the Call B input exactly as prompt v0.6 lists it:
 *   jurisdiction, answers, contract, call_a, confirmed_facts, minimum, range, region_rules, sources
 *
 * minimum and range come from the rules engine (never from the model). Rule 15 (notice already
 * worked) and rule 16 (regular bonus counts for the range only) are applied here so the numbers
 * the model receives are already right.
 */
import { buildJurisdiction, codeFromAnswers, normalizeCode, Jurisdiction } from './jurisdictions'
import { estimate, marketAdjust, getRule, RULES_VERSION, TableRow } from './severanceRules'
import { regionRulesFor, sourcesFor, latestCheckedDate } from './regionData'
import { CheckCtx, confirmedValue, exportConfirmedFacts, ROLE_OPTIONS } from './checkPage'
import { engineInputs } from './freeCheck'
import type { CaseRow } from './types'
import { fmtMoney } from './values'

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

const SIMILAR_JOBS: Record<string, string> = { easy: 'many similar jobs nearby', mid: 'some similar jobs nearby', hard: 'few similar jobs nearby' }
const ENDED: Record<string, string> = {
  layoff: 'laid off, no cause', cause: 'for cause', constructive: 'forced out', templayoff: 'temporary layoff', mass: 'part of a big layoff (50+)', closure: 'whole site closed',
}

function tableText(table: TableRow[] | undefined): string {
  if (!table || !table.length) return ''
  return table.map((r) => `${r.minYears}+ years: ${r.weeks} week${r.weeks === 1 ? '' : 's'}`).join('; ')
}

/** Jurisdiction after the check page (the person may have corrected their province or state). */
export function finalJurisdiction(c: CaseRow, ctx: CheckCtx): Jurisdiction | null {
  const a = { ...c.answers }
  if (c.country === 'CA') {
    const p = confirmedValue(ctx, 'province')
    if (p) a.province = p
  } else {
    const s = confirmedValue(ctx, 'state')
    if (s) a.usState = s
  }
  const code = codeFromAnswers(c.country, a) || normalizeCode(c.jurisdiction_code || '')
  return code ? buildJurisdiction(code) : null
}

/** The answers object the prompt describes, in plain keys, plus the raw free-check state. */
export function answersForPrompt(c: CaseRow, j: Jurisdiction) {
  const a = c.answers || {}
  const role = a.roleLabel || ROLE_OPTIONS.find((r) => r.factor === num(a.roleFactor ?? a.roleF))?.label || null
  const extras = Object.entries((c.country === 'US' ? a.comp : a.pay) || {}).filter(([, v]) => !!v).map(([k]) => k)
  return {
    [j.words.region]: j.name,
    age: num(a.age),
    years: num(a.years),
    pay: num(a.salary ?? a.pay),
    pay_extras: extras,
    role,
    union: a.union || null,
    employer_size: c.country === 'US' ? a.empsize || null : a.payroll ? `payroll over $2.5M: ${a.payroll}` : null,
    how_it_ended: ENDED[String(a.reason || a.ended)] || a.reason || a.ended || null,
    offer: num(a.offer),
    signed_yet: a.signed || null,
    similar_jobs: SIMILAR_JOBS[String(a.market)] || a.market || null,
    federal: c.country === 'CA' ? a.federal || 'no' : undefined,
    ...(c.country === 'US'
      ? { others_laid_off: a.others || null, advance_notice: a.notice || null, release: a.release || null, days_to_decide: a.deadline || null, told_to_see_attorney: a.advise || null, age_list: a.list || null, take_back: a.revoke || null, non_compete: a.nc || null, promised_in_writing: a.promise || null }
      : { contract_clause: a.clause || null, contract_history: a.contract || null, reemployed: a.reemployed || null, red_flag: a.redflag || null }),
    raw: a,
  }
}

export function buildMinimumAndRange(c: CaseRow, ctx: CheckCtx, j: Jurisdiction) {
  const base = engineInputs(c.answers)
  const years = num(confirmedValue(ctx, 'years')) ?? base.years
  const age = num(confirmedValue(ctx, 'age')) ?? base.age
  const salary = num(confirmedValue(ctx, 'pay')) ?? base.salary
  const inp = { ...base, years, age, salary }
  const rule = getRule(j.code)
  const est = estimate(j.code, inp)

  if (j.country === 'US') {
    const st = est.statutory
    if (!st || st.none || !st.weeks) return { minimum: { none: true }, range: undefined, engine: { input: inp, rules_version: RULES_VERSION } }
    return {
      minimum: {
        weeks: st.weeks, severanceWeeks: st.severanceWeeks, amount: st.amount,
        table: `${rule.perYearWeeks || 1} week of pay per full year of service`, note: rule.note,
        arithmetic: `${Math.floor(years)} full years × ${rule.perYearWeeks || 1} week × ${fmtMoney(salary / 52, 'US')} a week = ${fmtMoney(st.amount, 'US')}`,
      },
      range: undefined,
      engine: { input: inp, rules_version: RULES_VERSION },
    }
  }

  // ---- Canada
  const st = est.statutory!
  const weekly = salary / 52
  const worked = num(confirmedValue(ctx, 'working_notice_weeks'))
  let terminationWeeks = st.terminationWeeks
  let arithmetic: string | undefined
  if (worked && worked > 0) {
    const sub = Math.min(worked, st.terminationWeeks) // never subtract more than the notice period
    terminationWeeks = st.terminationWeeks - sub
    arithmetic = `${j.statute_short} notice ${st.terminationWeeks} weeks − ${sub} weeks you worked = ${terminationWeeks} weeks still due as pay.`
  }
  const weeks = terminationWeeks + st.severanceWeeks
  const minimum = {
    weeks,
    terminationWeeks,
    severanceWeeks: st.severanceWeeks,
    amount: Math.round(weekly * weeks),
    statute_short: j.statute_short,
    table: tableText(rule.terminationTable) + (rule.severance ? `; severance pay: ${rule.severance.perYearWeeks} week per year, max ${rule.severance.maxWeeks} weeks, if ${rule.severance.minYears}+ years and payroll of $2.5 million or more` : '') + (rule.strategy === 'federalCA' ? '; severance pay: greater of 2 days per completed year or 5 days, after 12 months' : ''),
    notice_before_worked_weeks: worked && worked > 0 ? st.terminationWeeks : undefined,
    working_notice_weeks: worked && worked > 0 ? Math.min(worked, st.terminationWeeks) : undefined,
    arithmetic,
    weekly_pay: Math.round(weekly * 100) / 100,
    basis: 'regular wages (base pay)',
  }

  // Rule 16: a regular bonus counts in total pay for the common-law range only.
  const bonus = num(confirmedValue(ctx, 'bonus_amount'))
  const bonusFact = (c.call_a?.facts || []).find((f) => f.key === 'bonus_amount')
  const regular = !!bonus && bonus > 0 && (c.answers.bonus_regular === true || /regular|annual|each year|every year|yearly|most years/i.test(`${bonusFact?.value || ''} ${bonusFact?.quote || ''}`))
  const rangeEst = marketAdjust(estimate(j.code, { ...inp, salary: salary + (regular ? bonus! : 0) }), c.answers.market)
  const cl = rangeEst.commonLaw
  const range = cl
    ? { low: cl.lowAmount, high: cl.highAmount, lowMonths: cl.lowMonths, highMonths: cl.highMonths, basis: regular ? 'base pay plus regular bonus' : 'base pay', estimate: true }
    : undefined
  return { minimum, range, engine: { input: inp, bonus_regular: regular, rules_version: RULES_VERSION } }
}

export function buildCallBInput(c: CaseRow, ctx: CheckCtx) {
  const j = finalJurisdiction(c, ctx)
  if (!j) throw new Error('jurisdiction_not_covered')
  const sources = sourcesFor(j)
  const { minimum, range, engine } = buildMinimumAndRange(c, ctx, j)
  const input: Record<string, unknown> = {
    jurisdiction: j,
    answers: answersForPrompt(c, j),
    contract: c.contract_status || 'missing',
    call_a: c.call_a,
    confirmed_facts: exportConfirmedFacts(ctx),
    minimum,
    ...(j.country === 'CA' && range ? { range } : {}),
    region_rules: regionRulesFor(j),
    sources,
  }
  return { input, jurisdiction: j, engine, rulesAsOf: latestCheckedDate(sources) }
}
