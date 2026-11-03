/**
 * Step 8 "Check everything your report will use" (specs/check-page-spec-v2.md), server side.
 *
 * Builds the same page model for web, iOS and Android from:
 *   - the free-check answers ("About you · you told us")
 *   - the Call A output ("Your offer · from your letter", "Your contract", US "Your agreement")
 *   - the person's actions so far (case.check_state)
 * and exports `confirmed_facts` for Call B exactly as spec section 4 defines it.
 */
import type { Country } from './jurisdictions'
import { CA_PROVINCES, US_STATES } from './jurisdictions'
import type { CallAFact, CallAOutput, CheckRowState, CheckState, ContractStatus, RowSource, RowStatus } from './types'
import { ValueType, parseMoney, parseWeeks, parseDays, parseDate, addDays, yearsBetween, fmtMoney, fmtDate } from './values'

export const FINAL_AGREEMENT_TEXT =
  "I've checked each item against my documents and confirmed it's correct to the best of my knowledge. I understand my report is built on what I confirmed here."
export const CHANGE_ACK_TEXT =
  "I confirm my change is correct. I understand my report will use my value instead of what my document says, and FairExit isn't responsible for results based on information I changed."
export const PAGE_TITLE = 'Check everything your report will use'
export const PAGE_SUB = "Your report is built only on what you confirm here. Tap Yes if it's right, or Change it."

type Opt = [string, string]

export interface CheckCtx {
  country: Country
  answers: Record<string, any>
  callA: CallAOutput | null
  contractStatus: ContractStatus | null
  check: CheckState
}

interface RowDef {
  key: string
  group: string
  label: string
  type: ValueType
  source: RowSource
  options?: Opt[] | ((ctx: CheckCtx) => Opt[])
  /** Required to build. Default true. */
  required?: (ctx: CheckCtx) => boolean
  /** Row only shown when true. */
  only?: (ctx: CheckCtx) => boolean
  /** "We need one more number" question, asked when the document value is null. */
  ask?: string
  /** answers rows: read / write the free-check answer */
  fromAnswers?: (a: Record<string, any>) => unknown
  toAnswers?: (v: unknown, a: Record<string, any>) => void
  /** document rows: free-check answer to cross-check against (null = no answer to compare) */
  told?: (a: Record<string, any>) => { v: unknown; t: string } | null
  match?: (told: unknown, doc: unknown) => boolean
  normalize?: (raw: string, ctx: CheckCtx) => unknown
  display?: (v: unknown, ctx: CheckCtx) => string
  /** optional rows that only appear when Call A found them */
  onlyIfFound?: boolean
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// option lists (labels exactly as the prototype shows them)
// ---------------------------------------------------------------------------
export const ROLE_OPTIONS: Array<{ label: string; factor: number }> = [
  { label: 'Upper management (VP, C-suite, executive)', factor: 1.25 },
  { label: 'Middle management / Senior / Director', factor: 1.15 },
  { label: 'Lower management / Supervisor', factor: 1.1 },
  { label: 'Professional (accountant, engineer, etc.)', factor: 1.12 },
  { label: 'Technical / skilled trade', factor: 1.08 },
  { label: 'Salesperson / Sales manager', factor: 1.08 },
  { label: 'Clerical / administrative', factor: 1 },
  { label: 'Labourer / general', factor: 1 },
]
const CA_REASON: Record<string, string> = {
  layoff: 'Laid off, no cause', cause: 'For cause', constructive: 'Forced out', templayoff: '"Temporary layoff"', mass: 'Part of a big layoff (50+)',
}
const CHOICE_TXT: Record<string, string> = {
  paid: "Yes, it's paid", not_paid: 'No, not paid', not_mentioned: 'Not mentioned', full: 'Yes, a full release', yes: 'Yes', no: 'No',
}
const YN: Opt[] = [['yes', 'Yes'], ['no', 'No']]
const TB: Opt[] = [['yes', "Yes, it's there"], ['not_mentioned', 'Not mentioned']]
const LST: Opt[] = [['given', 'Given to you'], ['missing', 'Missing']]

function roleLabel(a: Record<string, any>): string {
  if (a.roleLabel) return String(a.roleLabel)
  const f = num(a.roleFactor ?? a.roleF)
  const hit = ROLE_OPTIONS.find((r) => r.factor === f)
  return hit ? hit.label : ''
}

// ---------------------------------------------------------------------------
// normalizers for Call A text
// ---------------------------------------------------------------------------
const low = (s: string) => s.toLowerCase().trim()
function normVacation(s: string) {
  const t = low(s)
  if (/not mentioned|silent|no mention|does not say|doesn't say/.test(t)) return 'not_mentioned'
  if (/not paid|no vacation|exclud|not includ|does not include|without/.test(t)) return 'not_paid'
  if (/paid|includ|yes/.test(t)) return 'paid'
  return s
}
function normReleaseCA(s: string) {
  const t = low(s)
  if (/^(no|none|not)\b|no release|not required/.test(t)) return 'no'
  if (/full|final|all claims/.test(t)) return 'full'
  if (/yes|release/.test(t)) return 'yes'
  return s
}
function normYesNo(s: string) {
  const t = low(s)
  if (/^(no|none|not|missing|absent)\b|not mentioned|not required/.test(t)) return 'no'
  if (/^yes\b|required|includ|must/.test(t)) return 'yes'
  return s
}
function normMinOnly(s: string) {
  const t = low(s)
  if (/^(no|none|not)\b|no such|no clause|not limit/.test(t)) return 'no'
  if (/^yes\b|minimum|only the|limit/.test(t)) return 'yes'
  return s
}
function normTakeBack(s: string) {
  const t = low(s)
  if (/not mentioned|missing|^no\b|none|absent/.test(t)) return 'not_mentioned'
  if (/\d+\s*day|yes|revoke|revocation|change (your|their) mind/.test(t)) return 'yes'
  return s
}
function normAttorney(s: string) {
  const t = low(s)
  if (/not mentioned|^no\b|none|absent|missing/.test(t)) return 'no'
  if (/yes|attorney|lawyer|counsel|advis/.test(t)) return 'yes'
  return s
}
function normAgeList(s: string) {
  const t = low(s)
  if (/missing|absent|not (given|attached|included|provided)|^no\b|none/.test(t)) return 'missing'
  if (/given|attached|included|provided|yes|list/.test(t)) return 'given'
  return s
}
function normNonCompete(s: string) {
  const t = low(s)
  if (/^(no|none|not)\b|not mentioned|no non-?compete/.test(t)) return 'no'
  return 'yes'
}

// ---------------------------------------------------------------------------
// row definitions
// ---------------------------------------------------------------------------
const CA_ROWS: RowDef[] = [
  {
    key: 'province', group: 'you', label: 'Province', type: 'choice', source: 'answers',
    options: Object.entries(CA_PROVINCES).map(([k, v]) => [k, v.name] as Opt),
    fromAnswers: (a) => a.province || null, toAnswers: (v, a) => { a.province = v },
    display: (v) => CA_PROVINCES[String(v)]?.name || String(v ?? ''),
  },
  { key: 'age', group: 'you', label: 'Age', type: 'number', source: 'answers', fromAnswers: (a) => num(a.age), toAnswers: (v, a) => { a.age = v } },
  {
    key: 'years', group: 'you', label: 'Years on the job', type: 'number', source: 'answers',
    fromAnswers: (a) => num(a.years), toAnswers: (v, a) => { a.years = v }, display: (v) => `${v} years`,
  },
  { key: 'pay', group: 'you', label: 'Pay per year', type: 'money', source: 'answers', fromAnswers: (a) => num(a.salary ?? a.pay), toAnswers: (v, a) => { a.salary = v } },
  {
    key: 'role', group: 'you', label: 'Your role', type: 'choice', source: 'answers',
    options: ROLE_OPTIONS.map((r) => [r.label, r.label] as Opt),
    fromAnswers: (a) => roleLabel(a) || null,
    toAnswers: (v, a) => { const r = ROLE_OPTIONS.find((x) => x.label === v); if (r) { a.roleFactor = r.factor; a.roleLabel = r.label } },
  },
  {
    key: 'ended', group: 'you', label: 'How your job ended', type: 'choice', source: 'answers',
    options: Object.entries(CA_REASON) as Opt[], fromAnswers: (a) => a.reason || null, toAnswers: (v, a) => { a.reason = v },
    display: (v) => CA_REASON[String(v)] || String(v ?? ''),
  },
  {
    key: 'offer_amount', group: 'offer', label: 'Money offered', type: 'money', source: 'letter',
    told: (a) => (num(a.offer) ? { v: num(a.offer), t: fmtMoney(num(a.offer)) } : null),
    match: (t, d) => Math.abs(Number(t) - Number(d)) < 1, toAnswers: (v, a) => { a.offer = v },
  },
  {
    key: 'notice_weeks', group: 'offer', label: 'Notice or pay in place of notice', type: 'weeks', source: 'letter',
    display: (v) => `${v} weeks of pay`,
  },
  {
    key: 'vacation_on_notice', group: 'offer', label: 'Vacation pay on that notice', type: 'choice', source: 'letter',
    options: [['paid', "Yes, it's paid"], ['not_paid', 'No, not paid'], ['not_mentioned', 'Not mentioned']], normalize: normVacation,
  },
  { key: 'last_day', group: 'offer', label: 'Last day of work', type: 'date', source: 'letter' },
  {
    key: 'working_notice_weeks', group: 'offer', label: 'Notice you already worked', type: 'weeks', source: 'letter',
    ask: 'Did you keep working after they told you? How many weeks?', display: (v) => (Number(v) === 0 ? 'None' : `${v} weeks`),
  },
  {
    key: 'sign_by', group: 'offer', label: 'Decide by', type: 'date', source: 'letter',
    normalize: (raw, ctx) => {
      const d = parseDate(raw)
      if (d) return d
      const days = raw.match(/(\d+)\s*(?:calendar\s+|business\s+)?days?/i)
      const lastDay = docValue(ctx, 'last_day')
      if (days && typeof lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastDay) && /last day|end of (your )?employment|termination date/i.test(raw)) {
        return addDays(lastDay, +days[1])
      }
      return raw
    },
  },
  {
    key: 'release_required', group: 'offer', label: 'You must sign a release to get it', type: 'choice', source: 'letter',
    options: [['full', 'Yes, a full release'], ['yes', 'Yes, a release'], ['no', 'No release']], normalize: normReleaseCA,
  },
  { key: 'benefits_end', group: 'offer', label: 'Benefits end', type: 'date', source: 'letter' },
  {
    key: 'min_only_clause', group: 'contract', label: 'Limits you to the legal minimum', type: 'choice', source: 'contract',
    options: YN, normalize: normMinOnly,
    told: (a) => (a.clause ? { v: a.clause, t: a.clause === 'yes' ? 'Yes, it limits me' : a.clause === 'no' ? "No, it doesn't" : "I'm still not sure" } : null),
    toAnswers: (v, a) => { if (v === 'yes' || v === 'no') a.clause = v },
  },
  { key: 'contract_start', group: 'contract', label: 'Start date', type: 'date', source: 'contract' },
  { key: 'job_title_contract', group: 'contract', label: 'Job title when hired', type: 'text', source: 'contract', required: () => false },
  {
    key: 'bonus_amount', group: 'contract', label: 'Bonus per year', type: 'money', source: 'contract',
    ask: 'About how much was your bonus each year?', only: (ctx) => !!ctx.answers?.pay?.bonus,
    display: (v, ctx) => (Number(v) === 0 ? 'No bonus' : fmtMoney(v, ctx.country)),
  },
]

const US_ROWS: RowDef[] = [
  {
    key: 'state', group: 'you', label: 'State', type: 'choice', source: 'answers',
    options: Object.values(US_STATES).map((n) => [n, n] as Opt),
    fromAnswers: (a) => a.usState || a.state || null, toAnswers: (v, a) => { a.usState = v },
  },
  { key: 'age', group: 'you', label: 'Age', type: 'number', source: 'answers', fromAnswers: (a) => num(a.age), toAnswers: (v, a) => { a.age = v } },
  {
    key: 'years', group: 'you', label: 'Years on the job', type: 'number', source: 'answers',
    fromAnswers: (a) => num(a.years), toAnswers: (v, a) => { a.years = v }, display: (v) => `${v}${Number(v) === 1 ? ' year' : ' years'}`,
  },
  { key: 'pay', group: 'you', label: 'Pay per year', type: 'money', source: 'answers', fromAnswers: (a) => num(a.salary ?? a.pay), toAnswers: (v, a) => { a.salary = v } },
  {
    key: 'offer_amount', group: 'agr', label: 'Money offered', type: 'money', source: 'agreement',
    told: (a) => (num(a.offer) ? { v: num(a.offer), t: fmtMoney(num(a.offer), 'US') } : null),
    match: (t, d) => Math.abs(Number(t) - Number(d)) < 1, toAnswers: (v, a) => { a.offer = v },
    display: (v, ctx) => {
      const pay = num(ctx.answers.salary)
      return fmtMoney(v, 'US') + (pay && num(v) ? ` (about ${Math.round(Number(v) / (pay / 52))} weeks)` : '')
    },
  },
  {
    key: 'release_required', group: 'agr', label: 'You must sign a release', type: 'choice', source: 'agreement', options: YN, normalize: normYesNo,
    told: (a) => (a.release && a.release !== 'unsure' ? { v: a.release, t: a.release === 'yes' ? 'Yes' : 'No' } : null),
    toAnswers: (v, a) => { a.release = v },
  },
  {
    key: 'days_to_decide', group: 'agr', label: 'Days to decide', type: 'days', source: 'agreement',
    told: (a) => {
      const t = ({ short: 'under 21 days', mid: '21 to 44 days', full: '45 days or more' } as Record<string, string>)[a.deadline]
      return t ? { v: a.deadline, t } : null
    },
    match: (a, d) => { const n = Number(d); return a === 'short' ? n < 21 : a === 'mid' ? n >= 21 && n < 45 : n >= 45 },
    toAnswers: (v, a) => { const n = Number(v); a.deadline = n >= 45 ? 'full' : n >= 21 ? 'mid' : 'short' },
  },
  {
    key: 'take_back', group: 'agr', label: '7 days to change your mind after signing', type: 'choice', source: 'agreement', options: TB, normalize: normTakeBack,
    told: (a) => (a.revoke && a.revoke !== 'unsure' ? { v: a.revoke === 'yes' ? 'yes' : 'not_mentioned', t: a.revoke === 'yes' ? "it's there" : "it's not mentioned" } : null),
    toAnswers: (v, a) => { a.revoke = v === 'yes' ? 'yes' : 'no' },
  },
  {
    key: 'attorney_line', group: 'agr', label: 'Tells you to see an attorney', type: 'choice', source: 'agreement', options: YN, normalize: normAttorney,
    told: (a) => (a.advise && a.advise !== 'unsure' ? { v: a.advise, t: a.advise === 'yes' ? 'Yes' : 'No' } : null),
    toAnswers: (v, a) => { a.advise = v },
  },
  {
    key: 'age_list', group: 'agr', label: 'List of ages and job titles', type: 'choice', source: 'agreement', options: LST, normalize: normAgeList,
    required: (ctx) => isGroupLayoff(ctx.answers), only: (ctx) => isGroupLayoff(ctx.answers),
    told: (a) => (a.list && a.list !== 'unsure' ? { v: a.list === 'yes' ? 'given' : 'missing', t: a.list === 'yes' ? 'you got the list' : "you didn't get the list" } : null),
    toAnswers: (v, a) => { a.list = v === 'given' ? 'yes' : 'no' },
  },
  {
    key: 'non_compete', group: 'agr', label: 'Non-compete', type: 'choice', source: 'agreement', options: YN, normalize: normNonCompete,
    told: (a) => (a.nc && a.nc !== 'unsure' ? { v: a.nc, t: a.nc === 'yes' ? 'Yes' : 'No' } : null),
    toAnswers: (v, a) => { a.nc = v },
  },
  { key: 'last_day', group: 'agr', label: 'Last day of work', type: 'date', source: 'agreement', ask: 'What was (or will be) your last day of work?' },
  // Prompt v0.6 added these Call A keys; shown only when the documents state them (not required).
  { key: 'final_pay_date', group: 'agr', label: 'Final pay date', type: 'date', source: 'agreement', required: () => false, onlyIfFound: true },
  { key: 'unused_vacation_payout', group: 'agr', label: 'Unused vacation or PTO paid out', type: 'text', source: 'agreement', required: () => false, onlyIfFound: true },
  {
    key: 'advance_notice', group: 'lay', label: 'Advance notice you got', type: 'days', source: 'agreement',
    told: (a) => {
      const t = ({ none: 'none, or the same day', wk: '1 to 2 weeks', mid: '3 to 8 weeks', full: '60 days or more' } as Record<string, string>)[a.notice]
      return t ? { v: a.notice, t } : null
    },
    match: (a, d) => { const n = Number(d); return a === 'none' ? n <= 1 : a === 'wk' ? n > 1 && n <= 14 : a === 'mid' ? n > 14 && n < 60 : n >= 60 },
    toAnswers: (v, a) => { const n = Number(v); a.notice = n <= 1 ? 'none' : n <= 14 ? 'wk' : n < 60 ? 'mid' : 'full' },
  },
]

export function isGroupLayoff(a: Record<string, any>): boolean {
  return a.others === '50' || a.ended === 'mass' || a.ended === 'closure' || a.groupLayoff === 'yes'
}

const GROUPS: Record<Country, Array<{ id: string; title: string; subtitle: string }>> = {
  CA: [
    { id: 'you', title: 'About you', subtitle: 'you told us' },
    { id: 'offer', title: 'Your offer', subtitle: 'from your letter' },
    { id: 'contract', title: 'Your contract', subtitle: 'from your contract' },
  ],
  US: [
    { id: 'you', title: 'About you', subtitle: 'you told us' },
    { id: 'agr', title: 'Your agreement', subtitle: 'from your documents' },
    { id: 'lay', title: 'The layoff', subtitle: 'from your documents' },
  ],
}

export function rowDefs(country: Country): RowDef[] {
  return country === 'US' ? US_ROWS : CA_ROWS
}
function def(country: Country, key: string): RowDef | undefined {
  return rowDefs(country).find((r) => r.key === key)
}

// ---------------------------------------------------------------------------
// Call A facts -> document values
// ---------------------------------------------------------------------------
const OLD_KEYS: Record<string, string> = { contract_date: 'contract_start', job_title_in_contract: 'job_title_contract' } // rule 19

export function normalizeCallA(out: CallAOutput | null): CallAOutput | null {
  if (!out || !Array.isArray(out.facts)) return out
  return {
    ...out,
    facts: out.facts.map((f) => ({ ...f, key: OLD_KEYS[f.key] || f.key })),
    missing: (out.missing || []).map((k) => OLD_KEYS[k] || k),
  }
}

function factFor(ctx: CheckCtx, d: RowDef): CallAFact | null {
  const facts = (ctx.callA?.facts || []).filter((f) => f.key === d.key && f.value !== null && f.value !== undefined && String(f.value).trim() !== '')
  if (!facts.length) return null
  const wantDocs: string[] = d.source === 'contract' ? ['contract'] : d.source === 'agreement' ? ['agreement', 'letter', 'contract'] : ['letter', 'agreement', 'contract']
  facts.sort((a, b) => {
    const da = wantDocs.indexOf(a.document), db = wantDocs.indexOf(b.document)
    if (da !== db) return (da < 0 ? 99 : da) - (db < 0 ? 99 : db)
    return (a.confidence === 'low' ? 1 : 0) - (b.confidence === 'low' ? 1 : 0)
  })
  return facts[0]
}

function normalizeDoc(ctx: CheckCtx, d: RowDef, raw: string): unknown {
  if (d.normalize) return d.normalize(raw, ctx)
  switch (d.type) {
    case 'money': return parseMoney(raw) ?? raw
    case 'weeks': return parseWeeks(raw) ?? raw
    case 'days': return parseDays(raw) ?? raw
    case 'date': return parseDate(raw) ?? raw
    case 'number': return num(raw) ?? raw
    default: return raw
  }
}

function docValue(ctx: CheckCtx, key: string): unknown {
  const d = def(ctx.country, key)
  if (!d) return null
  const f = factFor(ctx, d)
  return f ? normalizeDoc(ctx, d, String(f.value)) : null
}

function docWord(ctx: CheckCtx, doc: string): string {
  if (doc === 'contract') return 'contract'
  if (doc === 'agreement') return 'agreement'
  return ctx.country === 'US' ? 'agreement' : 'letter'
}

function sourceLine(ctx: CheckCtx, doc: string, where: string | null | undefined): string {
  const w = docWord(ctx, doc)
  return where ? `Your ${w}, ${where}` : `Your ${w}`
}

// ---------------------------------------------------------------------------
// row state helpers
// ---------------------------------------------------------------------------
function contractIn(ctx: CheckCtx) {
  return ctx.contractStatus === 'added'
}
function noContractRow(ctx: CheckCtx, d: RowDef) {
  return ctx.country === 'CA' && d.group === 'contract' && !contractIn(ctx)
}
function rowVisible(ctx: CheckCtx, d: RowDef): boolean {
  if (d.only && !d.only(ctx)) return false
  if (d.onlyIfFound && !factFor(ctx, d)) return false
  return true
}
function rowRequired(ctx: CheckCtx, d: RowDef): boolean {
  if (!rowVisible(ctx, d)) return false
  if (noContractRow(ctx, d)) return false
  return d.required ? d.required(ctx) : true
}

/** Lazily creates the stored record for a row (mirrors rec() in the prototype). */
export function rec(ctx: CheckCtx, key: string): CheckRowState {
  const d = def(ctx.country, key)
  if (!d) throw new Error(`Unknown check row: ${key}`)
  if (!ctx.check.rows[key]) {
    const f = d.source === 'answers' ? null : factFor(ctx, d)
    ctx.check.rows[key] = {
      value: null,
      source: d.source === 'answers' ? 'answers' : ((f?.document as RowSource) || d.source),
      status: null,
      doc_value: d.source === 'answers' ? null : f ? normalizeDoc(ctx, d, String(f.value)) : null,
      user_value: null,
      quote: f?.quote || null,
      where: d.source === 'answers' ? 'From your answers' : sourceLine(ctx, f?.document || d.source, f?.where),
    }
  }
  return ctx.check.rows[key]
}

function current(ctx: CheckCtx, d: RowDef): unknown {
  const o = rec(ctx, d.key)
  if (o.status) return o.value
  return d.source === 'answers' ? (d.fromAnswers ? d.fromAnswers(ctx.answers) : null) : o.doc_value
}

export function needsAck(o: CheckRowState) {
  return o.status === 'corrected' && !o.change_ack
}
function counted(o: CheckRowState) {
  return !!o.status && !needsAck(o)
}

function optionsOf(ctx: CheckCtx, d: RowDef): Opt[] | undefined {
  return typeof d.options === 'function' ? d.options(ctx) : d.options
}

export function display(ctx: CheckCtx, d: RowDef, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'Not answered'
  const typed = typeof v === 'number' || /^\d{4}-\d{2}-\d{2}$/.test(String(v)) || !!optionsOf(ctx, d)?.some((o) => o[0] === v)
  if (d.display && typed) return d.display(v, ctx)
  if (d.type === 'money' && typeof v === 'number') return fmtMoney(v, ctx.country)
  if (d.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return fmtDate(v)
  if (d.type === 'weeks' && typeof v === 'number') return `${v} weeks`
  if (d.type === 'days' && typeof v === 'number') return `${v} days`
  if (d.type === 'choice') {
    const o = optionsOf(ctx, d)?.find((x) => x[0] === v)
    if (o) return o[1]
    return CHOICE_TXT[String(v)] || String(v)
  }
  return String(v)
}

/** Coerce a value sent by a client to the row's type. Throws on invalid input. */
export function coerce(ctx: CheckCtx, key: string, v: unknown): unknown {
  const d = def(ctx.country, key)
  if (!d) throw new Error(`Unknown check row: ${key}`)
  if (v === null || v === undefined || v === '') throw new Error('A value is required')
  switch (d.type) {
    case 'money': { const n = parseMoney(v) ?? num(v); if (n == null || n < 0) throw new Error('Enter an amount in dollars'); return n }
    case 'weeks': { const n = parseWeeks(v); if (n == null || n < 0 || n > 200) throw new Error('Enter a number of weeks'); return n }
    case 'days': { const n = parseDays(v); if (n == null || n < 0 || n > 3650) throw new Error('Enter a number of days'); return n }
    case 'number': { const n = num(v); if (n == null || n < 0 || n > 150) throw new Error('Enter a number'); return n }
    case 'date': { const s = parseDate(v); if (!s) throw new Error('Enter a date as YYYY-MM-DD'); return s }
    case 'choice': {
      const opts = optionsOf(ctx, d) || []
      const hit = opts.find((o) => o[0] === v || o[1] === v)
      if (!hit) throw new Error(`Choose one of: ${opts.map((o) => o[0]).join(', ')}`)
      return hit[0]
    }
    default: { const s = String(v).trim(); if (!s || s.length > 300) throw new Error('Enter some text (max 300 characters)'); return s }
  }
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' || typeof b === 'number') return num(a) !== null && num(a) === num(b)
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// conflicts ("Check these first") and missing ("We need one more number")
// ---------------------------------------------------------------------------
export interface ConflictCard {
  key: string
  title: string
  lead: string
  document: { value: unknown; display: string; quote: string | null; where: string | null; label: string }
  answers: { value: unknown; display: string; label: string }
}

export function conflicts(ctx: CheckCtx): ConflictCard[] {
  const out: ConflictCard[] = []
  const dismissed = new Set(ctx.check.dismissed || [])
  for (const d of rowDefs(ctx.country)) {
    if (!d.told || !rowVisible(ctx, d) || noContractRow(ctx, d)) continue
    const o = rec(ctx, d.key)
    if (o.status || dismissed.has(d.key) || o.doc_value === null || o.doc_value === undefined) continue
    const told = d.told(ctx.answers)
    if (!told) continue
    const ok = d.match ? d.match(told.v, o.doc_value) : told.v === o.doc_value
    if (ok) continue
    const w = docWord(ctx, String(o.source))
    let lead = `Your ${w} and your answers don't match.`
    if (d.key === 'offer_amount') lead = `Your ${w} and your answers give different amounts.`
    if (d.key === 'min_only_clause') lead = told.v === 'no' ? "You told us your contract doesn't limit you. Your contract seems to." : "You weren't sure. Your contract seems to."
    out.push({
      key: d.key, title: d.label, lead,
      document: { value: o.doc_value, display: display(ctx, d, o.doc_value), quote: o.quote, where: o.where, label: `Your ${w} says` },
      answers: { value: told.v, display: told.t, label: 'You told us' },
    })
  }
  // Canada: contract start date vs years on the job
  if (ctx.country === 'CA' && contractIn(ctx) && !dismissed.has('years')) {
    const start = rec(ctx, 'contract_start')
    const yrs = rec(ctx, 'years')
    const y = num(ctx.answers.years)
    const startIso = typeof start.doc_value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(start.doc_value) ? start.doc_value : null
    if (y && startIso && !start.status && !yrs.status) {
      const lastDay = docValue(ctx, 'last_day')
      const dy = yearsBetween(startIso, typeof lastDay === 'string' && /^\d{4}/.test(lastDay) ? lastDay : null)
      if (Math.abs(y - dy) >= 1.5) {
        out.push({
          key: 'years', title: 'Years on the job', lead: "Your contract's start date doesn't match the years you gave us.",
          document: { value: Math.round(dy), display: `About ${Math.round(dy)} years`, quote: start.quote, where: start.where, label: 'Your contract says' },
          answers: { value: y, display: `About ${y} years`, label: 'You told us' },
        })
      }
    }
  }
  return out
}

export function missingCards(ctx: CheckCtx) {
  return rowDefs(ctx.country)
    .filter((d) => d.ask && rowVisible(ctx, d))
    .filter((d) => { const o = rec(ctx, d.key); return (o.doc_value === null || o.doc_value === undefined) && !o.status })
    .filter((d) => !(noContractRow(ctx, d) && d.key !== 'bonus_amount'))
    .map((d) => ({
      key: d.key, label: d.label, question: d.ask!, type: d.type, options: optionsOf(ctx, d) || null,
      extraChoices: d.key === 'working_notice_weeks' ? [['0', 'No']] : d.key === 'bonus_amount' ? [['0', 'No bonus']] : [],
    }))
}

// ---------------------------------------------------------------------------
// page model
// ---------------------------------------------------------------------------
function tagFor(o: CheckRowState): string | null {
  if (o.status === 'corrected') return 'You changed this'
  if (o.status === 'not_in_docs') return 'Not in documents'
  if (o.status === 'not_sure') return 'Not confirmed'
  return null
}

export function changesCount(ctx: CheckCtx): number {
  return Object.values(ctx.check.rows).filter((o) => o.status === 'corrected').length
}

export function buildModel(ctx: CheckCtx) {
  const defs = rowDefs(ctx.country).filter((d) => rowVisible(ctx, d))
  const rows = defs.map((d) => {
    const o = rec(ctx, d.key)
    const value = current(ctx, d)
    const f = d.source === 'answers' ? null : factFor(ctx, d)
    const notAdded = noContractRow(ctx, d)
    return {
      key: d.key,
      group: d.group,
      label: d.label,
      type: d.type,
      options: optionsOf(ctx, d) || null,
      source: o.source,
      sourceLine: d.source === 'answers' ? 'From your answers' : o.where,
      isDocumentRow: d.source !== 'answers',
      value: notAdded ? null : value,
      display: notAdded ? 'Not added' : display(ctx, d, value),
      docValue: o.doc_value,
      docDisplay: o.doc_value === null || o.doc_value === undefined ? null : display(ctx, d, o.doc_value),
      userValue: o.user_value,
      quote: o.quote,
      where: o.where,
      confidence: f?.confidence || null,
      required: rowRequired(ctx, d),
      notAdded,
      status: o.status,
      counted: counted(o),
      tag: tagFor(o),
      ask: d.ask && (o.doc_value === null || o.doc_value === undefined) ? d.ask : null,
      needsChangeAck: needsAck(o),
      changeAckText: o.status === 'corrected' ? CHANGE_ACK_TEXT : null,
      changeLine: o.status === 'corrected' && o.doc_value !== null && o.doc_value !== undefined
        ? `Your ${docWord(ctx, String(o.source))}: ${display(ctx, d, o.doc_value)} → Your value: ${display(ctx, d, o.value)}`
        : null,
      pendingSecondLook: o.pending
        ? {
            yourValue: o.pending.value,
            yourDisplay: display(ctx, d, o.pending.value),
            ...(o.pending.second_look || {}),
            documentDisplay: o.pending.second_look?.found_value != null ? display(ctx, d, normalizeDoc(ctx, d, String(o.pending.second_look.found_value))) : null,
          }
        : null,
    }
  })
  const required = rows.filter((r) => r.required)
  const confirmed = required.filter((r) => r.counted).length
  const left = required.length - confirmed
  const nChanges = changesCount(ctx)
  const firstUnconfirmed = required.find((r) => !r.counted)?.key || null
  return {
    title: PAGE_TITLE,
    subtitle: PAGE_SUB,
    country: ctx.country,
    contractStatus: ctx.contractStatus,
    noContractNote: ctx.country === 'CA' && !contractIn(ctx) ? "You didn't add a contract, so these are left out of your report." : null,
    counter: { confirmed, total: required.length, label: `${confirmed} of ${required.length} confirmed`, allSet: left === 0 },
    conflicts: conflicts(ctx),
    missing: missingCards(ctx),
    groups: GROUPS[ctx.country]
      .map((g) => ({ ...g, rows: rows.filter((r) => r.group === g.id) }))
      .filter((g) => g.rows.length > 0),
    changes: nChanges,
    finalAgreement: {
      text: FINAL_AGREEMENT_TEXT + (nChanges ? ` This includes ${nChanges} change${nChanges === 1 ? '' : 's'} you made to what your documents say.` : ''),
      attested: !!ctx.check.attested,
      attestedAt: ctx.check.attested_at,
    },
    build: {
      enabled: left === 0 && !!ctx.check.attested,
      allRequiredConfirmed: left === 0,
      label: left === 0 ? 'Build my report (PDF) →' : `Confirm ${left} more to build your report`,
      firstUnconfirmedKey: firstUnconfirmed,
    },
  }
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
export function setRow(ctx: CheckCtx, key: string, value: unknown, status: RowStatus, opts: { user?: unknown; doc?: unknown } = {}) {
  const o = rec(ctx, key)
  o.value = value
  o.status = status
  if (opts.user !== undefined) o.user_value = opts.user
  if (opts.doc !== undefined) o.doc_value = opts.doc
  if (status === 'corrected') {
    o.change_ack = false
    o.change_ack_at = null
  } else {
    delete o.change_ack
    delete o.change_ack_at
  }
  o.pending = null
  // any change after the final agreement needs a fresh agreement
  ctx.check.attested = false
  ctx.check.attested_at = null
}

export function autoConfirmAll(ctx: CheckCtx) {
  const defs = rowDefs(ctx.country).filter((d) => rowVisible(ctx, d))
  for (const d of defs) {
    if (noContractRow(ctx, d)) continue
    const o = rec(ctx, d.key)
    if (!o.status) {
      let v = current(ctx, d)
      if (v === null || v === undefined || v === '') {
        if (d.told) {
          const told = d.told(ctx.answers)
          if (told?.v !== undefined && told?.v !== null) v = told.v
        }
      }
      if (v === null || v === undefined || v === '') {
        if (d.ask) {
          v = d.key === 'working_notice_weeks' ? '0' : d.key === 'bonus_amount' ? 0 : '0'
        } else {
          v = d.type === 'money' ? 0 : d.type === 'choice' ? 'none' : 'Not mentioned'
        }
      }
      setRow(ctx, d.key, v, 'confirmed')
      if (d.source === 'answers') writeBackToAnswers(ctx, d.key, v)
    } else if (needsAck(o)) {
      o.change_ack = true
      o.change_ack_at = new Date().toISOString()
    }
  }
}

export function writeBackToAnswers(ctx: CheckCtx, key: string, value: unknown) {
  const d = def(ctx.country, key)
  if (d?.toAnswers && value !== null && value !== undefined) d.toAnswers(value, ctx.answers)
}

export function rowDef(ctx: CheckCtx, key: string) {
  const d = def(ctx.country, key)
  if (!d || !rowVisible(ctx, d)) return null
  return d
}

export function normalizeFoundValue(ctx: CheckCtx, key: string, raw: string | null): unknown {
  const d = def(ctx.country, key)
  if (!d || raw === null) return raw
  return normalizeDoc(ctx, d, raw)
}

/** Export for Call B: state.check -> confirmed_facts (spec section 4). */
export function exportConfirmedFacts(ctx: CheckCtx) {
  const rows: Record<string, unknown> = {}
  for (const d of rowDefs(ctx.country)) {
    if (!rowVisible(ctx, d) || noContractRow(ctx, d)) continue
    const o = ctx.check.rows[d.key]
    if (!o || !o.status) continue
    rows[d.key] = {
      value: o.value,
      source: o.source,
      status: o.status,
      doc_value: o.doc_value ?? null,
      user_value: o.user_value ?? null,
      quote: o.quote ?? null,
      where: o.where ?? null,
      change_ack: o.status === 'corrected' ? !!o.change_ack : undefined,
      change_ack_at: o.status === 'corrected' ? o.change_ack_at || null : undefined,
    }
  }
  return { rows, attested: !!ctx.check.attested, attested_at: ctx.check.attested_at }
}

/** Confirmed (or acknowledged-corrected) value of a row, for the rules engine. */
export function confirmedValue(ctx: CheckCtx, key: string): unknown {
  const o = ctx.check.rows[key]
  if (!o || !o.status) return null
  if (o.status === 'confirmed') return o.value
  if (o.status === 'corrected') return o.change_ack ? o.value : null
  return null
}
