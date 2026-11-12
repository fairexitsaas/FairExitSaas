/**
 * Call B output: shape check, rule checks (citations and dollar amounts), and the HTML the PDF
 * is printed from.
 * 
 * Recreates the exact high-fidelity visual design, page layout, cards, typography, tables,
 * and section structure from the Canada (ca1.png-ca23.png) and US (us1.png-us22.png) reference templates.
 */
import fs from 'fs'
import path from 'path'
import { fmtLongDate, fmtMoney } from './values'
import type { SourceRow } from './regionData'
import type { Jurisdiction } from './jurisdictions'

export interface ReportJson {
  cover: { role_line: string; place_line: string; name_line?: string | null }
  glance: string
  contract_note?: string
  confirmed_line: string
  checks: Array<{
    topic: string
    letter_says?: string
    contract_says?: string
    rule_says?: string
    status: 'ok' | 'bad' | 'ask' | 'info'
    why?: string
    source_id?: string | null
    from_answers?: boolean
  }>
  factors?: {
    service?: number
    age?: number
    job_level?: number
    similar_jobs?: number
    reasons?: Record<string, string>
  }
  release_check?: Array<{
    status: string
    point: string
    detail: string
    source_id?: string | null
  }>
  myths?: Array<{
    myth: string
    fact: string
    source_id?: string | null
  }>
  clauses?: Array<{
    title: string
    status: string
    what_it_says: string
    what_it_means: string
    question_to_ask: string
    source_id?: string | null
  }>
  questions: string[]
  next_steps: string[]
  citations_used: string[]
}

const REQUIRED = ['cover', 'glance', 'confirmed_line', 'checks', 'questions', 'next_steps', 'citations_used'] as const

export function validateShape(out: any): { ok: boolean; problems: string[]; report: ReportJson } {
  const problems: string[] = []
  if (!out || typeof out !== 'object') return { ok: false, problems: ['output is not an object'], report: out }
  if (out.error) return { ok: false, problems: [`model returned error: ${out.error}`], report: out }
  for (const k of REQUIRED) if (out[k] === undefined) problems.push(`missing key: ${k}`)
  if (out.checks && !Array.isArray(out.checks)) problems.push('checks is not an array')
  for (const k of ['questions', 'next_steps', 'citations_used', 'myths', 'clauses', 'release_check']) {
    if (out[k] !== undefined && !Array.isArray(out[k])) problems.push(`${k} is not an array`)
  }
  const report: ReportJson = {
    myths: [], clauses: [], ...out,
    checks: Array.isArray(out.checks) ? out.checks : [],
    questions: Array.isArray(out.questions) ? out.questions : [],
    next_steps: Array.isArray(out.next_steps) ? out.next_steps : [],
    citations_used: Array.isArray(out.citations_used) ? out.citations_used : [],
  }
  return { ok: problems.length === 0, problems, report }
}

/** Soft checks against prompt rules 1, 2 and U2. */
export function ruleWarnings(report: ReportJson, allowedSourceIds: string[], allowedAmounts: number[]): string[] {
  const warn: string[] = []
  const ids = new Set(allowedSourceIds)
  const cited = new Set<string>(report.citations_used || [])
  const walk = (v: unknown, fn: (s: string, path: string) => void, path = '') => {
    if (typeof v === 'string') fn(v, path)
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, fn, `${path}[${i}]`))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => {
      if (k === 'source_id' && typeof x === 'string' && x) cited.add(x)
      walk(x, fn, path ? `${path}.${k}` : k)
    })
  }
  const allowed = allowedAmounts.filter((n) => Number.isFinite(n)).map((n) => Math.round(n))
  walk(report, (s, path) => {
    if (/\bpage \d+\b|next page/i.test(s)) warn.push(`U2: page reference at ${path}`)
    if (/\byou should\b/i.test(s)) warn.push(`tone: "you should" at ${path}`)
    if (/\(check\)|\bunverified\b|\bTBD\b/.test(s)) warn.push(`H1: banned word at ${path}`)
    for (const m of s.matchAll(/\$\s?([0-9][0-9,]*(?:\.\d+)?)/g)) {
      const n = Math.round(parseFloat(m[1].replace(/,/g, '')))
      if (!allowed.some((a) => Math.abs(a - n) <= 1)) warn.push(`rule 2: amount $${m[1]} at ${path} is not in confirmed_facts, minimum or range`)
    }
  })
  for (const id of cited) if (!ids.has(id)) warn.push(`rule 1: source_id ${id} is not in the given sources`)
  return warn
}

/**
 * Item 03: words run together where italic meets normal text ("Yourrelease", "afterthe").
 * Moves any space that sits just inside an <em>/<i>/<b>/<strong> tag to just outside it,
 * and adds a space where a closing tag is glued straight onto the next word.
 */
export function fixItalicSpaces(html: string): string {
  return html
    // "<em>Your </em>release" -> "<em>Your</em> release"
    .replace(/(\s+)<\/(em|i|b|strong)>/g, '</$2>$1')
    // "after<em> the</em>" -> "after <em>the</em>"
    .replace(/<(em|i|b|strong)(\s[^>]*)?>(\s+)/g, '$3<$1$2>')
    // "<em>Your</em>release" -> "<em>Your</em> release" (only when a letter follows directly)
    .replace(/<\/(em|i)>(?=[A-Za-z0-9])/g, '</$1> ')
}

// ---------------------------------------------------------------------------
// HTML & Asset Helpers
// ---------------------------------------------------------------------------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

function getAssetPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../assets', filename),
    path.resolve(__dirname, '../../../backend/assets', filename),
    path.resolve(process.cwd(), 'assets', filename),
    path.resolve(process.cwd(), 'backend/assets', filename),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return ''
}

let cachedHeroBand = ''
let cachedLogo = ''
let cachedQrSvg = ''
let cachedFontsCss = ''

function getFontsCss(): string {
  if (cachedFontsCss) return cachedFontsCss
  const p = getAssetPath('fonts.css')
  if (p) {
    try {
      cachedFontsCss = fs.readFileSync(p, 'utf8')
    } catch { /* empty */ }
  }
  return cachedFontsCss
}

function getHeroBandBase64(): string {
  if (cachedHeroBand) return cachedHeroBand
  const p = getAssetPath('hero-band.png')
  if (p) {
    try {
      cachedHeroBand = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
    } catch { /* empty */ }
  }
  return cachedHeroBand
}

function getLogoBase64(): string {
  if (cachedLogo) return cachedLogo
  const p = getAssetPath('logo.png')
  if (p) {
    try {
      cachedLogo = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
    } catch { /* empty */ }
  }
  return cachedLogo
}

function getQrSvg(): string {
  if (cachedQrSvg) return cachedQrSvg
  const p = getAssetPath('report-qr.svg')
  if (p) {
    try {
      cachedQrSvg = fs.readFileSync(p, 'utf8')
    } catch { /* empty */ }
  }
  return cachedQrSvg || '<svg viewBox="0 0 100 100" width="90" height="90"><rect width="100" height="100" fill="#f0f2f5"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="#5a6b78">QR Code</text></svg>'
}

const STATUS_LABEL: Record<string, string> = {
  ok: 'Lines up',
  bad: "Doesn't line up",
  ask: 'Ask about it',
  info: 'Good to know',
}

export interface RenderMeta {
  reportId: string
  jurisdiction: Jurisdiction
  sources: SourceRow[]
  rulesAsOf: string | null
  attestedAt: string | null
  generatedAt: string
  pages?: Record<string, number>
  numbers?: ReportNumbers | null
  answers?: Record<string, any>
  input?: any
}

export interface ReportNumbers {
  country: 'CA' | 'US'
  minimum: { amount: number | null; weeks: number | null; terminationWeeks?: number | null; severanceWeeks?: number | null; weeklyPay?: number | null; none: boolean; statute_short?: string; arithmetic?: string }
  range: { low: number; high: number; lowMonths: number; highMonths: number; basis: string } | null
  offer: number | null
  gauge: { low: number; high: number; offer: number; position: number; label: string } | null
  factorValues: Record<string, string>
}

export function reportNumbers(input: Record<string, any> | null | undefined): ReportNumbers | null {
  if (!input?.jurisdiction) return null
  const country = input.jurisdiction.country as 'CA' | 'US'
  const rows = input.confirmed_facts?.rows || {}
  const val = (k: string) => {
    const r = rows[k]
    if (!r || !(r.status === 'confirmed' || (r.status === 'corrected' && r.change_ack))) return null
    return r.value
  }
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const m = input.minimum || {}
  const offer = n(val('offer_amount'))
  const range = input.range && Number.isFinite(input.range.high) ? input.range : null
  let gauge: ReportNumbers['gauge'] = null
  if (country === 'CA' && range && n(m.amount) !== null && offer !== null && range.high > m.amount) {
    const position = Math.max(0, Math.min(1, (offer - m.amount) / (range.high - m.amount)))
    const label = offer < m.amount
      ? 'Your offer — below the legal minimum'
      : position < 1 / 3
        ? 'Your offer — on the low end'
        : position < 2 / 3
          ? 'Your offer — in the middle'
          : 'Your offer — on the high end'
    gauge = { low: m.amount, high: range.high, offer, position, label }
  }
  const a = input.answers || {}
  const years = val('years') ?? a.years
  const age = val('age') ?? a.age
  const factorValues: Record<string, string> = {}
  if (years != null) factorValues.service = `${years} years`
  if (age != null) factorValues.age = String(age)
  if (val('role') || a.role) factorValues.job_level = String(val('role') || a.role)
  if (a.similar_jobs) factorValues.similar_jobs = String(a.similar_jobs).replace(/ similar jobs nearby$/, '')
  return {
    country,
    minimum: { amount: n(m.amount), weeks: n(m.weeks), terminationWeeks: n(m.terminationWeeks), severanceWeeks: n(m.severanceWeeks), weeklyPay: n(m.weekly_pay), none: !!m.none, statute_short: m.statute_short, arithmetic: m.arithmetic },
    range: range ? { low: range.low, high: range.high, lowMonths: range.lowMonths, highMonths: range.highMonths, basis: range.basis } : null,
    offer,
    gauge,
    factorValues,
  }
}

/** Semicircle gauge matching sample PDF ca8.png */
function gaugeSvg(frac: number): string {
  const cx = 120, cy = 100, r = 76, sw = 16
  const pt = (f: number, rad: number) => {
    const t = Math.PI * (1 - f)
    return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)]
  }
  const arc = (f0: number, f1: number, col: string) => {
    const p0 = pt(f0, r), p1 = pt(f1, r)
    return `<path d="M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
  }
  const g = 0.05
  let h = ''
  ;[[0, 1 / 3, '#E0574A'], [1 / 3, 2 / 3, '#EEB33C'], [2 / 3, 1, '#1FB487']].forEach((s, i) => {
    h += arc((s[0] as number) + (i ? g / 2 : 0.01), (s[1] as number) - (i < 2 ? g / 2 : 0.01), s[2] as string)
  })
  const clamped = Math.max(0.12, Math.min(0.88, frac))
  const nd = pt(clamped, r - 22)
  h += `<line x1="${cx}" y1="${cy}" x2="${nd[0].toFixed(2)}" y2="${nd[1].toFixed(2)}" stroke="#062C55" stroke-width="4.5" stroke-linecap="round"/>`
  h += `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#062C55"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="#FFFFFF"/>`
  return `<svg class="gauge" width="380" height="190" viewBox="0 0 240 120">${h}</svg>`
}

/** Radar / Diamond chart matching sample PDF ca9.png */
function radarSvg(factors?: ReportJson['factors']): string {
  const cx = 165, cy = 125, r = 68
  const s = Math.max(0.05, Math.min(1, typeof factors?.service === 'number' ? factors.service : 0.2))
  const a = Math.max(0.05, Math.min(1, typeof factors?.age === 'number' ? factors.age : 0.1))
  const j = Math.max(0.05, Math.min(1, typeof factors?.job_level === 'number' ? factors.job_level : 0.5))
  const m = Math.max(0.05, Math.min(1, typeof factors?.similar_jobs === 'number' ? factors.similar_jobs : 0.1))

  const pTop = [cx, cy - s * r]
  const pRight = [cx + a * r, cy]
  const pBottom = [cx, cy + j * r]
  const pLeft = [cx - m * r, cy]

  const gridDiamonds = [0.33, 0.66, 1].map((scale) => {
    return `<polygon points="${cx},${cy - scale * r} ${cx + scale * r},${cy} ${cx},${cy + scale * r} ${cx - scale * r},${cy}" fill="none" stroke="#E2E7EB" stroke-width="1"/>`
  }).join('')

  const axes = `
    <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#E2E7EB" stroke-width="1"/>
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#E2E7EB" stroke-width="1"/>
  `

  const poly = `<polygon points="${pTop[0]},${pTop[1]} ${pRight[0]},${pRight[1]} ${pBottom[0]},${pBottom[1]} ${pLeft[0]},${pLeft[1]}" fill="#0EB28D" fill-opacity="0.22" stroke="#0EB28D" stroke-width="2.5"/>`
  const centerDot = `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#062C55"/>`

  return `
    <div class="radar-box">
      <svg width="240" height="214" viewBox="0 0 280 250">
        ${gridDiamonds}
        ${axes}
        ${poly}
        ${centerDot}
        <text x="${cx}" y="${cy - r - 10}" text-anchor="middle" font-family="'DM Sans', sans-serif" font-size="7.5pt" font-weight="700" fill="#062C55">Length of service</text>
        <text x="${cx + r + 8}" y="${cy + 4}" text-anchor="start" font-family="'DM Sans', sans-serif" font-size="7.5pt" font-weight="700" fill="#062C55">Age</text>
        <text x="${cx}" y="${cy + r + 18}" text-anchor="middle" font-family="'DM Sans', sans-serif" font-size="7.5pt" font-weight="700" fill="#062C55">Job level</text>
        <text x="${cx - r - 8}" y="${cy + 4}" text-anchor="end" font-family="'DM Sans', sans-serif" font-size="7.5pt" font-weight="700" fill="#062C55">Similar jobs</text>
      </svg>
    </div>
  `
}

function progressDots(active: number, total = 5): string {
  let dots = ''
  for (let i = 1; i <= total; i++) {
    dots += `<span class="p-dot ${i === active ? 'active' : i < active ? 'done' : ''}"></span>`
  }
  return `<div class="p-dots">${dots}</div>`
}

function pageFooter(curPage: number, totalPages: number): string {
  return `
    <div class="page-footer">
      <div class="page-footer-pill">
        <b>General information, not legal advice.</b> We've done our best to make this clear and accurate, but please check the details before you act. If anything feels unclear, a professional can help.
      </div>
      <div class="page-footer-num">Page ${curPage} of ${totalPages}</div>
    </div>
  `
}

function sectionCoverFooter(curPage: number, totalPages: number): string {
  return `
    <div class="page-footer page-footer-slim">
      <div class="page-footer-num">Page ${curPage} of ${totalPages}</div>
    </div>
  `
}

/** "ontario.ca · Your guide to the ESA, Termination of employment" style label for a source row. */
function sourceLabel(s: SourceRow): string {
  let host = ''
  try { host = new URL(s.url).hostname.replace(/^www\d?\./, '') } catch { /* no url */ }
  const section = String(s.section || '').split(' (')[0].replace(/^Your guide to the [A-Z]+,\s*/i, '').trim()
  const short = section.length > 60 ? `${section.slice(0, 57).trim()}…` : section
  return [host || s.rule, short].filter(Boolean).join(' · ')
}

function sourceLink(id: string | null | undefined, m: RenderMeta): string {
  if (!id) return ''
  const s = m.sources.find((x) => x.id === id)
  if (!s) return ''
  return s.url
    ? `<a class="src-link" href="${esc(s.url)}">${esc(sourceLabel(s))}</a>`
    : `<b>${esc(sourceLabel(s))}</b>`
}

function displayUrl(u: string): string {
  return String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** Round status icon drawn as SVG (same look in every PDF renderer, no font glyphs). */
const STATUS_ICON_COLOR: Record<string, string> = { ok: '#0C7860', bad: '#B42014', ask: '#D0981C', info: '#6B7A86' }
function statusIcon(status: string, size = 21): string {
  const st = status === 'ok' || status === 'bad' || status === 'ask' ? status : 'info'
  const mark = st === 'ok'
    ? '<path d="M6.2 10.4l2.6 2.6 5-5.6" fill="none" stroke="#FFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
    : st === 'bad'
      ? '<path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="#FFF" stroke-width="1.7" stroke-linecap="round"/>'
      : st === 'ask'
        ? '<path d="M10 5.6v5.3" stroke="#FFF" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14" r="1.15" fill="#FFF"/>'
        : '<circle cx="10" cy="6.3" r="1.15" fill="#FFF"/><path d="M10 9.2v5.2" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>'
  return `<svg class="status-icon-svg" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="${STATUS_ICON_COLOR[st]}"/>${mark}</svg>`
}

/** Bold the leading action of a step ("Apply for EI within 4 weeks" -> "<b>Apply for EI</b> within 4 weeks"). */
function boldLead(step: string): string {
  const colon = step.indexOf(':')
  if (colon > 0 && colon < 40) return `<b>${esc(step.slice(0, colon + 1))}</b>${esc(step.slice(colon + 1))}`
  if (/^(if|when|once|before|after|while|because|since|unless)\b/i.test(step)) return esc(step)
  const words = step.split(' ')
  const stop = /^(to|within|with|by|until|since|so|whether|if|before|after|in|on|at|from|about|because)$/i
  const weakStop = /^(for|this|that|and|or|the|a|an)$/i
  let n = 0
  while (n < words.length && n < 5) {
    const wd = words[n].replace(/[^A-Za-z]/g, '')
    if (n >= 1 && stop.test(wd)) break
    if (n >= 2 && weakStop.test(wd)) break
    n++
    if (/[,.;)]$/.test(words[n - 1])) break
  }
  if (n === 0 || n >= words.length) return esc(step)
  const lead = words.slice(0, n).join(' ').replace(/[,;]$/, '')
  return `<b>${esc(lead)}</b>${esc(step.slice(lead.length))}`
}

/** The check that covers the same point as a clause (shared words in title/quotes, same source). */
const STOP_WORDS = new Set(['your', 'the', 'and', 'for', 'are', 'too', 'with', 'what', 'that', 'this', 'from', 'about', 'only', 'pay', 'not', 'you', 'they', 'will', 'has', 'have', 'was', 'its', 'any', 'all', 'but', 'says', 'said'])
const SYNONYMS: Record<string, string> = { insurance: 'benefits', disability: 'benefits', dental: 'benefits', health: 'benefits', payout: 'notice', termination: 'notice', entitlements: 'minimum', minimum: 'minimum', eight: '8' }
function matchingCheck(c: NonNullable<ReportJson['clauses']>[number], checks: ReportJson['checks']): ReportJson['checks'][number] | undefined {
  const words = (t: string) => {
    const out = new Set<string>()
    for (const raw of String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) {
      if (raw.length < 3 || STOP_WORDS.has(raw)) continue
      const w0 = raw.replace(/s$/, '')
      out.add(SYNONYMS[raw] || SYNONYMS[w0] || w0)
    }
    return out
  }
  const shared = (x: Set<string>, y: Set<string>) => [...x].filter((v) => y.has(v)).length
  const title = words(c.title)
  const quote = words(c.what_it_says)
  let best: ReportJson['checks'][number] | undefined
  let bestScore = 0
  for (const k of checks) {
    const score = 3 * shared(title, words(k.topic)) + shared(quote, words(`${k.letter_says || ''} ${k.contract_says || ''}`)) + (c.source_id && k.source_id === c.source_id ? 2 : 0)
    if (score > bestScore) { best = k; bestScore = score }
  }
  return bestScore >= 3 ? best : undefined
}

/** Rough height (px) of one row in the checks table, so pages are split before they overflow. */
function checkRowHeight(c: ReportJson['checks'][number]): number {
  const lines = (t: string | null | undefined, perLine: number) => Math.max(1, Math.ceil(String(t || '—').length / perLine))
  const why = lines(c.why, 30) + 1
  const n = Math.max(lines(c.topic, 16), lines(c.letter_says, 21), lines(c.contract_says, 19), lines(c.rule_says, 19), why)
  return 22 + n * 14.5
}

export interface Section {
  id: string
  title: string
  html: string
}

function extractAmountStr(text?: string | null): string | null {
  if (!text) return null
  const m = text.match(/\$\s?([0-9][0-9,]*)/)
  return m ? `$${m[1]}` : null
}

function deriveDynamicReportValues(r: ReportJson, m: RenderMeta) {
  const isUS = m.jurisdiction.country === 'US'
  const a = m.answers || {}
  const nb = m.numbers
  const money = (v: number) => fmtMoney(v, m.jurisdiction.country)

  // 1. Client Name (Change 02: extracted as employee_name, never use 'Client')
  const rawName = r.cover?.name_line || m.input?.confirmed_facts?.employee_name || a.employee_name || a.name || a.full_name || null
  const clientName = rawName && String(rawName).trim() !== '' && String(rawName).trim() !== 'Client' ? String(rawName).trim() : null

  // Weekly pay calculation (Change 12A: annual pay / 52 rounded to cent once at the end)
  const salaryNum = typeof a.salary === 'number' ? a.salary : typeof a.pay === 'number' ? a.pay : null
  const weeklyPayNum = salaryNum ? Math.round((salaryNum / 52) * 100) / 100 : null

  // 2. Dates
  const confirmedDateMatch = r.confirmed_line ? r.confirmed_line.match(/confirmed on ([A-Za-z]+ \d{1,2}, \d{4})/i) : null
  const dateFormatted = confirmedDateMatch ? confirmedDateMatch[1] : fmtLongDate(m.attestedAt || m.generatedAt)

  // 3. Employer
  const employerName = a.employer || a.company || 'Not stated'

  // 4. Service
  let yearsStr = nb?.factorValues?.service
  if (!yearsStr && r.cover?.role_line) {
    const sm = r.cover.role_line.match(/\b(\d+(?:\.\d+)?\s*(?:years?|yrs?)(?:\s*(?:of\s*)?service)?(?:\s*\d+\s*(?:months?|mo))?)/i)
    if (sm) yearsStr = sm[1]
  }
  if (!yearsStr && a.years) yearsStr = `${a.years} years`
  if (!yearsStr) yearsStr = 'Not stated'

  // 5. Pay / Salary
  let salaryStr = a.salary ? `$${Number(a.salary).toLocaleString()}${a.pay_unit ? ` / ${a.pay_unit}` : ' / year'}` : null
  if (!salaryStr) {
    const payCheck = r.checks?.find((c) => /pay|salary|wage/i.test(c.topic))
    const sm = payCheck?.why ? payCheck.why.match(/\$\s?([0-9,]+(?:\s*(?:a|per)\s*year)?)/i) : null
    if (sm) salaryStr = sm[0]
  }
  if (!salaryStr) salaryStr = 'Not stated'

  // 6. Offer
  const offerCheck = r.checks?.find((c) => /offer/i.test(c.topic))
  let offerStr = nb?.offer != null ? money(nb.offer) : null
  if (!offerStr && offerCheck?.letter_says) {
    offerStr = extractAmountStr(offerCheck.letter_says)
  }
  if (!offerStr) offerStr = 'Not stated'

  // Check if offer is additional to minimum
  const isOfferAdditional = /additional to|on top of/i.test(offerCheck?.letter_says || '') || /on top of/i.test(r.glance || '')

  // 7. Legal Minimum
  const minCheck = r.checks?.find((c) => /legal minimum/i.test(c.topic))
  let minAmount = nb?.minimum?.amount ?? null
  if (minAmount === null && minCheck?.rule_says) {
    const mm = minCheck.rule_says.match(/\$\s?([0-9,]+)/)
    if (mm) minAmount = parseFloat(mm[1].replace(/,/g, ''))
  }
  let minWeeks = nb?.minimum?.weeks ?? null
  if (minWeeks === null && minCheck?.rule_says) {
    const wm = minCheck.rule_says.match(/(\d+)\s*weeks?/i)
    if (wm) minWeeks = parseInt(wm[1], 10)
  }
  const minAmtStr = minAmount !== null ? money(minAmount) : (isUS ? 'None (at-will)' : 'Not stated')
  const minDisplayWithWeeks = minAmount !== null ? `${money(minAmount)}${minWeeks ? ` (${minWeeks} weeks)` : ''}` : minAmtStr

  // 8. Decide by / Deadline
  const deadlineCheck = r.checks?.find((c) => /deadline/i.test(c.topic))
  let deadlineStr = a.sign_by ? String(a.sign_by) : null
  if (!deadlineStr && deadlineCheck?.letter_says) {
    if (/no deadline/i.test(deadlineCheck.letter_says)) {
      deadlineStr = 'No deadline written'
    } else {
      deadlineStr = deadlineCheck.letter_says
    }
  }
  if (!deadlineStr && (/no date/i.test(r.glance || '') || /does not give a date/i.test(r.glance || ''))) {
    deadlineStr = 'No deadline written'
  }
  if (!deadlineStr) deadlineStr = 'Not stated'

  // 9. Range
  let rangeLow = nb?.range?.low ?? null
  let rangeHigh = nb?.range?.high ?? null
  let rangeLowMonths = nb?.range?.lowMonths ?? null
  let rangeHighMonths = nb?.range?.highMonths ?? null
  if ((rangeLow === null || rangeHigh === null) && offerCheck?.rule_says) {
    const rm = offerCheck.rule_says.match(/\$\s?([0-9,]+)\s*(?:to|–|-)\s*\$\s?([0-9,]+)/i)
    if (rm) {
      rangeLow = parseFloat(rm[1].replace(/,/g, ''))
      rangeHigh = parseFloat(rm[2].replace(/,/g, ''))
    }
    const mm = offerCheck.rule_says.match(/(\d+)\s*(?:to|–|-)\s*(\d+)\s*months/i)
    if (mm) {
      rangeLowMonths = parseInt(mm[1], 10)
      rangeHighMonths = parseInt(mm[2], 10)
    }
  }
  const lowAmt = rangeLow !== null ? money(rangeLow) : ''
  const highAmt = rangeHigh !== null ? money(rangeHigh) : ''

  return {
    clientName,
    dateFormatted,
    employerName,
    yearsStr,
    salaryStr,
    offerStr,
    isOfferAdditional,
    minAmount,
    minWeeks,
    minAmtStr,
    minDisplayWithWeeks,
    deadlineStr,
    rangeLow,
    rangeHigh,
    rangeLowMonths,
    rangeHighMonths,
    lowAmt,
    highAmt,
    weeklyPayNum,
    salaryNum,
  }
}

export function reportSections(r: ReportJson, m: RenderMeta, totalPages?: number): Section[] {
  const isUS = m.jurisdiction.country === 'US'
  const w = m.jurisdiction.words
  const nb = m.numbers
  const money = (v: number) => fmtMoney(v, m.jurisdiction.country)
  const sec: Section[] = []
  const effTotal = totalPages || (isUS ? 22 : 23)
  let curPage = 1

  const heroBandSrc = getHeroBandBase64()
  const logoSrc = getLogoBase64()
  const qrSvgCode = getQrSvg()

  const dyn = deriveDynamicReportValues(r, m)

  // -------------------------------------------------------------------------
  // 1. COVER PAGE (ca1.png / us1.png)
  // -------------------------------------------------------------------------
  const coverHtml = `
    <div class="page cover-page">
      <div class="cover-card">
        <div class="cover-hero-band">
          ${heroBandSrc ? `<img class="hero-img" src="${heroBandSrc}" alt="FairExit Illustration"/>` : '<div class="hero-placeholder"></div>'}
          <div class="hero-logo-box">
            ${logoSrc ? `<img src="${logoSrc}" class="hero-logo" alt="FairExit"/>` : '<div class="hero-logo-text">FairExit</div>'}
            <div class="hero-tagline">Challenge your severance offer</div>
          </div>
        </div>
        <div class="cover-content">
          <div class="kicker-teal">YOUR SEVERANCE REPORT</div>
          <h1 class="cover-title">Your offer, organized.</h1>
          <p class="cover-lead">
            ${isUS
              ? `We read your letter and your contract, checked them against the rules, and checked the release you're being asked to sign. Use it to understand your offer and prepare. Only an attorney can tell you what applies to you.`
              : `We read your letter and your contract, checked them against the law, and estimated the range a case like yours can reach. Use it to understand your offer and prepare. <b>It's an estimate, not a promise</b>; only a lawyer can confirm your exact number.`}
          </p>
          <div class="cover-tags-pill">
            <span>DO-IT-YOURSELF</span> · <span class="teal-bold">NOT LEGAL ADVICE</span> · <span>YOU'RE IN CONTROL</span>
          </div>
          <div class="cover-divider"></div>
          <div class="cover-meta-grid">
            ${dyn.clientName ? `
            <div class="meta-col">
              <div class="meta-label">PREPARED FOR</div>
              <div class="meta-value">${esc(dyn.clientName)}</div>
            </div>` : ''}
            <div class="meta-col">
              <div class="meta-label">ROLE</div>
              <div class="meta-value">${esc(r.cover?.role_line || dyn.yearsStr)}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">WHERE</div>
              <div class="meta-value">${esc(r.cover?.place_line || m.jurisdiction.name)}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">DATE</div>
              <div class="meta-value">${esc(dyn.dateFormatted)}</div>
            </div>
          </div>
          <div class="cover-test-note">
            <b>For information only</b> — not legal advice · Yours to keep and use
          </div>
        </div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 'cover', title: 'Cover', html: coverHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 2. CONTENTS PAGE ("What's in this report" - ca2.png / us2.png)
  // -------------------------------------------------------------------------
  const p = m.pages || {}
  const pr = (from?: number, to?: number) => (!from ? '' : !to || to <= from ? `page ${from}` : `pages ${from}–${to}`)
  const before = (id: string) => (p[id] ? p[id] - 1 : undefined)
  const tocItems = [
    { num: '1', title: 'Where you stand', desc: 'Your offer checked against the rules, and what lines up.', range: pr(p['s1_cover'], before('s2_cover')) },
    { num: '2', title: isUS ? "Why there's no minimum" : 'Two numbers to understand', desc: isUS ? "What applies to you comes from what was promised." : 'The legal minimum, and what a court might award.', range: pr(p['s2_cover'], before('s3_cover')) },
    { num: '3', title: "What's in your letter and contract", desc: 'Clause by clause, with sources.', range: pr(p['s3_cover'], before('s4_cover')) },
    { num: '4', title: 'Questions to prepare', desc: "Calm questions for HR, and this week's steps.", range: pr(p['s4_cover'], before('s5_cover')) },
    { num: '5', title: 'Your next step', desc: 'The three paths, side by side.', range: pr(p['s5_cover'], before('s6_sources')) },
    { num: '·', title: 'Where every number comes from', desc: 'Every number and rule, with its official source.', range: pr(p['s6_sources']) },
    { num: '·', title: isUS ? 'Talking to an attorney' : 'Talking to a lawyer', desc: isUS ? 'How to hand this report over, and your report ID.' : 'How to hand this report to a lawyer, and your report ID.', range: pr(p['s7_lawyer']) },
  ]

  const tocHtml = `
    <div class="page toc-page">
      <div class="section-kicker">WHAT'S INSIDE</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">What's in <i>this report.</i></h2>
      <p class="section-sub">Read it top to bottom, or jump to the page you need.</p>

      <div class="toc-list">
        ${tocItems.map((item) => `
          <div class="toc-row">
            <div class="toc-num">${item.num}</div>
            <div class="toc-body">
              <div class="toc-title">${esc(item.title)}</div>
              <div class="toc-desc">${esc(item.desc)}</div>
            </div>
            <div class="toc-range">${esc(item.range)}</div>
          </div>
        `).join('')}
      </div>

      <div class="legend-card">
        <div class="legend-header"><b>How to read the ${isUS ? 'colors' : 'colours'}:</b> they always mean the same thing.</div>
        <div class="legend-pills">
          <span class="pill pill-green">Green · lines up</span>
          <span class="pill pill-red">Red · doesn't line up</span>
          <span class="pill pill-yellow">Yellow · ask about it</span>
          <span class="pill pill-gray">Gray · good to know</span>
          <span class="pill pill-navy">Dark blue · your key number</span>
        </div>
        <p class="legend-text">
          ${isUS
            ? `US law sets no minimum severance, so this report checks <b>what your own documents promise</b> and <b>the rules that protect you when you sign a release</b>. It doesn't promise an amount or tell you what to do.`
            : `This report checks your offer against ${esc(m.jurisdiction.name)}'s rules and gives you an <b>estimated range</b>: the legal minimum (a fixed rule) up to what courts often award for someone like you (an estimate). It doesn't promise an amount or tell you what to do.`}
        </p>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 'toc', title: "What's in this report", html: tocHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 3. BEFORE YOU USE THIS ("The important stuff — please read" - ca3.png / us3.png)
  // -------------------------------------------------------------------------
  const aLawyer = isUS ? 'an attorney' : 'a lawyer'
  const lawyerClient = isUS ? 'an attorney–client' : 'a lawyer–client'
  const beforeCards = [
    { num: '1', title: 'This is a do-it-yourself report', text: `This is designed for you to use <b>on your own</b>. It organizes your offer and prepares questions — it is <b>not</b> advice ${aLawyer} would give you after reviewing your full situation, and ${aLawyer} may see things very differently. Anything you choose to send or say, you're doing <b>on your own initiative</b>.` },
    { num: '2', title: 'Information, not legal advice', text: `This pack gives you information to help you prepare. It does <b>not</b> make FairExit your ${w.lawyer} and does not create ${lawyerClient} relationship. Nothing here is legal advice.` },
    { num: '3', title: 'We use AI — mistakes can happen', isAlert: true, text: `The explanations, notes, and draft questions are produced by <b>software and AI</b> from general rules and the details you gave us. <b>AI can be wrong, details can be misread, and laws change</b>. It is up to you to read everything carefully and confirm every fact is correct before you rely on it.` },
    { num: '4', title: 'No guarantee — and the decisions are yours', text: `Any general information here can be wrong, and outcomes depend on your paperwork and your situation. <b>FairExit accepts no responsibility for what you send, say, or decide based on this report</b> — those choices are entirely yours. Deadlines to act can be short; confirm them with ${aLawyer} promptly.` },
    { num: '5', title: `Only ${aLawyer} can give you the exact answer`, text: `We provide clarity in an organized way. <b>Only a licensed employment ${w.lawyer}</b> can confirm your estimate, review your real contract, and advise you. If anything feels urgent or serious — especially before you sign anything — speak to ${aLawyer}. The first call is often free.` },
    { num: '6', title: `Once ${aLawyer} takes your case, follow them`, text: `Everything here is <b>general and organizational</b>. If you retain ${aLawyer}, their advice <b>supersedes</b> anything in this report — follow your ${w.lawyer}, not this document. <b>Do not rely on this report once you're working with ${aLawyer}</b>.` },
  ]

  const beforeHtml = `
    <div class="page before-page">
      <div class="section-kicker">BEFORE YOU USE THIS</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">The important stuff — <i>please read.</i></h2>
      <p class="section-sub">Straight talk about what this pack is, what it isn't, and where the responsibility sits.</p>

      <div class="before-cards-grid">
        ${beforeCards.map((c) => `
          <div class="before-card ${c.isAlert ? 'alert-card' : ''}">
            <div class="card-num-title">${c.num} · ${esc(c.title)}</div>
            <div class="card-body-text">${c.text}</div>
          </div>
        `).join('')}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 'before', title: 'Before you use this', html: beforeHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 4. SECTION 1 COVER: Where you stand (ca4.png / us4.png)
  // -------------------------------------------------------------------------
  const s1CoverHtml = `
    <div class="page section-cover-page s1-cover">
      <div class="section-kicker">SECTION 1 OF 5 · WHERE YOU STAND</div>
      <div class="huge-section-digit">1</div>
      <h2 class="huge-section-title">Where you stand</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">
        Your offer, checked against the rules. What they offered, what the rules say, and what lines up and what doesn't. If you only read one section, read this one.
      </p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        <div class="its-item">Your offer at a glance</div>
        ${r.myths && r.myths.length ? `<div class="its-item">Things they don't always tell you</div>` : ''}
        <div class="its-item">Did they do it right?</div>
        ${isUS ? (r.release_check && r.release_check.length ? '<div class="its-item">Your release check</div>' : '') : '<div class="its-item">Your estimated range</div>'}
        ${!isUS ? '<div class="its-item">What lifts your range</div>' : ''}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's1_cover', title: 'Section 1 · Where you stand', html: s1CoverHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 4.1 AT A GLANCE (ca5.png / us5.png)
  // -------------------------------------------------------------------------
  const a = m.answers || {}
  const glanceHtml = `
    <div class="page glance-page">
      <div class="section-kicker-bar">
        <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
        ${progressDots(1)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Your offer, <i>at a glance.</i></h2>
      <p class="section-sub">The short version before the detail.</p>

      <div class="glance-card">
        <div class="glance-narrative">
          <p class="glance-lead">${esc(r.glance).replace(/(\$[0-9][0-9,]*(?:\.\d+)?)/g, '<b>$1</b>')}</p>
          ${r.contract_note ? `<p class="glance-contract-note">${esc(r.contract_note)}</p>` : ''}
        </div>
        <div class="glance-table">
          ${dyn.employerName && dyn.employerName !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">Employer</span>
            <span class="glance-col-val bold">${esc(dyn.employerName)}</span>
          </div>` : ''}
          ${dyn.yearsStr && dyn.yearsStr !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">${isUS ? 'Service' : 'Years of service'}</span>
            <span class="glance-col-val bold">${esc(dyn.yearsStr)}</span>
          </div>` : ''}
          ${isUS && a.age ? `
            <div class="glance-row">
              <span class="glance-col-label">Age</span>
              <span class="glance-col-val bold">${esc(String(a.age))}</span>
            </div>` : ''}
          ${dyn.salaryStr && dyn.salaryStr !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">Your pay</span>
            <span class="glance-col-val bold">${esc(dyn.salaryStr)}</span>
          </div>` : ''}
          ${dyn.offerStr && dyn.offerStr !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">They offered</span>
            <span class="glance-col-val bold">${esc(dyn.offerStr)}</span>
          </div>` : ''}
          ${!isUS && dyn.minDisplayWithWeeks && dyn.minDisplayWithWeeks !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">Legal minimum</span>
            <span class="glance-col-val bold">${esc(dyn.minDisplayWithWeeks)}</span>
          </div>` : ''}
          ${dyn.deadlineStr && dyn.deadlineStr !== 'Not stated' ? `
          <div class="glance-row">
            <span class="glance-col-label">Decide by</span>
            <span class="glance-col-val bold">${esc(dyn.deadlineStr)}</span>
          </div>` : ''}
        </div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's1_glance', title: 'Your offer, at a glance', html: glanceHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 4.2 MYTHS: "Things they don't always tell you" (ca6.png / us6.png)
  // -------------------------------------------------------------------------
  const myths = r.myths || []

  const mythsHtml = `
    <div class="page myths-page">
      <div class="section-kicker">BEFORE YOU DECIDE</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Things they don't always <i>tell you.</i></h2>
      <p class="section-sub">Here's what the official rules say, so you can decide on your timeline, not theirs. Every point links to a government source.</p>

      <div class="myths-list">
        ${myths.map((mth) => `
          <div class="myth-card">
            <div class="myth-col-left">
              <div class="myth-header">WHAT PEOPLE OFTEN THINK</div>
              <div class="myth-text">“${esc(mth.myth).replace(/^["“]|["”]$/g, '')}”</div>
            </div>
            <div class="myth-col-right">
              <div class="myth-header">WHAT THE OFFICIAL RULES SAY</div>
              <div class="rule-text">${esc(mth.fact)}</div>
              ${sourceLink(mth.source_id, m) ? `<div class="myth-source">Source: ${sourceLink(mth.source_id, m)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  if (myths.length) {
    sec.push({ id: 's1_myths', title: "Things they don't always tell you", html: mythsHtml })
    curPage += 1
  }

  // -------------------------------------------------------------------------
  // 4.3 CHECKS TABLE: "Did they do it right?" (ca7.png / us7.png)
  // -------------------------------------------------------------------------
  const allChecks = r.checks || []
  const countOk = allChecks.filter((c) => c.status === 'ok').length
  const countBad = allChecks.filter((c) => c.status === 'bad').length
  const countAsk = allChecks.filter((c) => c.status === 'ask').length
  const countInfo = allChecks.filter((c) => c.status === 'info').length

  // Fill each page by estimated height (first page has the summary pills).
  const CHECKS_BUDGET_FIRST = 560
  const CHECKS_BUDGET_CONT = 640
  const checkChunks: Array<typeof allChecks> = [[]]
  let used = 0
  for (const c of allChecks) {
    const h = checkRowHeight(c)
    const budget = checkChunks.length === 1 ? CHECKS_BUDGET_FIRST : CHECKS_BUDGET_CONT
    if (checkChunks[checkChunks.length - 1].length && used + h > budget) {
      checkChunks.push([])
      used = 0
    }
    checkChunks[checkChunks.length - 1].push(c)
    used += h
  }

  checkChunks.forEach((chunk, chunkIdx) => {
    const isFirst = chunkIdx === 0
    const checksHtml = `
      <div class="page checks-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(1)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">${isFirst ? 'Did they do it <i>right?</i>' : 'Did they do it <i>right?</i> (continued)'}</h2>
        <p class="section-sub">${isFirst ? 'Your letter, your contract and the rules, side by side. Green = it lines up. Red = it doesn\'t. Yellow = worth asking about.' : 'Your letter, your contract and the rules, side by side (continued).'}</p>

        ${isFirst ? `
          <div class="checks-summary-pills">
            ${countOk ? `<span class="pill pill-green">${countOk} LINE UP</span>` : ''}
            ${countBad ? `<span class="pill pill-red">${countBad} DON'T</span>` : ''}
            ${countAsk ? `<span class="pill pill-yellow">${countAsk} TO ASK ABOUT</span>` : ''}
            ${countInfo && !countOk && !countBad && !countAsk ? `<span class="pill pill-gray">${countInfo} GOOD TO KNOW</span>` : ''}
          </div>
        ` : ''}

        <div class="checks-cards-list">
          <div class="checks-header-row">
            <div class="ch-col col-1">WHAT WE CHECKED</div>
            <div class="ch-col col-2">YOUR LETTER SAYS</div>
            <div class="ch-col col-3">YOUR CONTRACT SAYS</div>
            <div class="ch-col col-4">THE RULES SAY</div>
            <div class="ch-col col-5">DOES IT LINE UP?</div>
          </div>
          ${chunk.map((c) => {
            const st = c.status || 'info'
            const badgeClass = st === 'ok' ? 'badge-ok' : st === 'bad' ? 'badge-bad' : st === 'ask' ? 'badge-ask' : 'badge-info'
            return `
              <div class="check-card-row">
                <div class="ch-col col-1 bold navy">
                  ${esc(c.topic)}
                  ${c.from_answers ? `<div class="check-answers-tag">From your answers</div>` : ''}
                </div>
                <div class="ch-col col-2">${esc(c.letter_says || '—')}</div>
                <div class="ch-col col-3">${esc(c.contract_says || '—')}</div>
                <div class="ch-col col-4">
                  ${esc(c.rule_says || '—')}
                </div>
                <div class="ch-col col-5">
                  <div class="status-cell">
                    ${statusIcon(st)}
                    <div class="status-text-box">
                      <span class="status-title ${badgeClass}">${esc(STATUS_LABEL[st] || st)}</span>
                      ${c.why ? `<span class="status-why">${esc(c.why)}</span>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `
          }).join('')}
        </div>
        <div class="checks-dashed-rule"></div>
        <div class="checks-footer-note">Checked against ${esc(m.jurisdiction.name)}'s ${esc(m.jurisdiction.statute_short || 'rules')} and court decisions. Sources are on the Sources page.</div>
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    const chunkId = isFirst ? 's1_checks' : `s1_checks_${chunkIdx}`
    sec.push({ id: chunkId, title: 'Did they do it right?', html: checksHtml })
    curPage += 1
  })

  // -------------------------------------------------------------------------
  // 4.4 ESTIMATED RANGE (CA: ca8.png) or RELEASE CHECK (US: us8.png)
  // -------------------------------------------------------------------------
  if (!isUS && dyn.rangeHigh !== null && dyn.minAmount !== null) {
    const minAmt = dyn.minAmtStr
    const highAmt = dyn.highAmt
    const lowAmt = dyn.lowAmt
    const offerAmt = dyn.offerStr
    const pos = nb?.gauge ? Math.round(nb.gauge.position * 100) : (dyn.isOfferAdditional ? 35 : 10)

    const termWeeks = nb?.minimum?.terminationWeeks ?? (nb?.minimum?.weeks != null && nb?.minimum?.severanceWeeks != null ? nb.minimum.weeks - nb.minimum.severanceWeeks : dyn.minWeeks)
    const sevWeeks = nb?.minimum?.severanceWeeks || 0
    const floorText = sevWeeks > 0
      ? `${termWeeks} weeks notice + ${sevWeeks} weeks severance pay`
      : `${termWeeks ?? dyn.minWeeks} weeks ${m.jurisdiction.has_statutory_severance ? 'notice' : 'compensation for length of service'}`
    const monthsText = dyn.rangeLowMonths && dyn.rangeHighMonths ? `about ${dyn.rangeLowMonths}–${dyn.rangeHighMonths} months of base pay` : 'our estimate of a court award'
    const needleText = dyn.isOfferAdditional ? `Your offer — ${offerAmt} on top of the legal minimum` : (nb?.gauge?.label || `Your offer — ${offerAmt}`)
    const dashAt = needleText.indexOf('—')
    const needleLead = dashAt > 0 ? needleText.slice(0, dashAt + 1) : ''
    const needleRest = dashAt > 0 ? needleText.slice(dashAt + 1) : needleText

    const userOffer = typeof nb?.offer === 'number' ? nb.offer : null
    const offerStatusDesc = dyn.isOfferAdditional
      ? `Your letter offers <b>${offerAmt} on top of the legal minimum</b>.`
      : (dyn.minAmount !== null && userOffer !== null && userOffer < dyn.minAmount
        ? `Your offer is <b>${money(dyn.minAmount - userOffer)} below the minimum</b>.`
        : `Your offer is <b>${offerAmt}</b>.`)


    const rangeHtml = `
      <div class="page range-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(1)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">Your estimated <i>range.</i></h2>
        <p class="section-sub">The legal minimum is a fixed rule. The top is our estimate of what a court might award, and only applies if your contract doesn't validly limit you.</p>

        <div class="navy-feature-card">
          <div class="feature-card-kicker">ESTIMATED SEVERANCE RANGE</div>
          <div class="feature-card-amount">${minAmt} – ${highAmt}</div>
          <p class="feature-card-desc">
            Floor = ${esc(floorText)}. Top = ${monthsText}, which applies only if your contract doesn't validly limit you. ${offerStatusDesc}
          </p>
        </div>

        <div class="gauge-container">
          ${gaugeSvg(nb?.gauge ? nb.gauge.position : (dyn.isOfferAdditional ? 0.35 : 0.08))}
          <div class="gauge-needle-label">${needleLead ? `<span class="gl-lead">${esc(needleLead)}</span> ` : ''}${esc(needleRest.trim())}</div>
        </div>

        <div class="linear-scale-container">
          <div class="scale-label-offer" style="left: ${Math.max(6, Math.min(88, pos))}%;">
            Offer ${offerAmt}${dyn.isOfferAdditional ? ' (additional)' : ''}
            <div class="scale-pointer"></div>
          </div>
          <div class="scale-bar">
            <div class="scale-segment-gradient"></div>
            <div class="scale-segment-hatch"></div>
          </div>
          <div class="scale-footer-row">
            <span>Legal minimum ${minAmt}</span>
            <span>${lowAmt ? `Likely open · courts ${lowAmt}–${highAmt}` : `Likely open · up to ${highAmt}`}</span>
          </div>
        </div>

        <div class="estimate-disclaimer-card">
          <b>This is an estimate, not a promise.</b> Base pay only: a bonus and benefits during the notice period could add to it. Pay from a new job usually reduces the part above the minimum. Only ${esc(isUS ? 'an attorney' : 'a lawyer')} can confirm your number.
        </div>
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    sec.push({ id: 's1_range', title: 'Your estimated range', html: rangeHtml })
    curPage += 1
  } else if (isUS) {
    const rc = r.release_check || []
    const rcText = rc.map((x) => `${x.point} ${x.detail}`).join(' ')
    // "Your key number": the federal review period (40+), else the deadline to decide, else the offer.
    const ageNum = Number(a.age)
    const over40 = Number.isFinite(ageNum) ? ageNum >= 40 : /\b(45|21) days\b/i.test(rcText)
    const deadlineShort = dyn.deadlineStr && dyn.deadlineStr.length <= 28 && !/^(no deadline written|not stated)$/i.test(dyn.deadlineStr) ? dyn.deadlineStr : null
    const offerShort = dyn.offerStr && dyn.offerStr !== 'Not stated' && dyn.offerStr.length <= 20 ? dyn.offerStr : null
    let keyDays: string | null = null
    let keyDesc = ''
    const isGroupLayoff = a.mass === true || a.closure === true || a.group_layoff === true
    if (over40 && /\b45 days\b/i.test(rcText) && isGroupLayoff) {
      keyDays = '45 days'
      keyDesc = 'The time federal rules give you to consider a release in a group layoff at your age. 7 more days to take it back after you sign.'
    } else if (over40 && (/\b45 days\b/i.test(rcText) || /\b21 days\b/i.test(rcText))) {
      keyDays = isGroupLayoff ? '45 days' : '21 or 45 days'
      keyDesc = isGroupLayoff
        ? 'The time federal rules give you to consider a release in a group layoff at your age. 7 more days to take it back after you sign.'
        : 'The time federal rules give you to consider a release at your age (21 days for an individual termination, 45 days for a group layoff). 7 more days to take it back after you sign.'
    } else if (deadlineShort) {
      keyDays = deadlineShort
      keyDesc = 'Your deadline to decide, from your letter. Asking for more time in writing is normal, and nothing is final until you sign.'
    } else if (offerShort) {
      keyDays = offerShort
      keyDesc = "What your letter offers for signing the release. US law sets no minimum, so this comes from your employer's policy or agreement, not a legal floor."
    }
    const releaseHtml = `
      <div class="page release-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(1)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">Your release <i>check.</i></h2>
        <p class="section-sub">US law sets no minimum severance, so the report checks the release you're being asked to sign against the rules that protect you.</p>

        ${keyDays ? `
        <div class="navy-feature-card">
          <div class="feature-card-kicker">YOUR KEY NUMBER</div>
          <div class="feature-card-amount">${keyDays}</div>
          <p class="feature-card-desc">${esc(keyDesc)}</p>
        </div>` : ''}

        <div class="release-check-list">
          ${rc.map((item) => {
            const st = item.status === 'ok' || item.status === 'bad' || item.status === 'ask' ? item.status : 'info'
            return `
              <div class="release-check-row">
                ${statusIcon(st)}
                <div class="release-check-content">
                  <div class="rc-point bold">${esc(item.point)}</div>
                  <div class="rc-detail">${esc(item.detail)}</div>
                </div>
              </div>
            `
          }).join('')}
        </div>
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    if (rc.length) {
      sec.push({ id: 's1_release', title: 'Your release check', html: releaseHtml })
      curPage += 1
    }
  }

  // -------------------------------------------------------------------------
  // 4.5 FACTORS (Canada only: ca9.png)
  // -------------------------------------------------------------------------
  if (!isUS) {
    const f = r.factors
    const reasons = f?.reasons || {}
    const factorList = [
      { name: 'job level', score: Number(f?.job_level ?? 0) },
      { name: 'length of service', score: Number(f?.service ?? 0) },
      { name: 'age', score: Number(f?.age ?? 0) },
      { name: 'similar jobs nearby', score: Number(f?.similar_jobs ?? 0) },
    ]
    factorList.sort((x, y) => y.score - x.score)
    const maxScore = factorList[0].score
    const highestFactors = factorList.filter((x) => x.score > 0 && maxScore - x.score <= 0.1).slice(0, 2).map((x) => x.name)
    const heavy = highestFactors.filter((x) => x === 'age' || x === 'length of service').length
    const reachText = dyn.highAmt ? ` That is why the estimate reaches toward <b>${dyn.highAmt}</b>.` : ''
    const interpretationText = highestFactors.length > 0
      ? `Your chart reaches furthest on <b>${highestFactors.join(' and ')}</b>${heavy === 2 ? ', two of the heaviest factors' : heavy === 1 && highestFactors.length === 1 ? ', one of the heaviest factors' : ''}.${reachText}`
      : `Your chart stays close to the centre on every factor.${reachText}`
    const salaryNum = Number(a.salary)
    const payLine = Number.isFinite(salaryNum) && salaryNum > 0
      ? `${money(salaryNum)} a year (${money(salaryNum / 12)} a month)`
      : dyn.salaryStr

    const factorsHtml = `
      <div class="page factors-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(1)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">What lifts your <i>range.</i></h2>
        <p class="section-sub">Courts look at four things when they decide how much notice is fair. Your pay isn't one of them: it turns the months into dollars.</p>

        <div class="factors-split-layout">
          <div class="factors-chart-col">
            ${radarSvg(f)}
            <div class="chart-caption">Centre = works a little in your favour · edge = works a lot</div>
          </div>
          <div class="factors-bullets-col">
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Length of service${dyn.yearsStr !== 'Not stated' ? `: ${esc(dyn.yearsStr)}` : ''}.</b> ${esc(reasons.service || 'Length of service in your role.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Age${nb?.factorValues?.age ? `: ${esc(nb.factorValues.age)}` : ''}.</b> ${esc(reasons.age || 'Age consideration in notice periods.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Job level${nb?.factorValues?.job_level ? `: ${esc(nb.factorValues.job_level)}` : ''}.</b> ${esc(reasons.job_level || 'Role level and responsibilities.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Similar jobs nearby.</b> ${esc(reasons.similar_jobs || 'Availability of similar opportunities.')}</div>
            </div>
            <div class="pay-multiplier-note">
              Your pay: ${esc(payLine)}. It turns the months into dollars.
            </div>
          </div>
        </div>

        <div class="shape-summary-card">
          <div class="shape-title bold">What your shape says</div>
          <p class="shape-desc">${interpretationText}</p>
        </div>
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    sec.push({ id: 's1_factors', title: 'What lifts your range', html: factorsHtml })
    curPage += 1
  }

  // -------------------------------------------------------------------------
  // 5. SECTION 2: Two numbers to understand (CA: ca10-ca11.png) / Why no minimum (US: us9-us10.png)
  // -------------------------------------------------------------------------
  const s2Title = isUS ? "Why there's no minimum" : 'Two numbers to understand'
  const s2CoverHtml = `
    <div class="page section-cover-page s2-cover">
      <div class="section-kicker">SECTION 2 OF 5 · ${s2Title.toUpperCase()}</div>
      <div class="huge-section-digit">2</div>
      <h2 class="huge-section-title">${esc(s2Title)}</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">
        ${isUS
          ? `In the US, no law sets a minimum severance. Yours comes from your employer's policy, and the rules protect you when you sign a release.`
          : `There are two numbers in your situation: the legal minimum, a fixed rule you can check yourself, and what a court might award, which is our estimate. This section explains the difference in plain words.`}
      </p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        <div class="its-item">${isUS ? 'Where your severance comes from' : 'The floor, and the range above it'}</div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's2_cover', title: `Section 2 · ${s2Title}`, html: s2CoverHtml })
  curPage += 1

  // "8 weeks × $2,163 a week = $17,308" lines; the severance line takes the remainder so the lines add up exactly.
  const minLines: string[] = []
  let minHow = ''
  {
    const mn = nb?.minimum
    const total = mn?.amount ?? dyn.minAmount
    const wk = mn?.weeks ?? null
    const sev = mn?.severanceWeeks ?? 0
    const term = mn?.terminationWeeks ?? (wk !== null ? wk - sev : null)
    const weekly = dyn.weeklyPayNum ?? (total !== null && wk ? total / wk : (mn?.weeklyPay ?? null))
    const money2 = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const statute = esc(m.jurisdiction.statute_short || 'statute')
    if (mn?.arithmetic) minLines.push(esc(mn.arithmetic))
    if (term !== null && weekly !== null && total !== null) {
      const termAmt = term * weekly
      const label = m.jurisdiction.has_statutory_severance ? 'Termination pay' : 'Notice pay'
      minLines.push(`${label}: ${term} weeks × ${money2(weekly)} = ${money2(termAmt)} (${statute})`)
      if (sev > 0) minLines.push(`Severance pay: ${sev} weeks × ${money2(weekly)} = ${money2(sev * weekly)} (${statute})`)
      minHow = sev > 0 ? `${term} + ${sev} weeks × ${money2(weekly)} a week` : `${term} weeks × ${money2(weekly)} a week`
    } else if (wk !== null) {
      minLines.push(`${wk} weeks × your regular weekly pay (${statute})`)
    }
  }

  const s2DetailHtml = `
    <div class="page section-detail-page">
      <div class="section-kicker-bar">
        <span>SECTION 2 OF 5 · ${s2Title.toUpperCase()}</span>
        ${progressDots(2)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">${isUS ? 'Where your severance <i>comes from.</i>' : "The floor — and <i>the range above it.</i>"}</h2>
      <p class="section-sub">${isUS ? 'Three places, and which one applies to you.' : 'One number is a rule. The other is an estimate. Here is how each is worked out.'}</p>

      ${!isUS ? `
        <div class="detail-card">
          <div class="card-num-title">1 · The legal minimum (a rule you can check)</div>
          <div class="card-inner-box">
            <ul class="detail-list">
              ${m.jurisdiction.has_statutory_severance ? `
                ${minLines.map((l) => `<li>${l}</li>`).join('')}
                <li class="bold">Legal minimum: ${dyn.minAmtStr}</li>
              ` : `
                ${minLines.map((l) => `<li>${l}</li>`).join('')}
                <li class="bold">Legal minimum: ${dyn.minAmtStr}</li>
              `}
            </ul>
          </div>
        </div>

        <div class="detail-card">
          <div class="card-num-title">2 · What a court might award (our estimate)</div>
          <p class="detail-text">
            If your contract doesn't validly limit you, a court can award "reasonable notice" <b>instead of</b> the minimum, based on four factors: length of service, age, job level and similar jobs nearby. ${dyn.rangeLowMonths && dyn.rangeHighMonths && dyn.lowAmt ? `For you: about <b>${dyn.rangeLowMonths}–${dyn.rangeHighMonths} months of base pay, ${dyn.lowAmt}–${dyn.highAmt}</b>. ` : ''}Courts rarely go past about 24 months. Pay from a new job usually reduces the part above the minimum.
          </p>
        </div>
      ` : `
        <div class="detail-card">
          <div class="card-num-title">1 · A written policy or agreement</div>
          <p class="detail-text">If your employer has a written severance policy, plan or agreement, it decides what applies to you${nb?.offer != null ? `. Your offer: <b>${money(nb.offer)}</b>` : ''}. Section 3 shows what your documents say.</p>
        </div>
        <div class="detail-card">
          <div class="card-num-title">2 · A law for certain layoffs</div>
          <p class="detail-text">The federal WARN Act requires 60 days' notice, or pay instead, before a plant closing or mass layoff at employers with 100 or more workers. It only applies to larger layoffs; some states add their own rules.</p>
        </div>
        <div class="detail-card">
          <div class="card-num-title">3 · Money paid no matter what</div>
          <p class="detail-text">Your final pay is paid whether or not you sign. In some states, unused vacation or PTO counts as wages too. ${esc(m.jurisdiction.name)}'s rules are on the Sources page.</p>
        </div>
      `}
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's2_numbers', title: s2Title, html: s2DetailHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 6. SECTION 3: What's in your letter and contract (ca12-ca16.png / us11-us15.png)
  // -------------------------------------------------------------------------
  const clauses = r.clauses || []

  const s3CoverHtml = `
    <div class="page section-cover-page s3-cover">
      <div class="section-kicker">SECTION 3 OF 5 · WHAT'S IN YOUR LETTER AND CONTRACT</div>
      <div class="huge-section-digit">3</div>
      <h2 class="huge-section-title">What's in your letter and contract</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">Clause by clause: what your documents say, what the rules say, and what it could mean for you. Each point shows where it comes from.</p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        ${clauses.length ? clauses.map((c) => `<div class="its-item">${esc(c.title)}</div>`).join('') : '<div class="its-item">Nothing in your documents needed a closer look.</div>'}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's3_cover', title: "Section 3 · What's in your letter and contract", html: s3CoverHtml })
  curPage += 1

  const s3ClausesHtml = `
    <div class="page clause-page clauses-flow">
      <div class="section-kicker-bar">
        <span>SECTION 3 OF 5 · WHAT'S IN YOUR LETTER AND CONTRACT</span>
        ${progressDots(3)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">The terms to understand and the <i>questions to ask.</i></h2>
      <p class="section-sub">For each: what your documents say, what the rules say, and what it means.</p>

      ${clauses.map((c, idx) => {
        const isBad = c.status === 'bad'
        const isOk = c.status === 'ok'
        const pillClass = isBad ? 'pill-red' : isOk ? 'pill-green' : c.status === 'info' ? 'pill-gray' : 'pill-yellow'
        const isInfo = c.status === 'info'
        const pillLabel = isBad ? "DOESN'T LINE UP" : isOk ? 'LINES UP' : isInfo ? 'GOOD TO KNOW' : 'ASK ABOUT IT'
        const ruleCheck = matchingCheck(c, r.checks || [])
        const srcHtml = sourceLink(c.source_id || ruleCheck?.source_id, m) || `Your ${esc(w.letter)} and ${esc(w.contract)}`
        const rulesText = c.what_it_means
        const whyText = ruleCheck?.why && ruleCheck.why.length >= 8 ? ruleCheck.why : ''

        return `
          <div class="clause-item">
            <div class="clause-pill-badge">
              <span class="pill ${pillClass}">${pillLabel}</span>
            </div>

            <h3 class="clause-single-heading">${idx + 1}. ${esc(c.title.replace(/^\d+[.)]\s+/, ''))}</h3>

            <div class="clause-two-boxes">
              <div class="c-box c-box-white">
                <div class="c-box-header">YOUR DOCUMENTS SAY</div>
                <div class="c-box-body">${esc(c.what_it_says)}</div>
              </div>
              <div class="c-box c-box-beige">
                <div class="c-box-header">WHAT THE RULES SAY</div>
                <div class="c-box-body">${esc(rulesText)}</div>
              </div>
            </div>

            ${whyText ? `<p class="clause-why"><b>Why it matters:</b> ${esc(whyText)}</p>` : ''}

            <div class="clause-action-box">
              <span class="action-arrow">→</span>
              <span>${esc(c.question_to_ask)}</span>
            </div>

            <div class="clause-dashed-rule"></div>
            <div class="clause-source-line">Where this comes from: ${srcHtml}</div>
          </div>
        `
      }).join('')}
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's3_clauses', title: 'The terms to understand and the questions to ask', html: s3ClausesHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 7. SECTION 4: Questions to prepare (ca17-ca19.png / us16-us18.png)
  // -------------------------------------------------------------------------
  const questions = r.questions && r.questions.length ? r.questions : [
    'Could you send me a copy of the severance agreement and contract so I can review them?',
    'Is the offer still open, and is there a date to respond by in writing?',
    'What regular wages are you using to calculate my compensation for length of service?',
  ]

  const s4CoverHtml = `
    <div class="page section-cover-page s4-cover">
      <div class="section-kicker">SECTION 4 OF 5 · QUESTIONS TO PREPARE</div>
      <div class="huge-section-digit">4</div>
      <h2 class="huge-section-title">Questions to prepare</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">Calm questions you can send to HR, and practical steps for this week. You decide what to use and when.</p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        <div class="its-item">Questions you might choose to ask</div>
        <div class="its-item">Take your time, and keep it simple</div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's4_cover', title: 'Section 4 · Questions to prepare', html: s4CoverHtml })
  curPage += 1

  const hrContact = a.hr_name ? `your HR contact (${String(a.hr_name)})` : 'your HR contact'
  const hrGreeting = a.hr_name ? `Hi ${esc(String(a.hr_name).split(' ')[0])},` : 'Hello,'
  const isCompactQuestions = questions.length > 8
  const s4QuestionsHtml = `
    <div class="page questions-page">
      <div class="section-kicker-bar">
        <span>SECTION 4 OF 5 · QUESTIONS TO PREPARE</span>
        ${progressDots(4)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Questions you might <i>choose to ask.</i></h2>
      <p class="section-sub">Neutral questions you might choose to send. You decide what to send. This is not a demand letter or legal advice.</p>

      <div class="email-mock-container ${isCompactQuestions ? 'compact-container' : ''}">
        <div class="email-meta-header">
          To: <b>${esc(hrContact)}</b> · Subject: <b>A few questions about my separation offer</b>
        </div>
        <div class="email-body">
          <p>${hrGreeting}</p>
          <p>Thank you for the letter. Before I decide, I have a few questions.</p>
          <ul class="email-questions-list ${isCompactQuestions ? 'compact-list' : ''}">
            ${questions.map((q) => `<li>${esc(q)}</li>`).join('')}
          </ul>
          <p>Thank you,<br/>${esc(dyn.clientName ? String(dyn.clientName).split(' ')[0] : '[Your name]')}</p>
        </div>
      </div>

      <div class="why-it-works-card">
        <b>Why this works:</b> it asks clear questions instead of making claims, and asks for time to understand the offer.
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's4_questions', title: 'Questions you might choose to ask', html: s4QuestionsHtml })
  curPage += 1

  // Page 19 / ca19.png: "Take your time — and keep it simple"
  const hasDeadline = dyn.deadlineStr && dyn.deadlineStr !== 'No deadline written' && dyn.deadlineStr !== 'Not stated'
  const decideText = hasDeadline
    ? `Your letter gives a deadline to decide (${dyn.deadlineStr}). Asking to take the offer home to review it is a normal, complete answer. You can ask for an extension in writing.`
    : `Your documents do not give a deadline to sign by. Asking HR in writing whether there is a response date is a normal first step before making any decision.`

  const nextSteps = r.next_steps && r.next_steps.length ? r.next_steps : [
    'Ask HR in writing for full copies of all separation documents and any response deadline.',
    'Gather your pay stubs, contracts, and relevant employment records.',
    'Wait to sign anything until you understand your complete offer and entitlements.',
    `Apply for ${isUS ? 'unemployment' : 'EI'} promptly after your last day.`,
    `Speak with a ${esc(w.lawyer)} to understand what applies to your situation.`,
  ]

  const s4PracticalHtml = `
    <div class="page practical-page">
      <div class="section-kicker-bar">
        <span>SECTION 4 OF 5 · QUESTIONS TO PREPARE</span>
        ${progressDots(4)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Take your time — <i>and keep it simple.</i></h2>
      <p class="section-sub">Two things that help: not rushing, and keeping your questions clear.</p>

      <div class="practical-block">
        <h3 class="practical-heading">You usually don't have to decide on the spot</h3>
        <p class="practical-text">${esc(decideText)}</p>
      </div>

      <div class="practical-divider"></div>

      <div class="practical-block">
        <h3 class="practical-heading">This week — the practical stuff</h3>
        <div class="practical-bullets">
          ${nextSteps.map((step) => `
            <div class="p-bullet">
              <span class="bullet-dot teal"></span>
              <div>${boldLead(step)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's4_practical', title: 'Take your time — and keep it simple', html: s4PracticalHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 8. SECTION 5: Your next step (ca20-ca21.png / us19-us20.png)
  // -------------------------------------------------------------------------
  const s5CoverHtml = `
    <div class="page section-cover-page s5-cover">
      <div class="section-kicker">SECTION 5 OF 5 · YOUR NEXT STEP</div>
      <div class="huge-section-digit">5</div>
      <h2 class="huge-section-title">Your next step</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">The three paths side by side, where every number in this report comes from, and how to hand it to a ${esc(w.lawyer)} if you want one.</p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        <div class="its-item">You don't have to sign today</div>
        <div class="its-item">Where every number comes from</div>
        <div class="its-item">Talking to a ${esc(w.lawyer)}</div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's5_cover', title: 'Section 5 · Your next step', html: s5CoverHtml })
  curPage += 1

  // Page 21 / ca21.png: "You don't have to sign today" (Three paths)
  const s5ThreePathsHtml = `
    <div class="page three-paths-page">
      <div class="section-kicker-bar">
        <span>SECTION 5 OF 5 · YOUR NEXT STEP</span>
        ${progressDots(5)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">You don't have to <i>sign today.</i></h2>
      <p class="section-sub">Here's how the three paths compare.</p>

      <div class="three-paths-grid">
        <div class="path-card">
          <div class="path-opt-kicker">OPTION 1</div>
          <h3 class="path-title">Sign as-is</h3>
          <p class="path-desc">Accept the offer and move on.</p>
          <p class="path-bold-note">You get ${esc(dyn.offerStr)}. It gives up the contract question.</p>
        </div>
        <div class="path-card">
          <div class="path-opt-kicker">OPTION 2</div>
          <h3 class="path-title">Ask your questions</h3>
          <p class="path-desc">Use Section 4 to raise it yourself.</p>
          <p class="path-bold-note">You run it yourself, using Section 4.</p>
        </div>
        <div class="path-card">
          <div class="path-opt-kicker">OPTION 3</div>
          <h3 class="path-title">Talk to a ${esc(w.lawyer)}</h3>
          <p class="path-desc">They can tell you what applies to you.</p>
          <p class="path-bold-note">First call often free. The contract question needs a ${esc(w.lawyer)} to read it.</p>
        </div>
      </div>

      <div class="honest-note-card">
        <b>Honest note:</b> this report helps you ask the right questions. The contract question in Section 3 is one a ${esc(w.lawyer)} needs to read your contract to answer.
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's5_three_paths', title: "You don't have to sign today", html: s5ThreePathsHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 9. SECTION 6: Sources (ca22.png / us21.png)
  // -------------------------------------------------------------------------
  // Rows: the key numbers first, then each finding that cites a source, then any other cited source.
  type SrcRow = { item: string; value?: string; how: string; src?: SourceRow; srcText?: string }
  const srcRows: SrcRow[] = []
  const byId = (id?: string | null) => (id ? m.sources.find((x) => x.id === id) : undefined)
  const statuteSrc = m.sources.find((x) => /statute|laws|act\b/i.test(`${x.url} ${x.section}`)) || m.sources[0]
  if (nb?.offer != null) srcRows.push({ item: 'Their offer', value: money(nb.offer), how: 'What your letter says', srcText: `Your ${w.letter}` })
  if (!isUS && dyn.minAmount !== null) srcRows.push({ item: 'Legal minimum', value: dyn.minAmtStr, how: minHow || 'Weeks owed × your regular weekly pay', src: statuteSrc })
  if (!isUS && dyn.rangeHigh !== null) srcRows.push({ item: 'Range', value: dyn.lowAmt ? `${dyn.lowAmt}–${dyn.highAmt}` : `up to ${dyn.highAmt}`, how: `FairExit estimate${dyn.rangeLowMonths && dyn.rangeHighMonths ? `: ${dyn.rangeLowMonths}–${dyn.rangeHighMonths} months of base pay` : ''}, from the four factors courts use`, srcText: 'FairExit estimate based on how courts decide notice, not a rule' })
  const seen = new Set<string>()
  for (const c of r.checks || []) {
    const src = byId(c.source_id)
    if (!src) continue
    seen.add(src.id)
    srcRows.push({ item: c.topic, how: c.rule_says || src.section, src })
  }
  for (const c of r.clauses || []) {
    const src = byId(c.source_id)
    if (!src || seen.has(src.id)) continue
    seen.add(src.id)
    srcRows.push({ item: c.title, how: src.section, src })
  }
  const usedIds = new Set<string>([...(r.citations_used || []), ...(r.myths || []).map((x) => x.source_id || '')])
  for (const src of m.sources) {
    if (!usedIds.has(src.id) || seen.has(src.id)) continue
    seen.add(src.id)
    srcRows.push({ item: src.rule, how: src.section, src })
  }
  if (isUS) {
    const hasWarn = srcRows.some((x) => /warn/i.test(`${x.item} ${x.how} ${x.src?.rule || ''}`))
    if (!hasWarn) {
      srcRows.push({
        item: '60 days notice',
        how: 'WARN Act (plant closing or mass layoff with 100+ workers)',
        srcText: 'Federal WARN Act · 20 U.S.C. § 2101',
        src: {
          id: 'US-FED-S1',
          rule: 'Federal WARN Act',
          section: '20 U.S.C. § 2101',
          url: 'https://www.dol.gov/agencies/eta/layoffs/warn',
          status: 'verified',
          checked: '2026-10-31',
        },
      })
    }
  }
  const shownRows = srcRows
  const checkedDates = m.sources.map((x) => x.checked).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  const checkedLine = checkedDates.length ? ` (checked ${esc(fmtLongDate(checkedDates[checkedDates.length - 1]))})` : ''

  const s6Html = `
    <div class="page sources-page">
      <div class="section-kicker">SOURCES</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Where every number <i>comes from.</i></h2>
      <p class="section-sub">${esc(m.jurisdiction.name)} rules from official statute text and government guides${checkedLine}.</p>

      <table class="sources-table">
        <thead>
          <tr>
            <th style="width: 20%;">IN YOUR REPORT</th>
            <th style="width: 27%;">HOW WE GOT IT</th>
            <th style="width: 53%;">SOURCE</th>
          </tr>
        </thead>
        <tbody>
          ${shownRows.map((row) => `
            <tr>
              <td class="src-item">${esc(row.item)}${row.value ? ` ${esc(row.value)}` : ''}</td>
              <td>${esc(row.how)}</td>
              <td>
                <div class="src-id-title">${esc(row.src ? `${row.src.rule} · ${String(row.src.section || '').split(' (')[0]}` : row.srcText || '')}</div>
                ${row.src?.url ? `<a class="src-url" href="${esc(row.src.url)}">${esc(sourceLabel(row.src))}</a>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's6_sources', title: 'Where every number comes from', html: s6Html })
  curPage += 1

  // -------------------------------------------------------------------------
  // 10. SECTION 7: Talking to a lawyer / attorney (ca23.png / us22.png)
  // -------------------------------------------------------------------------
  const aLawyerTitle = isUS ? 'an attorney' : 'a lawyer'
  const lawyerClientRel = isUS ? 'an attorney–client' : 'a lawyer–client'
  const lawyersPlural = isUS ? 'attorneys' : `${w.lawyer}s`
  const s7Html = `
    <div class="page lawyer-handover-page">
      <div class="section-kicker">IF YOU'D RATHER NOT DO IT ALONE</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">One step, and ${esc(aLawyerTitle)} <i>takes it from here.</i></h2>
      <p class="section-sub">If they push back, go quiet, or it feels like too much, you can hand this report to ${esc(aLawyerTitle)}.</p>

      <div class="lawyer-handover-card">
        <div class="handover-left">
          <div class="handover-title bold">Show them this page.</div>
          <p class="handover-desc">
            Your report ID connects this report to FairExit, so they can see what you've already done. Connecting is free; you choose whether to go further.
          </p>
        </div>
        <div class="handover-right">
          <div class="qr-box">
            ${qrSvgCode}
          </div>
          <div class="qr-sub">Report ID <b>${esc(m.reportId)}</b></div>
        </div>
      </div>

      <div class="transparency-note">
        <b>For information only, not legal advice</b>, and not ${esc(lawyerClientRel)} relationship. How we're paid: ${esc(lawyersPlural)} pay a flat advertising fee; never a cut of your outcome.
      </div>

      <div class="before-use-footer">
        <p>${esc(r.confirmed_line)}</p>
        ${m.rulesAsOf && !/rules as of/i.test(r.confirmed_line || '') ? `<p>Rules as of ${esc(fmtLongDate(m.rulesAsOf))}.</p>` : ''}
        <p class="rid">Report ID ${esc(m.reportId)} · generated ${esc(fmtLongDate(m.generatedAt))}</p>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's7_lawyer', title: isUS ? 'Talking to an attorney' : 'Talking to a lawyer', html: s7Html })
  curPage += 1

  for (const x of sec) x.html = x.html.replace(/SECTION (\d) OF 5 ·/g, 'SECTION <b class="kn">$1 OF 5</b> ·')
  return sec
}

const CSS = `
@page {
  size: letter;
  margin: 0;
}
* {
  box-sizing: border-box;
}
body {
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #17242F;
  font-size: 10pt;
  line-height: 1.5;
  margin: 0;
  padding: 0;
  background: #FFFFFF;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.page {
  width: 8.5in;
  height: 11in;
  max-height: 11in;
  padding: 60pt 67.5pt 14pt 67.5pt;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  position: relative;
  background: #FFFFFF;
}
.page:last-child {
  page-break-after: auto;
  break-after: auto;
}
.section-cover-page.s1-cover { padding-top: 126pt; }
.section-cover-page.s2-cover { padding-top: 133pt; }
.section-cover-page.s3-cover { padding-top: 115pt; }
.section-cover-page.s4-cover { padding-top: 126pt; }
.section-cover-page.s5-cover { padding-top: 126pt; }
h1, h2, .huge-section-title, .cover-title, .section-heading {
  font-family: "Newsreader", Georgia, serif;
  color: #062C55;
  font-weight: 500;
}
i {
  font-style: italic;
}
b, strong, .bold {
  font-weight: 700;
}
.navy {
  color: #062C55;
}

/* Header Kickers and Dividers */
.section-kicker {
  font-size: 7.5pt;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #5A6B78;
  font-weight: 600;
  margin-bottom: 6px;
}
.section-kicker-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 7.5pt;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #5A6B78;
  font-weight: 600;
  margin-bottom: 6px;
}
.header-divider {
  width: 100%;
  height: 1px;
  background: #E7E4DD;
  margin-bottom: 28px;
}
.section-heading {
  font-size: 21pt;
  margin: 0 0 6px 0;
  line-height: 1.2;
  letter-spacing: -0.2px;
}
.section-sub {
  font-size: 10.5pt;
  color: #6B7A86;
  margin: 0 0 16px 0;
  line-height: 1.5;
  max-width: 94%;
}

/* Cover Page */
.cover-page {
  padding: 19.5pt 22.5pt;
}
.cover-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  overflow: hidden;
  background: #F5F4EF;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  box-sizing: border-box;
}
.cover-hero-band {
  width: 100%;
  height: 245px;
  position: relative;
  overflow: hidden;
  background: #EEF8F3;
  flex-shrink: 0;
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.hero-placeholder {
  width: 100%;
  height: 100%;
  background: #EEF8F3;
}
.hero-logo-box {
  position: absolute;
  top: 24px;
  left: 56px;
}
.hero-logo {
  height: 30px;
  width: auto;
  display: block;
}
.hero-logo-text {
  font-family: "Newsreader", Georgia, serif;
  font-size: 18pt;
  font-weight: 700;
  color: #062C55;
}
.hero-tagline {
  font-size: 7.5pt;
  color: #0C8F72;
  font-weight: 700;
  margin-top: 3px;
}
.cover-content {
  padding: 81pt 42pt 16pt 42pt;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.cover-page .page-footer {
  padding: 0 43.5pt;
  margin-top: 12px;
  flex-shrink: 0;
}
.kicker-teal {
  font-size: 7.5pt;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #0C8F72;
  font-weight: 700;
  margin-bottom: 10px;
}
.cover-title {
  font-size: 40pt;
  font-weight: 600;
  margin: 0 0 18px 0;
  line-height: 1.05;
  letter-spacing: -0.5px;
}
.cover-lead {
  font-size: 12.5pt;
  color: #4A5A66;
  line-height: 1.55;
  margin: 0 0 18px 0;
  max-width: 84%;
}
.cover-tags-pill {
  display: inline-block;
  padding: 6px 10px;
  background: #EEEFEC;
  border: 1px solid #E2E0D8;
  border-radius: 4px;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #3A4B58;
  margin-bottom: 56px;
  align-self: flex-start;
}
.teal-bold {
  color: #0EB28D;
}
.cover-divider {
  display: none;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  row-gap: 22px;
  column-gap: 20px;
  margin-bottom: 22px;
  width: 92%;
}
.meta-label {
  font-size: 7pt;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #0C8F72;
  font-weight: 600;
  margin-bottom: 4px;
}
.meta-value {
  font-size: 12pt;
  font-weight: 600;
  color: #062C55;
}
.cover-test-note {
  font-size: 8.5pt;
  color: #6B7A86;
  margin-top: 4px;
}

/* Contents Page */
.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 18px;
}
.toc-row {
  display: flex;
  align-items: baseline;
  padding: 9px 0 9px;
  border-bottom: 1px solid #EFECE6;
}
.toc-num {
  font-family: "Newsreader", Georgia, serif;
  font-size: 14pt;
  font-weight: 500;
  color: #062C55;
  width: 34px;
  flex-shrink: 0;
}
.toc-body {
  flex: 1;
}
.toc-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 12.5pt;
  font-weight: 400;
  color: #062C55;
}
.toc-desc {
  font-size: 8.5pt;
  color: #6B7A86;
  margin-top: 4px;
}
.toc-range {
  font-size: 8.5pt;
  font-weight: 700;
  color: #062C55;
}

/* Color Legend */
.legend-card {
  background: #FFFFFF;
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 14px 14px 12px;
  margin-top: 20px;
  margin-bottom: 10px;
}
.legend-header {
  font-size: 9pt;
  color: #17242F;
  margin-bottom: 10px;
}
.legend-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.pill {
  font-size: 7.5pt;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 4px;
  white-space: nowrap;
}
.pill-green { background: #E5F5EE; color: #0C8F72; }
.pill-red { background: #FCE8E8; color: #D42E2B; }
.pill-yellow { background: #FEF7E0; color: #B07A00; }
.pill-gray { background: #EEF2F6; color: #5A6B78; }
.pill-navy { background: #062C55; color: #FFFFFF; }
.legend-text {
  font-size: 9pt;
  color: #27343F;
  margin: 0;
  line-height: 1.6;
}

/* Before you use this */
.before-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.before-card {
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 11px 14px 12px;
  background: #FFFFFF;
}
.before-card.alert-card {
  background: #FDF3DC;
  border-color: #EBC873;
}
.card-num-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 12pt;
  font-weight: 500;
  color: #062C55;
  margin-bottom: 4px;
}
.card-body-text {
  font-size: 10pt;
  color: #27343F;
  line-height: 1.5;
}

/* Section Covers */
.huge-section-digit {
  font-family: "Newsreader", Georgia, serif;
  font-size: 84pt;
  font-weight: 600;
  color: #062C55;
  line-height: 1;
  margin: 8px 0 26px 0;
}
.huge-section-title {
  font-size: 30pt;
  font-weight: 600;
  margin: 0 0 18px 0;
  line-height: 1.15;
  max-width: 88%;
}
.heavy-divider {
  width: 88%;
  height: 2px;
  background: #062C55;
  margin-bottom: 18px;
}
.section-cover-desc {
  font-size: 12pt;
  color: #27343F;
  line-height: 1.6;
  margin: 0 0 20px 0;
  max-width: 84%;
}
.in-this-section-box {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 85%;
}
.its-kicker {
  font-size: 7pt;
  letter-spacing: 1.2px;
  font-weight: 600;
  color: #5A6B78;
  padding-bottom: 7px;
  border-bottom: 1px solid #E7E4DD;
}
.its-item {
  font-size: 10.5pt;
  color: #062C55;
  padding: 9px 0;
  border-bottom: 1px solid #EFECE6;
}

/* Progress Dots */
.p-dots {
  display: flex;
  gap: 6px;
}
.p-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E2E5E8;
}
.p-dot.active {
  background: #062C55;
}

/* Glance 2-Column */
.glance-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 20px 18px;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 26px;
}
.glance-lead {
  font-size: 12pt;
  line-height: 1.5;
  color: #17242F;
  margin: 0 0 12px 0;
}
.glance-contract-note {
  font-size: 9pt;
  background: #FFFBF0;
  border: 1px solid #EEB33C;
  border-radius: 6px;
  padding: 8px 10px;
  margin: 0;
}
.glance-table {
  display: flex;
  flex-direction: column;
}
.glance-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 0;
  border-bottom: 1px solid #EFECE6;
  font-size: 9pt;
}
.glance-row:last-child {
  border-bottom: none;
}
.glance-col-label {
  color: #6B7A86;
  flex-shrink: 0;
}
.glance-col-val {
  color: #062C55;
  text-align: right;
  font-weight: 700;
}

/* Myths */
.myths-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.myth-card {
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 0;
  display: grid;
  grid-template-columns: 0.66fr 1fr;
  gap: 0;
  overflow: hidden;
}
.myth-header {
  font-size: 6.5pt;
  font-weight: 600;
  letter-spacing: 1px;
  color: #5A6B78;
  margin-bottom: 3px;
}
.myth-text {
  font-size: 8.5pt;
  font-weight: 700;
  color: #062C55;
  line-height: 1.45;
}
.rule-text {
  font-size: 8.5pt;
  color: #27343F;
  line-height: 1.5;
}
.myth-source {
  font-size: 7.5pt;
  color: #6B7A86;
  margin-top: 4px;
}

/* Checks Cards List (ca7.png / us7.png) */
.checks-summary-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.checks-cards-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.checks-header-row {
  display: grid;
  grid-template-columns: 0.72fr 0.92fr 0.86fr 0.86fr 1.06fr;
  gap: 10px;
  padding: 0 8px 6px;
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 1px;
  color: #5A6B78;
  line-height: 1.6;
  align-items: end;
}
.check-card-row {
  display: grid;
  grid-template-columns: 0.72fr 0.92fr 0.86fr 0.86fr 1.06fr;
  gap: 10px;
  padding: 8px 8px 9px;
  background: #FFFFFF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  font-size: 7.5pt;
  line-height: 1.45;
  color: #27343F;
  align-items: start;
}
.check-source-tag {
  font-size: 7pt;
  color: #5A6B78;
  margin-top: 3px;
}
.check-answers-tag {
  display: inline-block;
  font-size: 6.5pt;
  font-weight: 600;
  color: #0EB28D;
  background: #E8F7F2;
  border-radius: 3px;
  padding: 1px 4px;
  margin-top: 3px;
  letter-spacing: 0.2px;
}
.status-cell {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}
.status-icon-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9.5pt;
  font-weight: 700;
  color: #FFFFFF;
  flex-shrink: 0;
  margin-top: -1px;
}
.status-title.badge-ok { background: transparent; color: #0C7860; }
.status-title.badge-bad { background: transparent; color: #B42014; }
.status-title.badge-ask { background: transparent; color: #8A5A0B; }
.status-title.badge-info { background: transparent; color: #5A6B78; }
.status-icon-circle.badge-ok { background: #0C8F72; color: #FFF; }
.status-icon-circle.badge-bad { background: #D42E2B; color: #FFF; }
.status-icon-circle.badge-ask { background: #B07A00; color: #FFF; }
.status-icon-circle.badge-info { background: #5A6B78; color: #FFF; }
.status-icon-svg { flex-shrink: 0; display: block; margin-top: -1px; }
.status-title {
  font-size: 7.5pt;
  font-weight: 700;
  display: block;
}
.status-why {
  font-size: 6.5pt;
  color: #6B7A86;
  display: block;
  line-height: 1.45;
  margin-top: 1px;
}
.checks-dashed-rule {
  border-top: 1px dashed #D8D4CA;
  margin: 12px 0 8px 0;
}
.checks-footer-note {
  font-size: 8.5pt;
  color: #6B7A86;
  line-height: 1.5;
}

/* Navy Feature Cards */
.navy-feature-card {
  background: #062C55;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 22px 30px 24px;
  text-align: center;
  margin-bottom: 8px;
}
.feature-card-kicker {
  font-size: 7pt;
  letter-spacing: 1.6px;
  color: #D5DFEA;
  font-weight: 600;
  margin-bottom: 6px;
}
.feature-card-amount {
  font-family: "Newsreader", Georgia, serif;
  font-size: 34pt;
  font-weight: 500;
  letter-spacing: -0.5px;
  line-height: 1.1;
  margin-bottom: 12px;
}
.feature-card-desc {
  font-size: 9.5pt;
  color: #E6EDF3;
  line-height: 1.55;
  margin: 0 auto;
  max-width: 94%;
}
.gauge-container {
  text-align: center;
  margin: 22px 0 6px;
}
.gauge {
  display: block;
  margin: 0 auto;
}
.gauge-needle-label {
  font-family: "Newsreader", Georgia, serif;
  font-size: 14pt;
  color: #062C55;
  font-weight: 600;
  margin-top: 2px;
}
.linear-scale-container {
  width: 100%;
  margin: 32px 0 14px;
  position: relative;
}
.scale-label-offer {
  position: absolute;
  top: -22px;
  transform: translateX(-50%);
  font-size: 7.5pt;
  font-weight: 700;
  color: #062C55;
  white-space: nowrap;
}
.scale-pointer {
  width: 2px;
  height: 6px;
  background: #062C55;
  margin: 2px auto 0;
}
.scale-bar {
  height: 12px;
  border-radius: 6px;
  background: #E5EBEF;
  display: flex;
  overflow: hidden;
}
.scale-segment-gradient {
  width: 57%;
  background: linear-gradient(to right, #E0574A 0%, #EEB33C 45%, #1FB487 100%);
}
.scale-segment-hatch {
  width: 40%;
  background: repeating-linear-gradient(
    45deg,
    #E8E4DA,
    #E8E4DA 6px,
    #DCD6CA 6px,
    #DCD6CA 12px
  );
}
.scale-footer-row {
  display: flex;
  justify-content: space-between;
  font-size: 8pt;
  color: #6B7A86;
  margin-top: 6px;
}
.estimate-disclaimer-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 9.5pt;
  color: #17242F;
  line-height: 1.55;
  margin-top: 8px;
  margin-bottom: 10px;
}

/* Radar & Factors */
.factors-split-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 12px;
  align-items: start;
  margin: 4px 0 20px;
}
.radar-box {
  width: 240px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-caption {
  font-size: 7pt;
  color: #6B7A86;
  text-align: center;
  margin-top: 2px;
  line-height: 1.5;
}
.factors-bullets-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
}
.factor-bullet {
  display: flex;
  gap: 9px;
  align-items: baseline;
  font-size: 10pt;
  line-height: 1.5;
  color: #27343F;
}
.bullet-dot.teal {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0EB28D;
  flex-shrink: 0;
  position: relative;
  top: -1px;
}
.pay-multiplier-note {
  font-size: 8.5pt;
  color: #6B7A86;
  margin-top: 4px;
  line-height: 1.5;
}
.shape-summary-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 14px 16px 15px;
  margin-top: 0;
  margin-bottom: 10px;
}
.shape-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 12pt;
  font-weight: 500;
  color: #062C55;
  margin-bottom: 6px;
}
.shape-desc {
  font-size: 10pt;
  color: #27343F;
  margin: 0;
  line-height: 1.55;
}

/* Release Check */
.release-check-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid #E7E4DD;
  margin-top: 8px;
}
.release-check-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0 9px;
  border-bottom: 1px solid #E7E4DD;
}
.rc-point {
  font-size: 10pt;
  font-weight: 700;
  color: #062C55;
  line-height: 1.4;
}
.rc-detail {
  font-size: 10pt;
  color: #27343F;
  line-height: 1.4;
  margin-top: 2px;
}

/* Section 2 Details */
.detail-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 12px 14px 14px;
  background: #FFFFFF;
  margin-bottom: 12px;
}
.detail-text {
  font-size: 8.5pt;
  color: #27343F;
  line-height: 1.55;
  margin: 6px 0 0;
}
.card-inner-box {
  background: #F5F4EF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 14px 18px;
  margin-top: 10px;
}
.detail-list {
  margin: 0;
  padding-left: 16px;
  font-size: 8.5pt;
  line-height: 1.55;
  color: #27343F;
}
.detail-list li {
  margin-bottom: 0;
}

/* Clauses */
.clause-pill-badge {
  margin: 4px 0 8px;
}
.clause-single-heading {
  font-family: "Newsreader", Georgia, serif;
  font-size: 13pt;
  font-weight: 500;
  color: #062C55;
  margin: 0 0 12px 0;
}
.clause-two-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.c-box-white {
  background: #FFFFFF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 12px 14px 14px;
}
.c-box-beige {
  background: #F5F4EF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 12px 14px 14px;
}
.c-box-header {
  font-size: 7pt;
  font-weight: 600;
  letter-spacing: 1px;
  color: #5A6B78;
  margin-bottom: 8px;
}
.c-box-body {
  font-size: 10pt;
  line-height: 1.6;
  color: #17242F;
}
.clause-why {
  font-size: 10pt;
  color: #17242F;
  margin: 0 0 12px;
  line-height: 1.6;
}
.clause-action-box {
  background: #FFFFFF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 9pt;
  font-weight: 700;
  color: #17242F;
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 8px;
}
.action-arrow {
  color: #17242F;
  font-weight: 700;
}
.clause-dashed-rule {
  border-top: 1px dashed #D8D4CA;
  margin: 8px 0 10px 0;
}
.clause-source-line {
  font-size: 8pt;
  color: #6B7A86;
  line-height: 1.6;
}
.clause-source-line u {
  color: #062C55;
  text-decoration: underline;
}

/* Email Mock Container */
.email-mock-container {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
  margin-bottom: 10px;
}
.email-meta-header {
  background: #F5F4EF;
  border-bottom: 1px solid #E2E0D8;
  padding: 11px 14px;
  font-size: 8.5pt;
  color: #6B7A86;
}
.email-body {
  padding: 16px 14px 14px;
  font-size: 10pt;
  line-height: 1.6;
  color: #17242F;
}
.email-questions-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
.email-questions-list li {
  margin-bottom: 9px;
}
.email-mock-container.compact-container {
  padding: 0;
  margin-bottom: 8px;
}
.email-mock-container.compact-container .email-body {
  padding: 10px 14px;
  font-size: 8.5pt;
  line-height: 1.35;
}
.email-questions-list.compact-list {
  padding-left: 18px;
  margin: 4px 0;
}
.email-questions-list.compact-list li {
  margin-bottom: 3.5px;
  font-size: 8.5pt;
  line-height: 1.35;
}
.why-it-works-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 11px 12px;
  font-size: 10pt;
  color: #17242F;
  line-height: 1.55;
}

/* Practical Page */
.practical-block {
  margin-bottom: 0;
}
.practical-heading {
  font-family: "Newsreader", Georgia, serif;
  font-size: 12.5pt;
  font-weight: 500;
  color: #062C55;
  margin: 4px 0 10px 0;
}
.practical-text {
  font-size: 10pt;
  line-height: 1.6;
  color: #17242F;
  margin: 0;
}
.practical-divider {
  width: 100%;
  height: 1px;
  background: #EFECE6;
  margin: 16px 0 12px;
}
.practical-bullets {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 4px;
}
.p-bullet {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 9pt;
  line-height: 1.5;
  color: #17242F;
}

/* Three Paths Page (ca21.png) */
.three-paths-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.path-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 14px 14px 16px;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}
.path-opt-kicker {
  font-size: 6.5pt;
  font-weight: 600;
  letter-spacing: 1px;
  color: #5A6B78;
  margin-bottom: 6px;
}
.path-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 13pt;
  color: #062C55;
  margin: 0 0 14px 0;
  font-weight: 500;
}
.path-desc {
  font-size: 9pt;
  color: #27343F;
  line-height: 1.55;
  margin: 0 0 12px 0;
}
.path-bold-note {
  font-size: 9pt;
  font-weight: 700;
  color: #17242F;
  line-height: 1.55;
  margin: 0;
}
.honest-note-card {
  border: 1px solid #E2E0D8;
  border-radius: 8px;
  padding: 12px 12px;
  font-size: 10pt;
  color: #17242F;
  background: #FFFFFF;
  line-height: 1.6;
}

/* Sources */
.sources-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  color: #27343F;
}
.sources-table th {
  text-align: left;
  font-size: 6.5pt;
  font-weight: 600;
  letter-spacing: 1px;
  color: #5A6B78;
  padding: 6px 4px 7px;
  border-bottom: 1px solid #CFCAC0;
}
.sources-table td {
  padding: 7px 4px 8px;
  border-bottom: 1px solid #EFECE6;
  vertical-align: top;
  line-height: 1.45;
}
.src-id-title {
  font-weight: 400;
  color: #27343F;
}
.src-url {
  font-size: 7.5pt;
  font-weight: 700;
  color: #062C55;
  text-decoration: underline;
  word-break: break-all;
}

/* Lawyer Handover */
.lawyer-handover-card {
  border: 1px solid #E2E0D8;
  border-radius: 10px;
  padding: 22px 26px 22px 26px;
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 26px;
  align-items: center;
  margin-bottom: 18px;
}
.handover-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 13pt;
  font-weight: 500;
  color: #062C55;
  margin-bottom: 6px;
}
.handover-desc {
  font-size: 9.5pt;
  color: #27343F;
  line-height: 1.55;
  margin: 0;
}
.report-id-badge {
  font-size: 10pt;
  color: #062C55;
}
.qr-box {
  width: 90px;
  height: 90px;
  margin: 0 auto;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  padding: 6px;
  background: #FFFFFF;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.qr-sub {
  font-size: 7.5pt;
  color: #27343F;
  text-align: center;
  margin-top: 8px;
  line-height: 1.4;
}
.transparency-note {
  font-size: 8.5pt;
  color: #6B7A86;
  line-height: 1.55;
  margin-bottom: 14px;
}
.before-use-footer {
  border-top: 1px solid #EFECE6;
  padding-top: 8px;
  font-size: 7.5pt;
  color: #9AA7B2;
  line-height: 1.5;
}
.rid {
  font-size: 8pt;
  color: #9AA7B2;
}

/* Page Footer */
.page-footer {
  margin-top: auto;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.page-footer-pill {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 14px;
  background: #F5F4EF;
  border: 1px solid #E2E0D8;
  border-radius: 6px;
  font-size: 7pt;
  color: #5A6B78;
  text-align: center;
  line-height: 1.45;
}
.kn {
  color: #062C55;
  font-weight: 700;
}
.page-footer-num {
  font-size: 7pt;
  color: #062C55;
  font-weight: 700;
  text-align: center;
}
.page-footer-slim {
  margin-top: auto;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.toc-row:last-child {
  border-bottom: none;
}

.before-card.alert-card .card-num-title {
  color: #8A5A00;
}

.its-item:last-child {
  border-bottom: none;
}

.p-dot.done {
  background: #9AA7B2;
}

.myth-col-left {
  background: #F5F4EF;
  padding: 9px 12px 10px;
}

.myth-col-right {
  padding: 9px 12px 10px;
}

a.src-link {
  color: #062C55;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 1.5px;
}

.checks-summary-pills .pill {
  font-size: 7pt;
  letter-spacing: 1px;
  padding: 4px 8px;
}

.gauge-needle-label .gl-lead {
  color: #6B7A86;
  font-weight: 400;
}

.factor-bullet b {
  color: #062C55;
}

.clause-pill-badge .pill {
  font-size: 7pt;
  letter-spacing: 1px;
  padding: 5px 8px;
}

.email-meta-header b {
  color: #062C55;
}

.email-body p {
  margin: 0 0 9px;
}

.why-it-works-card b {
  color: #0C8F72;
}

.p-bullet .bullet-dot.teal {
  width: 4px;
  height: 4px;
  background: #062C55;
  top: -2px;
}

.honest-note-card b {
  color: #0C8F72;
}

.sources-table td.src-item {
  font-weight: 700;
  color: #062C55;
}

.handover-right {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-box svg {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.qr-sub b {
  color: #062C55;
}

.transparency-note b {
  color: #17242F;
}

.before-use-footer p {
  margin: 0 0 2px;
}

.page-footer-pill b {
  color: #062C55;
}

.glance-lead b {
  color: #062C55;
}

.clause-why b {
  color: #062C55;
}

/* Clauses flowing */
.page.clauses-flow {
  height: auto !important;
  min-height: 11in !important;
  max-height: none !important;
  overflow: visible !important;
  page-break-after: always;
  break-after: page;
}
.clause-item {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 24px;
}

/* Sources flowing & layout */
.page.sources-page {
  height: auto !important;
  min-height: 11in !important;
  max-height: none !important;
  overflow: visible !important;
  page-break-after: always;
  break-after: page;
}
.sources-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.sources-table th:nth-child(1) { width: 22%; }
.sources-table th:nth-child(2) { width: 33%; }
.sources-table th:nth-child(3) { width: 45%; }
.sources-table thead { display: table-header-group; }
.sources-table tr { break-inside: avoid; page-break-inside: avoid; }
.sources-table td, .sources-table a { word-break: normal; overflow-wrap: anywhere; }

@media print {
  .page-footer { display: none !important; }
}
`

export function renderReportHtml(r: ReportJson, m: RenderMeta, totalPages?: number, upTo?: number): string {
  const initial = reportSections(r, m)
  const effTotal = totalPages || initial.length
  // Page numbers for the contents page come from the real section order unless the caller gave them.
  const pages: Record<string, number> = {}
  initial.forEach((s, i) => { if (!(s.id in pages)) pages[s.id] = i + 1 })
  const m2: RenderMeta = { ...m, pages: { ...pages, ...(m.pages || {}) } }
  const all = reportSections(r, m2, effTotal)
  const secs = upTo === undefined ? all : all.slice(0, upTo)
  const fontsCss = getFontsCss()
  const rawHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>FairExit Severance Report ${esc(m.reportId)}</title>
    <style>
${fontsCss}
${CSS}
    </style>
  </head>
  <body>
    ${secs.map((s) => s.html).join('\n')}
  </body>
</html>`
  return fixItalicSpaces(rawHtml)
}

export function allowedAmounts(input: Record<string, any>): number[] {
  const out: number[] = []
  const rows = input?.confirmed_facts?.rows || {}
  for (const r of Object.values<any>(rows)) {
    for (const v of [r.value, r.user_value, r.doc_value]) {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[$,]/g, ''))
      if (Number.isFinite(n)) out.push(n)
    }
  }
  for (const k of ['amount', 'weekly_pay']) if (Number.isFinite(input?.minimum?.[k])) out.push(input.minimum[k])
  for (const k of ['low', 'high']) if (Number.isFinite(input?.range?.[k])) out.push(input.range[k])
  return out
}

export { fmtMoney }
