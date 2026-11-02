/**
 * Call B output: shape check, rule checks (citations and dollar amounts), and the HTML the PDF
 * is printed from. Every report has its own set of sections (rule U1), so the contents list is
 * built from the sections that actually came back and empty sections are left out.
 */
import { fmtLongDate, fmtMoney } from './values'
import type { SourceRow } from './regionData'
import type { Jurisdiction } from './jurisdictions'

export interface ReportJson {
  cover: { role_line: string; place_line: string }
  glance: string
  contract_note?: string
  confirmed_line: string
  checks: Array<{ topic: string; letter_says?: string; contract_says?: string; rule_says?: string; status: 'ok' | 'bad' | 'ask' | 'info'; why?: string; source_id?: string | null; from_answers?: boolean }>
  factors?: { service?: number; age?: number; job_level?: number; similar_jobs?: number; reasons?: Record<string, string> }
  release_check?: Array<{ status: string; point: string; detail: string; source_id?: string | null }>
  myths?: Array<{ myth: string; fact: string; source_id?: string | null }>
  clauses?: Array<{ title: string; status: string; what_it_says: string; what_it_means: string; question_to_ask: string; source_id?: string | null }>
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

/** Soft checks against prompt rules 1, 2 and U2. Logged with the report for the test runs (note 7). */
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

// ---------------------------------------------------------------------------
// HTML (printed to PDF). Plain, print-first, no external assets.
// ---------------------------------------------------------------------------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const STATUS_LABEL: Record<string, string> = { ok: 'Looks right', bad: 'Worth a closer look', ask: 'Ask about this', info: 'Good to know' }

export interface RenderMeta {
  reportId: string
  jurisdiction: Jurisdiction
  sources: SourceRow[]
  rulesAsOf: string | null
  attestedAt: string | null
  generatedAt: string
  /** page numbers per section id, filled in by the PDF two-pass layout */
  pages?: Record<string, number>
  /** engine numbers for the range gauge and factor values (from report_inputs) */
  numbers?: ReportNumbers | null
}

/**
 * The numbers behind the graphs, taken from the Call B input (never from the model):
 * the legal minimum, the common-law range, the confirmed offer and the factor values.
 * Also returned by GET /cases/:id/report so native apps draw the same gauge.
 */
export interface ReportNumbers {
  country: 'CA' | 'US'
  minimum: { amount: number | null; weeks: number | null; none: boolean; statute_short?: string; arithmetic?: string }
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
    const label = offer < m.amount ? 'Your offer — below the legal minimum' : position < 1 / 3 ? 'Your offer — on the low end' : position < 2 / 3 ? 'Your offer — in the middle' : 'Your offer — on the high end'
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
    minimum: { amount: n(m.amount), weeks: n(m.weeks), none: !!m.none, statute_short: m.statute_short, arithmetic: m.arithmetic },
    range: range ? { low: range.low, high: range.high, lowMonths: range.lowMonths, highMonths: range.highMonths, basis: range.basis } : null,
    offer,
    gauge,
    factorValues,
  }
}

/** Semicircle gauge, same drawing as the app prototype (app-proto/app.js gauge()). */
function gaugeSvg(frac: number): string {
  const cx = 110, cy = 106, r = 86, sw = 14
  const pt = (f: number, rad: number) => { const t = Math.PI * (1 - f); return [cx + rad * Math.cos(t), cy - rad * Math.sin(t)] }
  const arc = (f0: number, f1: number, col: string) => {
    const p0 = pt(f0, r), p1 = pt(f1, r)
    return `<path d="M${p0[0].toFixed(2)} ${p0[1].toFixed(2)} A${r} ${r} 0 0 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
  }
  const g = 0.075
  let h = ''
  ;[[0, 1 / 3, '#e0574a'], [1 / 3, 2 / 3, '#eeb33c'], [2 / 3, 1, '#1fb487']].forEach((s, i) => { h += arc((s[0] as number) + (i ? g / 2 : 0.02), (s[1] as number) - (i < 2 ? g / 2 : 0.02), s[2] as string) })
  const nd = pt(frac, r - 26)
  h += `<line x1="${cx}" y1="${cy}" x2="${nd[0].toFixed(2)}" y2="${nd[1].toFixed(2)}" stroke="#062c55" stroke-width="3.5" stroke-linecap="round"/>`
  h += `<circle cx="${cx}" cy="${cy}" r="8" fill="#062c55"/><circle cx="${cx}" cy="${cy}" r="3" fill="#fff"/>`
  return `<svg class="gauge" width="220" height="122" viewBox="0 0 220 122">${h}</svg>`
}

interface Section { id: string; title: string; html: string }

export function reportSections(r: ReportJson, m: RenderMeta): Section[] {
  const w = m.jurisdiction.words
  const sec: Section[] = []
  const glance = [
    `<p class="lead">${esc(r.glance)}</p>`,
    r.contract_note ? `<p class="note">${esc(r.contract_note)}</p>` : '',
  ].join('')
  if (r.glance) sec.push({ id: 'glance', title: 'At a glance', html: glance })

  const nb = m.numbers
  const money = (v: number) => fmtMoney(v, m.jurisdiction.country)
  if (nb && nb.country === 'CA' && nb.range && nb.minimum.amount !== null) {
    sec.push({
      id: 'range', title: 'Your range',
      html: `<div class="item rangecard"><div class="eb">Estimated severance range</div>
        <div class="ser">${esc(money(nb.minimum.amount))} – ${esc(money(nb.range.high))}</div>
        ${nb.gauge ? `${gaugeSvg(nb.gauge.position)}<div class="gl"><span>Floor</span><span>Common-law</span></div><div class="gp">${esc(nb.gauge.label)} (${esc(money(nb.gauge.offer))})</div>` : ''}
        <dl class="nums"><dt>Legal minimum (${esc(nb.minimum.statute_short || 'the law')})</dt><dd>${esc(money(nb.minimum.amount))}${nb.minimum.weeks !== null ? ` · ${esc(nb.minimum.weeks)} weeks of pay` : ''}</dd>
        ${nb.minimum.arithmetic ? `<dd class="muted">${esc(nb.minimum.arithmetic)}</dd>` : ''}
        <dt>What courts have awarded people like you</dt><dd>${esc(money(nb.range.low))} – ${esc(money(nb.range.high))} · ${esc(nb.range.lowMonths)} to ${esc(nb.range.highMonths)} months (${esc(nb.range.basis)})</dd></dl></div>
        <div class="estband">An estimate, not legal advice or a guarantee. Only a licensed employment ${esc(w.lawyer)} can confirm what you're owed.</div>`,
    })
  } else if (nb && nb.country === 'US') {
    sec.push({
      id: 'range', title: 'Is there a legal minimum?',
      html: nb.minimum.none
        ? `<div class="item"><div class="ser">No.</div><p>Neither ${esc(m.jurisdiction.name)} nor federal law requires severance${nb.offer !== null ? `. Your ${esc(money(nb.offer))} is what they chose to offer — there is no floor to be "below"` : ''}.</p></div>`
        : `<div class="item"><div class="ser">${esc(money(nb.minimum.amount || 0))}</div><p>${esc(nb.minimum.arithmetic || '')}</p></div>`,
    })
  }

  if (r.checks?.length) {
    sec.push({
      id: 'checks', title: 'What we checked',
      html: r.checks.map((c) => `
        <div class="item check st-${esc(c.status)}">
          <div class="ih"><span class="pill">${esc(STATUS_LABEL[c.status] || c.status)}</span><h3>${esc(c.topic)}</h3></div>
          <dl>
            ${c.letter_says ? `<dt>Your ${esc(w.letter)} says</dt><dd>${esc(c.letter_says)}</dd>` : ''}
            ${c.contract_says ? `<dt>Your ${esc(w.contract)} says</dt><dd>${esc(c.contract_says)}</dd>` : ''}
            ${c.rule_says ? `<dt>The rule says</dt><dd>${esc(c.rule_says)}</dd>` : ''}
          </dl>
          ${c.why ? `<p class="why">${esc(c.why)}</p>` : ''}
          ${c.source_id ? `<p class="src">Source: ${esc(c.source_id)}</p>` : ''}
        </div>`).join(''),
    })
  }
  if (r.factors && Object.keys(r.factors).some((k) => k !== 'reasons')) {
    const names: Record<string, string> = { service: 'Years of service', age: 'Age', job_level: 'Job level', similar_jobs: 'Similar jobs nearby' }
    sec.push({
      id: 'factors', title: 'What moves the range',
      html: Object.keys(names).filter((k) => (r.factors as any)[k] !== undefined).map((k) => {
        const v = Math.max(0, Math.min(1, Number((r.factors as any)[k]) || 0))
        const fv = m.numbers?.factorValues?.[k]
        return `<div class="item factor"><div class="ih" style="justify-content:space-between"><h3>${names[k]}</h3>${fv ? `<span class="muted">${esc(fv)}</span>` : ''}</div><div class="bar"><span style="width:${Math.round(v * 100)}%"></span></div><p>${esc(r.factors?.reasons?.[k] || '')}</p></div>`
      }).join(''),
    })
  }
  if (r.release_check?.length) {
    sec.push({
      id: 'release_check', title: 'Release check',
      html: r.release_check.map((x) => `<div class="item st-${esc(x.status)}"><div class="ih"><span class="pill">${esc(STATUS_LABEL[x.status] || x.status)}</span><h3>${esc(x.point)}</h3></div><p>${esc(x.detail)}</p>${x.source_id ? `<p class="src">Source: ${esc(x.source_id)}</p>` : ''}</div>`).join(''),
    })
  }
  if (r.clauses?.length) {
    sec.push({
      id: 'clauses', title: 'Terms to understand',
      html: r.clauses.map((c) => `<div class="item st-${esc(c.status)}"><div class="ih"><h3>${esc(c.title)}</h3></div><dl><dt>What it says</dt><dd>${esc(c.what_it_says)}</dd><dt>What it means</dt><dd>${esc(c.what_it_means)}</dd><dt>Question to ask</dt><dd>${esc(c.question_to_ask)}</dd></dl>${c.source_id ? `<p class="src">Source: ${esc(c.source_id)}</p>` : ''}</div>`).join(''),
    })
  }
  if (r.myths?.length) {
    sec.push({
      id: 'myths', title: 'Common myths',
      html: r.myths.map((x) => `<div class="item"><div class="ih"><h3>${esc(x.myth)}</h3></div><p>${esc(x.fact)}</p>${x.source_id ? `<p class="src">Source: ${esc(x.source_id)}</p>` : ''}</div>`).join(''),
    })
  }
  if (r.questions?.length) {
    sec.push({ id: 'questions', title: 'Questions to ask', html: `<ol class="list">${r.questions.map((q) => `<li class="item">${esc(q)}</li>`).join('')}</ol>` })
  }
  if (r.next_steps?.length) {
    sec.push({ id: 'next_steps', title: 'This week', html: `<ol class="list">${r.next_steps.map((q) => `<li class="item">${esc(q)}</li>`).join('')}</ol>` })
  }
  const used = new Set(r.citations_used || [])
  const cited = m.sources.filter((s) => used.has(s.id))
  if (cited.length) {
    sec.push({
      id: 'sources', title: 'Sources',
      html: `<ol class="list sources">${cited.map((s) => `<li class="item"><b>${esc(s.id)}</b> · ${esc(s.rule)}. ${esc(s.section)}.<br><span class="url">${esc(s.url)}</span> <span class="muted">Checked ${esc(s.checked)}</span></li>`).join('')}</ol>`,
    })
  }
  // "Before you use this" (H6, rule 18) and the report ID on the last page
  sec.push({
    id: 'before', title: 'Before you use this',
    html: `<div class="item"><p>${esc(r.confirmed_line)}</p>${m.rulesAsOf ? `<p>Rules as of ${esc(fmtLongDate(m.rulesAsOf))}.</p>` : ''}
      <p>This report is information, not legal advice. Only a ${esc(w.lawyer)} licensed in your ${esc(w.region)} can tell you what you are owed.</p>
      <p class="rid">Report ID ${esc(m.reportId)} · made ${esc(fmtLongDate(m.generatedAt))}</p></div>`,
  })
  return sec
}

const CSS = `
@page { size: Letter; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body { font-family: "DM Sans", -apple-system, "Segoe UI", Arial, sans-serif; color: #17242f; font-size: 11pt; line-height: 1.5; margin: 0; }
h1, h2 { font-family: "Newsreader", Georgia, serif; color: #062c55; font-weight: 600; }
.cover { height: 230mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover .k { font-size: 9pt; letter-spacing: 1.5px; text-transform: uppercase; color: #0c8f72; font-weight: 700; }
.cover h1 { font-size: 34pt; margin: 8px 0 14px; line-height: 1.1; }
.cover p { font-size: 13pt; margin: 2px 0; color: #5a6b78; }
.toc { break-after: page; }
.toc ol { list-style: none; padding: 0; }
.toc li { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #e7e4dd; }
.toc li span.dots { flex: 1; }
section { break-before: page; }
section > h2 { font-size: 20pt; margin: 0 0 12px; break-after: avoid; }
section > h2 + .item, section > h2 + ol > .item:first-child, section > h2 + p { break-before: avoid; }
.item { break-inside: avoid; page-break-inside: avoid; border: 1px solid #e7e4dd; border-radius: 8px; padding: 10px 12px; margin: 0 0 10px; }
.item h3 { font-size: 12pt; margin: 0; color: #062c55; }
.ih { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.pill { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; padding: 2px 6px; border-radius: 6px; background: #eef8f3; color: #0c8f72; white-space: nowrap; }
.st-bad .pill { background: #fbeceb; color: #d42e2b; } .st-ask .pill { background: #fbf3df; color: #8a6400; } .st-info .pill { background: #eaf1fb; color: #2c62b8; }
dl { margin: 4px 0; } dt { font-size: 8.5pt; font-weight: 700; color: #5a6b78; text-transform: uppercase; letter-spacing: .4px; margin-top: 4px; } dd { margin: 0 0 2px; }
.why { margin: 6px 0 0; } .src, .muted { font-size: 8.5pt; color: #5a6b78; margin: 4px 0 0; } .url { font-size: 8.5pt; word-break: break-all; color: #0c8f72; }
.lead { font-size: 13pt; } .note { background: #fbf3df; border-radius: 8px; padding: 8px 10px; }
.list { padding-left: 0; list-style-position: inside; } .list .item { list-style: decimal inside; }
.bar { height: 8px; background: #e7e4dd; border-radius: 4px; overflow: hidden; margin: 6px 0; } .bar span { display: block; height: 100%; background: #0eb28d; }
.rid { font-size: 9pt; color: #5a6b78; margin-top: 18px; }
.rangecard { text-align: center; padding: 16px; }
.eb { font-size: 8.5pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #5a6b78; }
.ser { font-family: "Newsreader", Georgia, serif; font-size: 24pt; font-weight: 600; color: #0c8f72; margin: 4px 0; }
.gauge { display: block; margin: 8px auto 0; }
.gl { display: flex; justify-content: space-between; width: 220px; margin: 0 auto; font-size: 8pt; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #5a6b78; }
.gp { font-size: 12pt; color: #062c55; font-weight: 600; margin-top: 6px; }
.nums { text-align: left; margin-top: 12px; }
.estband { background: #fff8e8; border: 1px solid #ecdca6; border-left: 4px solid #c9a227; border-radius: 8px; padding: 8px 10px; font-size: 9.5pt; color: #6b5a1e; break-inside: avoid; }
`

/**
 * Full HTML. `upTo` renders only the first N sections (used by the PDF layout pass to find the
 * page each section starts on). Without `m.pages` the contents list shows no numbers.
 */
export function renderReportHtml(r: ReportJson, m: RenderMeta, upTo?: number): string {
  const all = reportSections(r, m)
  const secs = upTo === undefined ? all : all.slice(0, upTo)
  const toc = all
    .map((s) => `<li><span>${esc(s.title)}</span><span class="dots"></span><span>${m.pages?.[s.id] ?? ''}</span></li>`)
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FairExit Severance Report ${esc(m.reportId)}</title><style>${CSS}</style></head><body>
<div class="cover"><div class="k">FairExit · Severance Report</div><h1>Your severance report</h1>
<p>${esc(r.cover?.role_line)}</p><p>${esc(r.cover?.place_line || m.jurisdiction.name)}</p>
<p class="muted" style="margin-top:24px">Information, not legal advice. Report ID ${esc(m.reportId)}</p></div>
<div class="toc"><h2>Contents</h2><ol>${toc}</ol></div>
${secs.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.html}</section>`).join('\n')}
</body></html>`
}

/** Amounts the report may state (rule 2). */
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
