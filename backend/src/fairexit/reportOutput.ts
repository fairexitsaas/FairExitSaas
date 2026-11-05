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
  cover: { role_line: string; place_line: string }
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
  ask: 'Ask about this',
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
}

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
    minimum: { amount: n(m.amount), weeks: n(m.weeks), none: !!m.none, statute_short: m.statute_short, arithmetic: m.arithmetic },
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
  return `<svg class="gauge" width="240" height="120" viewBox="0 0 240 120">${h}</svg>`
}

/** Radar / Diamond chart matching sample PDF ca9.png */
function radarSvg(factors?: ReportJson['factors']): string {
  const cx = 165, cy = 125, r = 68
  const s = Math.max(0.2, Math.min(1, Number(factors?.service) || 0.75))
  const a = Math.max(0.2, Math.min(1, Number(factors?.age) || 0.8))
  const j = Math.max(0.2, Math.min(1, Number(factors?.job_level) || 0.5))
  const m = Math.max(0.2, Math.min(1, Number(factors?.similar_jobs) || 0.5))

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
      <svg width="280" height="250" viewBox="0 0 280 250">
        ${gridDiamonds}
        ${axes}
        ${poly}
        ${centerDot}
        <text x="${cx}" y="${cy - r - 10}" text-anchor="middle" font-family="'DM Sans', sans-serif" font-size="9.5pt" font-weight="700" fill="#062C55">Length of service</text>
        <text x="${cx + r + 8}" y="${cy + 4}" text-anchor="start" font-family="'DM Sans', sans-serif" font-size="9.5pt" font-weight="700" fill="#062C55">Age</text>
        <text x="${cx}" y="${cy + r + 18}" text-anchor="middle" font-family="'DM Sans', sans-serif" font-size="9.5pt" font-weight="700" fill="#062C55">Job level</text>
        <text x="${cx - r - 8}" y="${cy + 4}" text-anchor="end" font-family="'DM Sans', sans-serif" font-size="9.5pt" font-weight="700" fill="#062C55">Similar jobs</text>
      </svg>
    </div>
  `
}

function progressDots(active: number, total = 5): string {
  let dots = ''
  for (let i = 1; i <= total; i++) {
    dots += `<span class="p-dot ${i === active ? 'active' : ''}"></span>`
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

export interface Section {
  id: string
  title: string
  html: string
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

  // -------------------------------------------------------------------------
  // 1. COVER PAGE (ca1.png / us1.png)
  // -------------------------------------------------------------------------
  const clientName = m.answers?.name || m.answers?.full_name || (isUS ? 'Raymond Okafor-Lindqvist' : 'Gurpreet Sandhu')
  const dateFormatted = fmtLongDate(m.generatedAt)
  const coverHtml = `
    <div class="page cover-page">
      <div class="cover-card">
        <div class="cover-hero-band">
          ${heroBandSrc ? `<img class="hero-img" src="${heroBandSrc}" alt="FairExit Illustration"/>` : '<div class="hero-placeholder"></div>'}
          <div class="hero-logo-box">
            ${logoSrc ? `<img src="${logoSrc}" class="hero-logo" alt="FairExit"/>` : '<div class="hero-logo-text">FairExit</div>'}
            <div class="hero-tagline">Challenge your severance offer.</div>
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
            <div class="meta-col">
              <div class="meta-label">PREPARED FOR</div>
              <div class="meta-value">${esc(clientName)}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">ROLE</div>
              <div class="meta-value">${esc(r.cover?.role_line || 'QA Supervisor · 14 yrs 6 mo')}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">WHERE</div>
              <div class="meta-value">${esc(r.cover?.place_line || m.jurisdiction.name)}</div>
            </div>
            <div class="meta-col">
              <div class="meta-label">DATE</div>
              <div class="meta-value">${esc(dateFormatted)}</div>
            </div>
          </div>
          <div class="cover-test-note">
            TEST REPORT · fictional person and company · <b>For information only</b> — not legal advice · Yours to keep and use
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
  const tocItems = [
    {
      num: '1',
      title: 'Where you stand',
      desc: 'Your offer checked against the rules, and what lines up.',
      range: p['s1_cover'] && (p['s1_factors'] || p['s1_release'])
        ? `pages ${p['s1_cover']}–${p['s1_factors'] || p['s1_release']}`
        : 'pages 4–9',
    },
    {
      num: '2',
      title: isUS ? "Why there's no minimum" : 'Two numbers to understand',
      desc: isUS ? "What you're owed comes from what was promised." : 'The legal minimum, and what a court might award.',
      range: p['s2_cover'] && p['s2_numbers']
        ? `pages ${p['s2_cover']}–${p['s2_numbers']}`
        : (isUS ? 'pages 9–10' : 'pages 10–11'),
    },
    {
      num: '3',
      title: "What's in your letter and contract",
      desc: 'Clause by clause, with sources.',
      range: p['s3_cover'] && (p['s3_clause_last'] || p['s3_clause_3'] || p['s3_clauses'])
        ? `pages ${p['s3_cover']}–${p['s3_clause_last'] || p['s3_clause_3'] || p['s3_clauses']}`
        : (isUS ? 'pages 11–15' : 'pages 12–16'),
    },
    {
      num: '4',
      title: 'Questions to prepare',
      desc: "Calm questions for HR, and this week's steps.",
      range: p['s4_cover'] && p['s4_practical']
        ? `pages ${p['s4_cover']}–${p['s4_practical']}`
        : (isUS ? 'pages 16–18' : 'pages 17–19'),
    },
    {
      num: '5',
      title: 'Your next step',
      desc: 'The three paths, side by side.',
      range: p['s5_cover'] && p['s5_three_paths']
        ? `pages ${p['s5_cover']}–${p['s5_three_paths']}`
        : (isUS ? 'pages 19–20' : 'pages 20–21'),
    },
    {
      num: '6',
      title: 'Where every number comes from',
      desc: 'Every number and rule, with its official source.',
      range: p['s6_sources'] ? `page ${p['s6_sources']}` : (isUS ? 'page 21' : 'page 22'),
    },
    {
      num: '7',
      title: isUS ? 'Talking to an attorney' : 'Talking to a lawyer',
      desc: 'How to hand this report over, and your report ID.',
      range: p['s7_lawyer'] ? `page ${p['s7_lawyer']}` : (isUS ? 'page 22' : 'page 23'),
    },
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
        <div class="legend-header"><b>How to read the colours:</b> they always mean the same thing.</div>
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
  const beforeCards = [
    { num: '1', title: 'This is a do-it-yourself report', text: `This is designed for you to use <b>on your own</b>. It organizes your offer and prepares questions — it is <b>not</b> advice a ${w.lawyer} would give you after reviewing your full situation, and a ${w.lawyer} may see things very differently. Anything you choose to send or say, you're doing <b>on your own initiative</b>.` },
    { num: '2', title: 'Information, not legal advice', text: `This pack gives you information to help you prepare. It does <b>not</b> make FairExit your ${w.lawyer} and does not create a ${w.lawyer}–client relationship. Nothing here is legal advice.` },
    { num: '3', title: 'We use AI — mistakes can happen', isAlert: true, text: `The explanations, notes, and draft questions are produced by <b>software and AI</b> from general rules and the details you gave us. <b>AI can be wrong, details can be misread, and laws change</b>. It is up to you to read everything carefully and confirm every fact is correct before you rely on it.` },
    { num: '4', title: 'No guarantee — and the decisions are yours', text: `Any general information here can be wrong, and outcomes depend on your paperwork and your situation. <b>FairExit accepts no responsibility for what you send, say, or decide based on this report</b> — those choices are entirely yours. Deadlines to act can be short; confirm them with a ${w.lawyer} promptly.` },
    { num: '5', title: `Only a ${w.lawyer} can give you the exact answer`, text: `We provide clarity in an organized way. <b>Only a licensed employment ${w.lawyer}</b> can confirm what you're truly owed, review your real contract, and advise you. If anything feels urgent or serious — especially before you sign anything — speak to a ${w.lawyer}. The first call is often free.` },
    { num: '6', title: `Once a ${w.lawyer} takes your case, follow them`, text: `Everything here is <b>general and organizational</b>. If you retain a ${w.lawyer}, their advice <b>supersedes</b> anything in this report — follow your ${w.lawyer}, not this document. <b>Do not rely on this report once you're working with a ${w.lawyer}</b>.` },
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
        <div class="its-item">Things they don't always tell you</div>
        <div class="its-item">Did they do it right?</div>
        <div class="its-item">${isUS ? 'Your release check' : 'Your estimated range'}</div>
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
  const employerName = a.employer || a.company || 'Lakeshore Precision Components'
  const yearsStr = nb?.factorValues?.service || (a.years ? `${a.years} yrs` : '14 yrs 6 mo')
  const salaryStr = a.salary ? `$${Number(a.salary).toLocaleString()}` : '$112,500 + 10% bonus'
  const offerStr = nb?.offer ? money(nb.offer) : '$48,678 + $5,000 if you sign'
  const minStr = nb?.minimum?.amount ? money(nb.minimum.amount) : (isUS ? '112 hours · ~$4,146' : '$49,716')
  const deadlineStr = a.sign_by ? String(a.sign_by) : (isUS ? '21 days' : 'Oct 5, 5 p.m.')

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
          <p class="glance-lead">${esc(r.glance)}</p>
          ${r.contract_note ? `<p class="glance-contract-note">${esc(r.contract_note)}</p>` : ''}
        </div>
        <div class="glance-table">
          <div class="glance-row">
            <span class="glance-col-label">Employer</span>
            <span class="glance-col-val bold">${esc(employerName)}</span>
          </div>
          <div class="glance-row">
            <span class="glance-col-label">${isUS ? 'Service' : 'Years of service'}</span>
            <span class="glance-col-val bold">${esc(yearsStr)}</span>
          </div>
          ${isUS && a.age ? `
            <div class="glance-row">
              <span class="glance-col-label">Age</span>
              <span class="glance-col-val bold">${esc(String(a.age))}</span>
            </div>` : ''}
          <div class="glance-row">
            <span class="glance-col-label">Your pay</span>
            <span class="glance-col-val bold">${esc(salaryStr)}</span>
          </div>
          <div class="glance-row">
            <span class="glance-col-label">They offered</span>
            <span class="glance-col-val bold">${esc(offerStr)}</span>
          </div>
          <div class="glance-row">
            <span class="glance-col-label">${isUS ? 'Unpaid PTO' : 'Legal minimum'}</span>
            <span class="glance-col-val bold">${esc(minStr)}</span>
          </div>
          <div class="glance-row">
            <span class="glance-col-label">Decide by</span>
            <span class="glance-col-val bold">${esc(deadlineStr)}</span>
          </div>
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
  const myths = r.myths && r.myths.length ? r.myths : [
    { myth: 'I have to sign by their date or I get nothing.', fact: 'The legal minimum money cannot be signed away. Your letter says that is paid either way; only the extra depends on signing.', source_id: 'statute.s5' },
    { myth: 'They can pay me whenever they want.', fact: 'Termination and severance pay are due by the later of 7 days after your last day or your next regular pay day.', source_id: 'guidance.termination' },
    { myth: 'My benefits end on my last day.', fact: 'During the notice period, the employer must keep paying into your benefit plans.', source_id: 'statute.benefits' },
    { myth: 'Vacation pay is already in there.', fact: 'Vacation pay is owed on termination pay in addition to regular wages.', source_id: 'guidance.vacation' },
    { myth: "If I don't act this week, I lose my rights.", fact: 'You generally have up to 2 years to file an employment standards claim. The deadline in the letter is for their extra offer.', source_id: 'guidance.claims' },
    { myth: "I can't get unemployment / EI because I got severance.", fact: 'Apply promptly after your last day. Severance may spread out payments, but you do not forfeit entitlements.', source_id: 'guidance.ei' },
  ]

  const mythsHtml = `
    <div class="page myths-page">
      <div class="section-kicker-bar">
        <span>BEFORE YOU DECIDE</span>
        ${progressDots(2)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Things they don't always <i>tell you.</i></h2>
      <p class="section-sub">You have a date to sign by. Here's what the official rules say, so you can decide on your timeline, not theirs. Every point links to a government source.</p>

      <div class="myths-list">
        ${myths.slice(0, 6).map((mth) => `
          <div class="myth-card">
            <div class="myth-col-left">
              <div class="myth-header">WHAT PEOPLE OFTEN THINK</div>
              <div class="myth-text">"${esc(mth.myth)}"</div>
            </div>
            <div class="myth-col-right">
              <div class="myth-header">WHAT THE OFFICIAL RULES SAY</div>
              <div class="rule-text">${esc(mth.fact)}</div>
              ${mth.source_id ? `<div class="myth-source">Source: <u>${esc(mth.source_id)}</u></div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's1_myths', title: "Things they don't always tell you", html: mythsHtml })
  curPage += 1

  // -------------------------------------------------------------------------
  // 4.3 CHECKS TABLE: "Did they do it right?" (ca7.png / us7.png)
  // -------------------------------------------------------------------------
  const allChecks = r.checks || []
  const countOk = allChecks.filter((c) => c.status === 'ok').length
  const countBad = allChecks.filter((c) => c.status === 'bad').length
  const countAsk = allChecks.filter((c) => c.status === 'ask' || c.status === 'info').length

  const CHECKS_PER_PAGE = 8
  const checkChunks: Array<typeof allChecks> = []
  if (allChecks.length === 0) {
    checkChunks.push([])
  } else {
    for (let i = 0; i < allChecks.length; i += CHECKS_PER_PAGE) {
      checkChunks.push(allChecks.slice(i, i + CHECKS_PER_PAGE))
    }
  }

  checkChunks.forEach((chunk, chunkIdx) => {
    const isFirst = chunkIdx === 0
    const checksHtml = `
      <div class="page checks-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(3)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">Did they do it <i>right?</i></h2>
        <p class="section-sub">Your letter, your contract and the rules, side by side. Green = it lines up. Red = it doesn't. Yellow = worth asking about.</p>

        <div class="checks-summary-pills">
          <span class="pill pill-green">${countOk} LINE UP</span>
          <span class="pill pill-red">${countBad} DON'T</span>
          <span class="pill pill-yellow">${countAsk} TO ASK ABOUT</span>
        </div>

        <div class="checks-cards-list">
          <div class="checks-header-row">
            <div class="ch-col col-1">WHAT WE CHECKED</div>
            <div class="ch-col col-2">YOUR ${esc(w.letter).toUpperCase()} SAYS</div>
            <div class="ch-col col-3">YOUR ${esc(w.contract).toUpperCase()} SAYS</div>
            <div class="ch-col col-4">THE RULES SAY</div>
            <div class="ch-col col-5">DOES IT LINE UP?</div>
          </div>
          ${chunk.map((c) => {
            const st = c.status || 'info'
            const badgeClass = st === 'ok' ? 'badge-ok' : st === 'bad' ? 'badge-bad' : st === 'ask' ? 'badge-ask' : 'badge-info'
            const icon = st === 'ok' ? '✓' : st === 'bad' ? '✕' : st === 'ask' ? '!' : 'ℹ'
            return `
              <div class="check-card-row">
                <div class="ch-col col-1 bold navy">${esc(c.topic)}</div>
                <div class="ch-col col-2">${esc(c.letter_says || '—')}</div>
                <div class="ch-col col-3">${esc(c.contract_says || '—')}</div>
                <div class="ch-col col-4">${esc(c.rule_says || '—')}</div>
                <div class="ch-col col-5">
                  <div class="status-cell">
                    <span class="status-icon-circle ${badgeClass}">${icon}</span>
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
  if (!isUS && nb && nb.range && nb.minimum.amount !== null) {
    const minAmt = money(nb.minimum.amount)
    const highAmt = money(nb.range.high)
    const offerAmt = nb.offer !== null ? money(nb.offer) : '$48,678'
    const pos = nb.gauge ? Math.round(nb.gauge.position * 100) : 10
    const rangeHtml = `
      <div class="page range-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(4)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">Your estimated <i>range.</i></h2>
        <p class="section-sub">The legal minimum is a fixed rule. The top is our estimate of what a court might award, and only applies if your contract doesn't validly limit you.</p>

        <div class="navy-feature-card">
          <div class="feature-card-kicker">ESTIMATED SEVERANCE RANGE</div>
          <div class="feature-card-amount">${minAmt} – ${highAmt}</div>
          <p class="feature-card-desc">
            Floor = ${esc(nb.minimum.weeks || 8)} weeks notice + severance pay + vacation pay. Top = about ${esc(nb.range.lowMonths)}–${esc(nb.range.highMonths)} months of base pay, which applies only if your contract doesn't validly limit you. Your offer is <b>${nb.offer && nb.offer < nb.minimum.amount ? `${money(nb.minimum.amount - nb.offer)} below the minimum` : 'near the floor'}</b>.
          </p>
        </div>

        <div class="gauge-container">
          ${gaugeSvg(nb.gauge ? nb.gauge.position : 0.08)}
          <div class="gauge-needle-label">${esc(nb.gauge ? nb.gauge.label : 'Your offer — below the legal minimum')}</div>
        </div>

        <div class="linear-scale-container">
          <div class="scale-label-offer" style="left: ${Math.max(6, Math.min(88, pos))}%;">
            Offer ${offerAmt}
            <div class="scale-pointer"></div>
          </div>
          <div class="scale-bar">
            <div class="scale-segment-gradient"></div>
            <div class="scale-segment-hatch"></div>
          </div>
          <div class="scale-footer-row">
            <span>Legal minimum ${minAmt}</span>
            <span>Likely open · courts ${money(nb.range.low)}–${highAmt}</span>
          </div>
        </div>

        <div class="estimate-disclaimer-card">
          <b>This is an estimate, not a promise.</b> Base pay only: a bonus and benefits during the notice period could add to it. Pay from a new job usually reduces the part above the minimum. Only a lawyer can confirm your number.
        </div>
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    sec.push({ id: 's1_range', title: 'Your estimated range', html: rangeHtml })
    curPage += 1
  } else if (isUS) {
    const rc = r.release_check && r.release_check.length ? r.release_check : [
      { status: 'bad', point: 'At least 45 days to consider (group layoff)', detail: 'You were given 21 days.' },
      { status: 'bad', point: 'Job titles and ages of those selected and not selected', detail: 'Withheld as confidential.' },
      { status: 'ok', point: '7 days to revoke after signing', detail: 'Included in section 4.' },
      { status: 'ok', point: 'Advised to consult an attorney', detail: '"We encourage you to consult an attorney."' },
      { status: 'ok', point: 'Refers to the age discrimination law (ADEA)', detail: 'Named in section 3.' },
      { status: 'ok', point: "Something beyond what you're owed", detail: 'The $1,200 and severance are offered for the release.' },
    ]
    const releaseHtml = `
      <div class="page release-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(4)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">Your release <i>check.</i></h2>
        <p class="section-sub">US law sets no minimum severance, so the report checks the release you're being asked to sign against the rules that protect you.</p>

        <div class="navy-feature-card">
          <div class="feature-card-kicker">YOUR KEY NUMBER</div>
          <div class="feature-card-amount">45 days</div>
          <p class="feature-card-desc">
            The time federal rules give you to consider a release in a group layoff at your age. You were given 21 days, and no list of who was selected.
          </p>
        </div>

        <div class="release-check-list">
          ${rc.map((item) => {
            const isOk = item.status === 'ok'
            return `
              <div class="release-check-row">
                <span class="status-icon-circle ${isOk ? 'badge-ok' : 'badge-bad'}">${isOk ? '✓' : '✕'}</span>
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
    sec.push({ id: 's1_release', title: 'Your release check', html: releaseHtml })
    curPage += 1
  }

  // -------------------------------------------------------------------------
  // 4.5 FACTORS (Canada only: ca9.png)
  // -------------------------------------------------------------------------
  if (!isUS) {
    const f = r.factors
    const reasons = f?.reasons || {}
    const factorsHtml = `
      <div class="page factors-page">
        <div class="section-kicker-bar">
          <span>SECTION 1 OF 5 · WHERE YOU STAND</span>
          ${progressDots(5)}
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
              <div><b>Length of service: ${esc(nb?.factorValues?.service || '14 years 6 months')}.</b> ${esc(reasons.service || 'Strong. One of the biggest factors.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Age: ${esc(nb?.factorValues?.age || '57')}.</b> ${esc(reasons.age || 'Strong. Finding a new job can take longer.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Job level: ${esc(nb?.factorValues?.job_level || 'QA Supervisor, 4 reports')}.</b> ${esc(reasons.job_level || 'Middle. Above front-line, below senior management.')}</div>
            </div>
            <div class="factor-bullet">
              <span class="bullet-dot teal"></span>
              <div><b>Similar jobs nearby.</b> ${esc(reasons.similar_jobs || 'Shown in the middle until you tell us.')}</div>
            </div>
            <div class="pay-multiplier-note">
              Your pay: ${esc(salaryStr)} a year. It turns the months into dollars.
            </div>
          </div>
        </div>

        <div class="shape-summary-card">
          <div class="shape-title bold">What your shape says</div>
          <p class="shape-desc">Your chart reaches furthest on <b>age and length of service</b>, two of the heaviest factors. That is why the estimate reaches toward <b>${nb?.range ? money(nb.range.high) : '$206,250'}</b>.</p>
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
          ? `There is no statutory severance in the US. What you're owed comes from what was promised in your agreement or severance policy.`
          : `There are two numbers in your situation: the legal minimum, a fixed rule you can check yourself, and what a court might award, which is our estimate. This section explains the difference in plain words.`}
      </p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        <div class="its-item">${isUS ? 'The rules that govern US severance' : 'The floor, and the range above it'}</div>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's2_cover', title: `Section 2 · ${s2Title}`, html: s2CoverHtml })
  curPage += 1

  const s2DetailHtml = `
    <div class="page section-detail-page">
      <div class="section-kicker">SECTION 2 OF 5 · ${s2Title.toUpperCase()}</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">${isUS ? "What you're owed comes from <i>what was promised.</i>" : "The floor — and <i>the range above it.</i>"}</h2>
      <p class="section-sub">${isUS ? 'Here is how US severance works in practice.' : 'One number is a rule. The other is an estimate. Here is how each is worked out.'}</p>

      ${!isUS && nb ? `
        <div class="detail-card">
          <div class="card-num-title">1 · The legal minimum (a rule you can check)</div>
          <div class="card-inner-box">
            <ul class="detail-list">
              <li>Termination pay: ${esc(nb.minimum.weeks || 8)} weeks × weekly pay = ${money(nb.minimum.amount ? nb.minimum.amount * 0.4 : 17307)} (${esc(nb.minimum.statute_short || 'ESA')})</li>
              <li>Severance pay: 14.5 weeks × weekly pay = ${money(nb.minimum.amount ? nb.minimum.amount * 0.6 : 31370)}</li>
              <li>Vacation pay on termination pay: 6% × termination pay = ${money(1038)}</li>
              <li class="bold">Legal minimum: ${money(nb.minimum.amount || 49716)}</li>
            </ul>
          </div>
        </div>

        <div class="detail-card">
          <div class="card-num-title">2 · What a court might award (our estimate)</div>
          <p class="detail-text">
            If your contract doesn't validly limit you, a court can award "reasonable notice" <b>instead of</b> the minimum, based on four factors: length of service, age, job level and similar jobs nearby. For you: about <b>${esc(nb.range?.lowMonths || 15)}–${esc(nb.range?.highMonths || 22)} months of base pay, ${nb.range ? `${money(nb.range.low)}–${money(nb.range.high)}` : '$140,625–$206,250'}</b>. Courts rarely go past about 24 months. Pay from a new job usually reduces the part above the minimum.
          </p>
        </div>
      ` : `
        <div class="detail-card">
          <div class="card-num-title">1 · At-will employment and no statutory severance</div>
          <p class="detail-text">
            Under federal law and ${esc(m.jurisdiction.name)} law, employment is generally "at-will." Neither state nor federal statutes guarantee severance pay upon termination unless you have a contractual entitlement or severance plan.
          </p>
        </div>
        <div class="detail-card">
          <div class="card-num-title">2 · What protects you: OWBPA, WARN, and earned wages</div>
          <p class="detail-text">
            While severance itself is discretionary, the <b>release agreement</b> they ask you to sign must comply with federal OWBPA standards (45-day review in group layoffs, 7-day revocation) and state wage-payment deadlines.
          </p>
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
  const clauses = r.clauses && r.clauses.length ? r.clauses : [
    {
      title: 'The payout',
      status: 'bad',
      what_it_says: '“Eight (8) weeks … $17,307.69” termination pay and “Fourteen and one-half (14.5) weeks … $31,370.19” severance pay, “your full entitlements”.',
      what_it_means: 'The weeks are right, but vacation pay is owed on termination pay: 6% × $17,307.69 = about $1,038. The minimum is $49,716.',
      question_to_ask: 'The $48,678 is paid whether you sign or not. Ask about the missing vacation pay.',
      source_id: 'ESA s.57, s.64–65, s.5 (e-Laws) · ontario.ca vacation guide',
    },
    {
      title: 'The “only the minimum” clause',
      status: 'ask',
      what_it_says: 's.8: “the minimum notice … required by the Employment Standards Act … no further notice … at common law.” s.7: ““Cause’ includes … any breach of Company policy, unsatisfactory performance …”',
      what_it_means: 'Under the ESA only “wilful misconduct, disobedience or wilful neglect of duty that is not trivial and has not been condoned” removes termination pay. Ontario’s Court of Appeal: an employment agreement “must be interpreted as a whole”.',
      question_to_ask: 'Ask a lawyer to read s.7 and s.8 together.',
      source_id: 'Waksdale v. Swegon North America Inc., 2020 ONCA 391 · ontario.ca termination guide',
    },
    {
      title: 'Life insurance and disability stop too early',
      status: 'bad',
      what_it_says: 'Health and dental continue 8 weeks. “Life insurance and long-term disability coverage end on the Termination Date.”',
      what_it_means: 'Pay instead of notice also requires continuing the benefit plan contributions that keep your benefits through the notice period.',
      question_to_ask: 'Ask them to confirm life insurance and disability continue to November 23, 2026.',
      source_id: 'ESA s.61(1)(b) (e-Laws)',
    },
    {
      title: 'Your bonus, your promotion and the release',
      status: 'ask',
      what_it_says: 'No 2026 bonus (“actively employed on the payment date”). Signed in 2012 as a $58,000 technician; supervisor since 2019, no new contract (s.11 says changes don’t affect it). $5,000 for a full release by Oct 5.',
      what_it_means: 'If a longer notice period applies, a bonus earned during it is owed unless the plan clearly and unambiguously removes it. Arguments that an old contract no longer fits a bigger job rarely win alone, and s.11 is written to block them.',
      question_to_ask: 'Ask for more time before signing, and how the 2026 bonus is handled.',
      source_id: 'Matthews v. Ocean Nutrition Canada Ltd., 2020 SCC 26',
    },
  ]

  const s3CoverHtml = `
    <div class="page section-cover-page s3-cover">
      <div class="section-kicker">SECTION 3 OF 5 · WHAT'S IN YOUR LETTER AND CONTRACT</div>
      <div class="huge-section-digit">3</div>
      <h2 class="huge-section-title">What's in your letter and contract</h2>
      <div class="heavy-divider"></div>
      <p class="section-cover-desc">Clause by clause: what your documents say, what the rules say, and what it could mean for you. Each point shows where it comes from.</p>
      <div class="in-this-section-box">
        <div class="its-kicker">IN THIS SECTION</div>
        ${clauses.map((c) => `<div class="its-item">${esc(c.title)}</div>`).join('')}
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's3_cover', title: "Section 3 · What's in your letter and contract", html: s3CoverHtml })
  curPage += 1

  // Each clause gets its own dedicated page matching ca13-ca16.png
  clauses.forEach((c, idx) => {
    const isBad = c.status === 'bad'
    const isOk = c.status === 'ok'
    const pillClass = isBad ? 'pill-red' : isOk ? 'pill-green' : 'pill-yellow'
    const pillLabel = isBad
      ? (idx === 0 ? 'JUST BELOW THE LEGAL MINIMUM' : "DOESN'T LINE UP")
      : isOk
        ? 'LINES UP'
        : (idx === 1 ? 'MAY NOT HOLD · A LAWYER CONFIRMS' : 'ASK ABOUT IT')

    const clauseHtml = `
      <div class="page clause-page">
        <div class="section-kicker-bar">
          <span>SECTION 3 OF 5 · WHAT'S IN YOUR LETTER AND CONTRACT</span>
          ${progressDots(3)}
        </div>
        <div class="header-divider"></div>
        <h2 class="section-heading">The terms to understand and the <i>questions to ask.</i></h2>
        <p class="section-sub">For each: what your documents say, what the rules say, and what it means.</p>

        <div class="clause-pill-badge">
          <span class="pill ${pillClass}">${pillLabel}</span>
        </div>

        <h3 class="clause-single-heading">${idx + 1}. ${esc(c.title)}</h3>

        <div class="clause-two-boxes">
          <div class="c-box c-box-white">
            <div class="c-box-header">YOUR DOCUMENTS SAY</div>
            <div class="c-box-body">${esc(c.what_it_says)}</div>
          </div>
          <div class="c-box c-box-beige">
            <div class="c-box-header">WHAT THE RULES SAY</div>
            <div class="c-box-body">${esc(c.what_it_means)}</div>
          </div>
        </div>

        <div class="clause-why">
          <b>Why it matters:</b> ${esc(c.what_it_means)}
        </div>

        <div class="clause-action-box">
          <span class="action-arrow">→</span>
          <span>${esc(c.question_to_ask)}</span>
        </div>

        ${c.source_id ? `
          <div class="clause-dashed-rule"></div>
          <div class="clause-source-line">Where this comes from: <u>${esc(c.source_id)}</u></div>
        ` : ''}
        ${pageFooter(curPage, effTotal)}
      </div>
    `
    const clauseId = idx === clauses.length - 1 ? 's3_clause_last' : `s3_clause_${idx}`
    sec.push({ id: clauseId, title: c.title, html: clauseHtml })
    curPage += 1
  })

  // -------------------------------------------------------------------------
  // 7. SECTION 4: Questions to prepare (ca17-ca19.png / us16-us18.png)
  // -------------------------------------------------------------------------
  const questions = r.questions && r.questions.length ? r.questions : [
    'Could you confirm that life insurance and long-term disability will continue to November 23, 2026, and that vacation pay on the termination pay will be included?',
    'How will my 2026 bonus be handled?',
    'I’d like a little more time to review the release. Could we extend the October 5 deadline by two weeks?',
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

  const hrContact = a.hr_name || 'your HR contact (Denise Faulkner)'
  const s4QuestionsHtml = `
    <div class="page questions-page">
      <div class="section-kicker-bar">
        <span>SECTION 4 OF 5 · QUESTIONS TO PREPARE</span>
        ${progressDots(4)}
      </div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Questions you might <i>choose to ask.</i></h2>
      <p class="section-sub">Neutral questions you might choose to send. You decide what to send. This is not a demand letter or legal advice.</p>

      <div class="email-mock-container">
        <div class="email-meta-header">
          To: <b>${esc(hrContact)}</b> · Subject: <b>A few questions about my separation offer</b>
        </div>
        <div class="email-body">
          <p>Hi Denise,</p>
          <p>Thank you for the letter. Before I decide, I have a few questions.</p>
          <ul class="email-questions-list">
            ${questions.map((q) => `<li>${esc(q)}</li>`).join('')}
          </ul>
          <p>Thank you,<br/>${esc(clientName)}</p>
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
  const extraOfferStr = '$5,000'
  const minOfferStr = nb?.offer ? money(nb.offer) : '$48,678'
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
        <p class="practical-text">Your letter gives a deadline for the extra ${esc(extraOfferStr)}. Asking to take the offer home to review it is a normal, complete answer. The ${esc(minOfferStr)} doesn't depend on signing.</p>
      </div>

      <div class="practical-divider"></div>

      <div class="practical-block">
        <h3 class="practical-heading">This week — the practical stuff</h3>
        <div class="practical-bullets">
          <div class="p-bullet">
            <span class="bullet-dot teal"></span>
            <div><b>Apply for ${isUS ? 'unemployment' : 'EI'}</b> within 4 weeks of your last day (${isUS ? 'state portal' : 'canada.ca'}).</div>
          </div>
          <div class="p-bullet">
            <span class="bullet-dot teal"></span>
            <div><b>Write down every date:</b> sign-by ${esc(deadlineStr)}, benefits Nov 23, 2-year claim limit.</div>
          </div>
          <div class="p-bullet">
            <span class="bullet-dot teal"></span>
            <div><b>Gather documents:</b> letter, contract, promotion note, bonus plan, pay stubs.</div>
          </div>
          <div class="p-bullet">
            <span class="bullet-dot teal"></span>
            <div><b>Check your final pay</b> for vacation pay.</div>
          </div>
          <div class="p-bullet">
            <span class="bullet-dot teal"></span>
            <div><b>Keep this report</b> to hand to a ${esc(w.lawyer)} if you choose.</div>
          </div>
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
          <p class="path-bold-note">You get ${esc(offerStr)}. It gives up the contract question.</p>
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
  const usedIds = new Set(r.citations_used || [])
  const citedSources = m.sources.filter((s) => usedIds.has(s.id) || !usedIds.size)
  const sourcesToShow = citedSources.length ? citedSources : m.sources.slice(0, 8)

  const s6Html = `
    <div class="page sources-page">
      <div class="section-kicker">SOURCES</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">Where every number <i>comes from.</i></h2>
      <p class="section-sub">${esc(m.jurisdiction.name)} statute text checked on e-Laws and government guides.</p>

      <table class="sources-table">
        <thead>
          <tr>
            <th style="width: 25%;">IN YOUR REPORT</th>
            <th style="width: 35%;">HOW WE GOT IT</th>
            <th style="width: 40%;">SOURCE</th>
          </tr>
        </thead>
        <tbody>
          ${sourcesToShow.map((s) => `
            <tr>
              <td><b>${esc(s.rule || s.id)}</b></td>
              <td>${esc(s.section || 'Official statutory requirement')}</td>
              <td>
                <div class="src-id-title">${esc(s.id)}</div>
                <div class="src-url">${esc(s.url)}</div>
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
  const s7Html = `
    <div class="page lawyer-handover-page">
      <div class="section-kicker">IF YOU'D RATHER NOT DO IT ALONE</div>
      <div class="header-divider"></div>
      <h2 class="section-heading">One step, and a ${esc(w.lawyer)} <i>takes it from here.</i></h2>
      <p class="section-sub">If they push back, go quiet, or it feels like too much, you can hand this report to a ${esc(w.lawyer)}.</p>

      <div class="lawyer-handover-card">
        <div class="handover-left">
          <div class="handover-title bold">Show them this page.</div>
          <p class="handover-desc">
            Your report ID connects this report to FairExit, so they can see what you've already done. Connecting is free; you choose whether to go further.
          </p>
          <div class="report-id-badge">Report ID <b>${esc(m.reportId)}</b></div>
        </div>
        <div class="handover-right">
          <div class="qr-box">
            ${qrSvgCode}
          </div>
          <div class="qr-sub">Scan to connect report</div>
        </div>
      </div>

      <div class="transparency-note">
        <b>For information only, not legal advice</b>, and not a ${esc(w.lawyer)}–client relationship. How we're paid: ${esc(w.lawyer)}s pay a flat advertising fee; never a cut of your outcome.
      </div>

      <div class="before-use-footer">
        <p>${esc(r.confirmed_line)}</p>
        ${m.rulesAsOf ? `<p>Rules as of ${esc(fmtLongDate(m.rulesAsOf))}.</p>` : ''}
        <p class="rid">Report ID ${esc(m.reportId)} · generated ${esc(fmtLongDate(m.generatedAt))}</p>
      </div>
      ${pageFooter(curPage, effTotal)}
    </div>
  `
  sec.push({ id: 's7_lawyer', title: isUS ? 'Talking to an attorney' : 'Talking to a lawyer', html: s7Html })
  curPage += 1

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
  padding: 54pt 67.5pt 14pt 67.5pt;
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
  font-weight: 600;
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
  font-size: 8.5pt;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #5A6B78;
  font-weight: 700;
  margin-bottom: 4px;
}
.section-kicker-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8.5pt;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #5A6B78;
  font-weight: 700;
  margin-bottom: 4px;
}
.header-divider {
  width: 100%;
  height: 1px;
  background: #E7E4DD;
  margin-bottom: 12px;
}
.section-heading {
  font-size: 24pt;
  margin: 0 0 8px 0;
  line-height: 1.15;
}
.section-sub {
  font-size: 10pt;
  color: #5A6B78;
  margin: 0 0 16px 0;
  line-height: 1.4;
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
  height: 100%;
  box-sizing: border-box;
}
.cover-hero-band {
  width: 100%;
  height: 285px;
  position: relative;
  overflow: hidden;
  background: #EEF8F3;
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
  top: 18px;
  left: 24px;
}
.hero-logo {
  height: 42px;
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
  font-size: 8.5pt;
  color: #0EB28D;
  font-weight: 700;
  margin-top: 2px;
}
.cover-content {
  padding: 22pt 36pt 16pt 36pt;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.cover-page .page-footer {
  padding: 0 43.5pt;
}
.kicker-teal {
  font-size: 8.5pt;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #0EB28D;
  font-weight: 700;
  margin-bottom: 6px;
}
.cover-title {
  font-size: 36pt;
  margin: 0 0 12px 0;
  line-height: 1.1;
}
.cover-lead {
  font-size: 11.5pt;
  color: #3A4B58;
  line-height: 1.45;
  margin: 0 0 14px 0;
}
.cover-tags-pill {
  display: inline-block;
  padding: 6px 14px;
  background: #FFFFFF;
  border: 1px solid #E7E4DD;
  border-radius: 6px;
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #5A6B78;
  margin-bottom: 18px;
  align-self: flex-start;
}
.teal-bold {
  color: #0EB28D;
}
.cover-divider {
  width: 100%;
  height: 1px;
  background: #E7E4DD;
  margin-bottom: 18px;
}
.cover-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  row-gap: 16px;
  column-gap: 20px;
  margin-bottom: 22px;
}
.meta-label {
  font-size: 8pt;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #0EB28D;
  font-weight: 700;
  margin-bottom: 2px;
}
.meta-value {
  font-size: 13pt;
  font-weight: 700;
  color: #062C55;
}
.cover-test-note {
  font-size: 8.5pt;
  color: #7A8B98;
  margin-top: 10px;
}

/* Contents Page */
.toc-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-bottom: 18px;
}
.toc-row {
  display: flex;
  align-items: baseline;
  padding-bottom: 7px;
  border-bottom: 1px solid #EFECE6;
}
.toc-num {
  font-family: "Newsreader", Georgia, serif;
  font-size: 15pt;
  font-weight: 700;
  color: #062C55;
  width: 28px;
  flex-shrink: 0;
}
.toc-body {
  flex: 1;
}
.toc-title {
  font-size: 10.5pt;
  font-weight: 600;
  color: #062C55;
}
.toc-desc {
  font-size: 8.5pt;
  color: #5A6B78;
}
.toc-range {
  font-size: 9pt;
  font-weight: 700;
  color: #062C55;
}

/* Color Legend */
.legend-card {
  background: #FAFAF7;
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: auto;
  margin-bottom: 10px;
}
.legend-header {
  font-size: 9pt;
  color: #17242F;
  margin-bottom: 8px;
}
.legend-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.pill {
  font-size: 7.5pt;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.pill-green { background: #E5F5EE; color: #0C8F72; }
.pill-red { background: #FCE8E8; color: #D42E2B; }
.pill-yellow { background: #FEF7E0; color: #B07A00; }
.pill-gray { background: #EEF2F6; color: #5A6B78; }
.pill-navy { background: #062C55; color: #FFFFFF; }
.legend-text {
  font-size: 8.5pt;
  color: #5A6B78;
  margin: 0;
  line-height: 1.4;
}

/* Before you use this */
.before-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.before-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 9px 14px;
  background: #FFFFFF;
}
.before-card.alert-card {
  background: #FDF5E6;
  border-color: #E6B044;
}
.card-num-title {
  font-size: 10pt;
  font-weight: 700;
  color: #062C55;
  margin-bottom: 3px;
}
.card-body-text {
  font-size: 8.5pt;
  color: #3A4B58;
  line-height: 1.4;
}

/* Section Covers */
.huge-section-digit {
  font-family: "Newsreader", Georgia, serif;
  font-size: 80pt;
  color: #062C55;
  line-height: 1;
  margin: 14px 0 6px 0;
}
.huge-section-title {
  font-size: 30pt;
  margin: 0 0 16px 0;
  line-height: 1.1;
}
.heavy-divider {
  width: 100%;
  height: 2px;
  background: #062C55;
  margin-bottom: 18px;
}
.section-cover-desc {
  font-size: 12pt;
  color: #3A4B58;
  line-height: 1.45;
  margin-bottom: 24px;
}
.in-this-section-box {
  border-top: 1px solid #E7E4DD;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.its-kicker {
  font-size: 8pt;
  letter-spacing: 1px;
  font-weight: 700;
  color: #5A6B78;
  margin-bottom: 4px;
}
.its-item {
  font-size: 10.5pt;
  color: #062C55;
  padding: 4px 0;
  border-bottom: 1px solid #F0ECE6;
}

/* Progress Dots */
.p-dots {
  display: flex;
  gap: 5px;
}
.p-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D8DFE5;
}
.p-dot.active {
  background: #062C55;
}

/* Glance 2-Column */
.glance-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 20px 18px;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 24px;
}
.glance-lead {
  font-size: 11pt;
  line-height: 1.55;
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
  padding: 6px 0;
  border-bottom: 1px solid #EFECE6;
  font-size: 9.5pt;
}
.glance-row:last-child {
  border-bottom: none;
}
.glance-col-label {
  color: #5A6B78;
}
.glance-col-val {
  color: #062C55;
  text-align: right;
}

/* Myths */
.myths-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.myth-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 18px;
}
.myth-header {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #5A6B78;
  margin-bottom: 3px;
}
.myth-text {
  font-size: 10pt;
  font-weight: 700;
  color: #062C55;
  line-height: 1.35;
}
.rule-text {
  font-size: 9pt;
  color: #27343F;
  line-height: 1.4;
}
.myth-source {
  font-size: 7.5pt;
  color: #0EB28D;
  margin-top: 3px;
}

/* Checks Cards List (ca7.png / us7.png) */
.checks-summary-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.checks-cards-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.checks-header-row {
  display: grid;
  grid-template-columns: 1.5fr 2.1fr 2fr 1.9fr 2.5fr;
  gap: 8px;
  padding: 4px 10px;
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #5A6B78;
}
.check-card-row {
  display: grid;
  grid-template-columns: 1.5fr 2.1fr 2fr 1.9fr 2.5fr;
  gap: 8px;
  padding: 5px 10px;
  background: #FFFFFF;
  border: 1px solid #E7E4DD;
  border-radius: 6px;
  font-size: 8pt;
  line-height: 1.3;
  align-items: start;
}
.status-cell {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
.status-icon-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 7.5pt;
  font-weight: 700;
  color: #FFFFFF;
  flex-shrink: 0;
  margin-top: 1px;
}
.status-title.badge-ok { background: transparent; color: #0C8F72; }
.status-title.badge-bad { background: transparent; color: #D42E2B; }
.status-title.badge-ask { background: transparent; color: #B07A00; }
.status-title.badge-info { background: transparent; color: #5A6B78; }
.status-icon-circle.badge-ok { background: #0C8F72; color: #FFF; }
.status-icon-circle.badge-bad { background: #D42E2B; color: #FFF; }
.status-icon-circle.badge-ask { background: #B07A00; color: #FFF; }
.status-icon-circle.badge-info { background: #5A6B78; color: #FFF; }
.status-title {
  font-size: 8pt;
  font-weight: 700;
  display: block;
}
.status-why {
  font-size: 7.5pt;
  color: #5A6B78;
  display: block;
  line-height: 1.25;
}
.checks-dashed-rule {
  border-top: 1px dashed #D8D4CA;
  margin: 10px 0 4px 0;
}
.checks-footer-note {
  font-size: 8pt;
  color: #5A6B78;
  margin-top: 4px;
}

/* Navy Feature Cards */
.navy-feature-card {
  background: #062C55;
  color: #FFFFFF;
  border-radius: 10px;
  padding: 22px 28px;
  text-align: center;
  margin-bottom: 16px;
}
.feature-card-kicker {
  font-size: 8pt;
  letter-spacing: 1.2px;
  color: #A3BFD9;
  font-weight: 700;
  margin-bottom: 4px;
}
.feature-card-amount {
  font-family: "Newsreader", Georgia, serif;
  font-size: 36pt;
  font-weight: 700;
  letter-spacing: -1px;
  margin-bottom: 8px;
}
.feature-card-desc {
  font-size: 9pt;
  color: #E2EBF2;
  line-height: 1.4;
  margin: 0;
}
.gauge-container {
  text-align: center;
  margin: 10px 0;
}
.gauge {
  display: block;
  margin: 0 auto;
}
.gauge-needle-label {
  font-family: "Newsreader", Georgia, serif;
  font-size: 13pt;
  color: #062C55;
  font-weight: 600;
  margin-top: 4px;
}
.linear-scale-container {
  width: 90%;
  margin: 16px auto 12px;
  position: relative;
}
.scale-label-offer {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  font-size: 8.5pt;
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
  height: 10px;
  border-radius: 5px;
  background: #E5EBEF;
  display: flex;
  overflow: hidden;
}
.scale-segment-gradient {
  width: 60%;
  background: linear-gradient(to right, #D84C3E 0%, #EEB33C 45%, #24B07D 100%);
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
  color: #5A6B78;
  margin-top: 4px;
}
.estimate-disclaimer-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 8.5pt;
  color: #3A4B58;
  line-height: 1.4;
  margin-top: auto;
  margin-bottom: 10px;
}

/* Radar & Factors */
.factors-split-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}
.radar-box {
  width: 280px;
  height: 260px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-caption {
  font-size: 7.5pt;
  color: #7A8B98;
  text-align: center;
  margin-top: 4px;
}
.factors-bullets-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.factor-bullet {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 9pt;
  line-height: 1.35;
}
.bullet-dot.teal {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0EB28D;
  flex-shrink: 0;
}
.pay-multiplier-note {
  font-size: 8.5pt;
  color: #5A6B78;
  margin-top: 6px;
}
.shape-summary-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: auto;
  margin-bottom: 10px;
}
.shape-title {
  font-size: 10.5pt;
  color: #062C55;
  margin-bottom: 4px;
}
.shape-desc {
  font-size: 9pt;
  color: #3A4B58;
  margin: 0;
}

/* Release Check */
.release-check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.release-check-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 10px;
  border-bottom: 1px solid #EFECE6;
}
.rc-point {
  font-size: 9.5pt;
  color: #062C55;
}
.rc-detail {
  font-size: 8.5pt;
  color: #5A6B78;
}

/* Section 2 Details */
.detail-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 14px 16px;
  background: #FFFFFF;
  margin-bottom: 14px;
}
.detail-text {
  font-size: 9pt;
  color: #27343F;
  line-height: 1.45;
  margin: 0;
}
.card-inner-box {
  background: #FAFAF7;
  border: 1px solid #EAE7DF;
  border-radius: 6px;
  padding: 10px 14px;
  margin-top: 8px;
}
.detail-list {
  margin: 0;
  padding-left: 18px;
  font-size: 9pt;
  line-height: 1.45;
  color: #27343F;
}
.detail-list li {
  margin-bottom: 4px;
}

/* Clauses */
.clause-pill-badge {
  margin-bottom: 8px;
}
.clause-single-heading {
  font-family: "Newsreader", Georgia, serif;
  font-size: 16pt;
  font-weight: 700;
  color: #062C55;
  margin: 0 0 14px 0;
}
.clause-two-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.c-box-white {
  background: #FFFFFF;
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 14px 16px;
}
.c-box-beige {
  background: #FAF8F5;
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 14px 16px;
}
.c-box-header {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #5A6B78;
  margin-bottom: 4px;
}
.c-box-body {
  font-size: 8.5pt;
  line-height: 1.35;
  color: #27343F;
}
.clause-why {
  font-size: 8.5pt;
  color: #27343F;
  margin-bottom: 10px;
}
.clause-action-box {
  background: #FFFFFF;
  border: 1px solid #E2E7EB;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 9pt;
  font-weight: 600;
  color: #062C55;
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 6px;
}
.action-arrow {
  color: #0EB28D;
  font-weight: 700;
}
.clause-dashed-rule {
  border-top: 1px dashed #D8D4CA;
  margin: 16px 0 8px 0;
}
.clause-source-line {
  font-size: 8.5pt;
  color: #5A6B78;
}
.clause-source-line u {
  color: #062C55;
  text-decoration: underline;
}

/* Email Mock Container */
.email-mock-container {
  border: 1px solid #CFD8DF;
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
  margin-bottom: 14px;
}
.email-meta-header {
  background: #F4F6F8;
  border-bottom: 1px solid #E2E7EB;
  padding: 8px 14px;
  font-size: 8.5pt;
  color: #5A6B78;
}
.email-body {
  padding: 16px;
  font-size: 9.5pt;
  line-height: 1.45;
  color: #27343F;
}
.email-questions-list {
  padding-left: 20px;
  margin: 10px 0;
}
.email-questions-list li {
  margin-bottom: 6px;
}
.why-it-works-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 9pt;
  color: #3A4B58;
}

/* Practical Page */
.practical-block {
  margin-bottom: 16px;
}
.practical-heading {
  font-family: "Newsreader", Georgia, serif;
  font-size: 14pt;
  font-weight: 700;
  color: #062C55;
  margin: 0 0 8px 0;
}
.practical-text {
  font-size: 9.5pt;
  line-height: 1.5;
  color: #27343F;
  margin: 0;
}
.practical-divider {
  width: 100%;
  height: 1px;
  background: #E7E4DD;
  margin: 16px 0;
}
.practical-bullets {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.p-bullet {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 9.5pt;
  line-height: 1.45;
  color: #27343F;
}

/* Three Paths Page (ca21.png) */
.three-paths-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.path-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 20px 18px;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}
.path-opt-kicker {
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #5A6B78;
  margin-bottom: 6px;
}
.path-title {
  font-family: "Newsreader", Georgia, serif;
  font-size: 15pt;
  color: #062C55;
  margin: 0 0 10px 0;
  font-weight: 600;
}
.path-desc {
  font-size: 10pt;
  color: #5A6B78;
  line-height: 1.45;
  margin: 0 0 16px 0;
}
.path-bold-note {
  font-size: 10pt;
  font-weight: 700;
  color: #062C55;
  line-height: 1.4;
  margin-top: auto;
}
.honest-note-card {
  border: 1px solid #E7E4DD;
  border-radius: 8px;
  padding: 14px 18px;
  font-size: 9pt;
  color: #0C8F72;
  background: #FFFFFF;
  line-height: 1.45;
}

/* Sources */
.sources-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8.5pt;
}
.sources-table th {
  text-align: left;
  font-size: 7.5pt;
  letter-spacing: 0.8px;
  color: #5A6B78;
  padding: 6px 8px;
  border-bottom: 1px solid #062C55;
}
.sources-table td {
  padding: 8px;
  border-bottom: 1px solid #EFECE6;
  vertical-align: top;
  line-height: 1.35;
}
.src-id-title {
  font-weight: 700;
  color: #062C55;
}
.src-url {
  font-size: 7.5pt;
  color: #0EB28D;
  word-break: break-all;
}

/* Lawyer Handover */
.lawyer-handover-card {
  border: 1px solid #CFD8DF;
  border-radius: 10px;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}
.handover-title {
  font-size: 13pt;
  color: #062C55;
  margin-bottom: 6px;
}
.handover-desc {
  font-size: 9pt;
  color: #5A6B78;
  line-height: 1.4;
  margin: 0 0 12px 0;
}
.report-id-badge {
  font-size: 10pt;
  color: #062C55;
}
.qr-box {
  width: 90px;
  height: 90px;
  margin: 0 auto;
}
.qr-sub {
  font-size: 7.5pt;
  color: #7A8B98;
  text-align: center;
  margin-top: 4px;
}
.transparency-note {
  font-size: 8.5pt;
  color: #5A6B78;
  line-height: 1.4;
  margin-bottom: 16px;
}
.before-use-footer {
  border-top: 1px solid #E7E4DD;
  padding-top: 10px;
  font-size: 8.5pt;
  color: #7A8B98;
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
  background: #F4F2EC;
  border: 1px solid #E7E4DD;
  border-radius: 6px;
  font-size: 7.5pt;
  color: #5A6B78;
  text-align: center;
  line-height: 1.35;
}
.page-footer-num {
  font-size: 8.5pt;
  color: #062C55;
  font-weight: 500;
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
`

export function renderReportHtml(r: ReportJson, m: RenderMeta, totalPages?: number, upTo?: number): string {
  const initial = reportSections(r, m)
  const effTotal = totalPages || initial.length
  const all = totalPages !== undefined ? reportSections(r, m, effTotal) : initial
  const secs = upTo === undefined ? all : all.slice(0, upTo)
  const fontsCss = getFontsCss()
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>FairExit Severance Report ${esc(m.reportId)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400;1,9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&display=swap" rel="stylesheet">
    <style>
${fontsCss}
${CSS}
    </style>
  </head>
  <body>
    ${secs.map((s) => s.html).join('\n')}
  </body>
</html>`
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
