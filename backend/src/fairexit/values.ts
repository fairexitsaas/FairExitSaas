/**
 * Turns Call A's written values ("a lump sum of $24,000", "8 weeks", "October 31, 2026",
 * "fourteen (14) days") into typed values the check page can confirm, and formats them back
 * for display. Never invents a number: if parsing fails the raw text is kept.
 */

export type ValueType = 'money' | 'date' | 'weeks' | 'days' | 'number' | 'choice' | 'text'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function parseMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v ?? '')
  const m = s.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand)?/i) || s.match(/\b([0-9][0-9,]{2,}(?:\.[0-9]+)?)\s*(k)?\b/i)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function firstNumber(s: string): number | null {
  const paren = s.match(/\((\d+(?:\.\d+)?)\)/) // "fourteen (14) days"
  if (paren) return parseFloat(paren[1])
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

export function parseWeeks(v: unknown): number | null {
  if (typeof v === 'number') return v
  const s = String(v ?? '').toLowerCase()
  if (!s.trim()) return null
  if (/^(none|no|zero|0)\b/.test(s.trim())) return 0
  const n = firstNumber(s)
  if (n == null) return null
  if (/month/.test(s) && !/week/.test(s)) return Math.round(n * 4.33 * 10) / 10
  if (/day/.test(s) && !/week/.test(s)) return Math.round((n / 7) * 10) / 10
  return n
}

export function parseDays(v: unknown): number | null {
  if (typeof v === 'number') return v
  const s = String(v ?? '').toLowerCase()
  if (!s.trim()) return null
  if (/^(none|same day|no notice|zero)\b/.test(s.trim())) return 0
  const n = firstNumber(s)
  if (n == null) return null
  if (/week/.test(s) && !/day/.test(s)) return n * 7
  if (/month/.test(s) && !/day/.test(s)) return Math.round(n * 30)
  return n
}

/** ISO yyyy-mm-dd, or null. Accepts "October 31, 2026", "Oct 31 2026", "31 October 2026", "2026-10-31", "10/31/2026". */
export function parseDate(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())
    if (mi >= 0) return iso(+m[3], mi + 1, +m[2])
  }
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/)
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
    if (mi >= 0) return iso(+m[3], mi + 1, +m[1])
  }
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return iso(+m[3], +m[1], +m[2])
  return null
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function yearsBetween(fromIso: string, toIso?: string | null): number {
  const a = new Date(fromIso + 'T12:00:00Z').getTime()
  const b = toIso ? new Date(toIso + 'T12:00:00Z').getTime() : Date.now()
  return (b - a) / (365.25 * 864e5)
}

export function fmtMoney(n: unknown, country: 'CA' | 'US' = 'CA'): string {
  const v = typeof n === 'number' ? n : parseMoney(n)
  if (v == null) return String(n ?? '')
  return '$' + Math.round(v).toLocaleString(country === 'US' ? 'en-US' : 'en-CA')
}

export function fmtDate(isoDate: unknown): string {
  const s = String(isoDate ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function fmtLongDate(isoLike: unknown): string {
  const s = String(isoLike ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(isoLike ?? '')
  const d = new Date(s + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function isPlaceholderValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v !== 'string') return false
  const s = v.trim().toLowerCase()
  return (
    s === '' ||
    s === '—' ||
    s === '-' ||
    s === 'not answered' ||
    s === 'not in your documents yet' ||
    s === 'not in your documents' ||
    s === 'not in your agreement' ||
    s === 'not in your contract' ||
    s === 'not mentioned' ||
    s === 'not specified' ||
    s === 'not added' ||
    s === 'null' ||
    s === 'undefined'
  )
}

