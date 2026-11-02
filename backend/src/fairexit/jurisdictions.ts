/**
 * Jurisdictions: builds the shared `jurisdiction` object that prompt v0.6 receives with every call.
 *
 *   jurisdiction : { country, code, name, regime, statute_short, has_statutory_severance, words }
 *
 * Covered (prompt v0.6, "SHARED INPUT"): CA-AB, CA-BC, CA-SK, CA-MB, CA-ON, CA-NB, CA-NS, CA-PE,
 * CA-NL, CA-FED and US-<any of the 50 states>. Quebec, the territories and anywhere outside the
 * US are not covered: the app never calls the prompts for them.
 */
import regionData from '../data/regions.json'

export type Country = 'CA' | 'US'
export type Regime = 'ca_province' | 'ca_federal' | 'us_state_page' | 'us_federal_only'

export interface JurisdictionWords {
  lawyer: 'lawyer' | 'attorney'
  region: 'province' | 'state'
  letter: 'severance letter' | 'separation agreement'
  contract: 'employment contract' | 'offer letter or employment contract'
}

export interface Jurisdiction {
  country: Country
  code: string
  name: string
  regime: Regime
  statute_short: string
  has_statutory_severance: boolean
  words: JurisdictionWords
}

export const CA_WORDS: JurisdictionWords = { lawyer: 'lawyer', region: 'province', letter: 'severance letter', contract: 'employment contract' }
export const US_WORDS: JurisdictionWords = { lawyer: 'attorney', region: 'state', letter: 'separation agreement', contract: 'offer letter or employment contract' }

/** Canada: province code (as the free check sends it) -> name + statute short name (from the region page kicker). */
export const CA_PROVINCES: Record<string, { name: string; statute_short: string }> = {
  AB: { name: 'Alberta', statute_short: 'Employment Standards Code' },
  BC: { name: 'British Columbia', statute_short: 'Employment Standards Act' },
  SK: { name: 'Saskatchewan', statute_short: 'The Saskatchewan Employment Act' },
  MB: { name: 'Manitoba', statute_short: 'Employment Standards Code' },
  ON: { name: 'Ontario', statute_short: 'Employment Standards Act' },
  NB: { name: 'New Brunswick', statute_short: 'Employment Standards Act' },
  NS: { name: 'Nova Scotia', statute_short: 'Labour Standards Code' },
  PE: { name: 'Prince Edward Island', statute_short: 'Employment Standards Act' },
  NL: { name: 'Newfoundland and Labrador', statute_short: 'Labour Standards Act' },
}
export const CA_FEDERAL = { code: 'CA-FED', name: 'federally regulated (Canada Labour Code)', statute_short: 'Canada Labour Code' }
/** Provinces/territories the free check shows as "not covered yet". */
export const CA_NOT_COVERED: Record<string, string> = { QC: 'Quebec', YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut' }

/** Canada: the engine adds a separate severance layer only for these (ON, FED). */
const CA_SEVERANCE_LAYER = new Set(['CA-ON', 'CA-FED'])

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}
const US_BY_NAME: Record<string, string> = Object.fromEntries(Object.entries(US_STATES).map(([k, v]) => [v.toLowerCase(), k]))

const REGIONS = (regionData as unknown as { regions: Record<string, { slug: string }> }).regions

/** True when FairExit has a checked region page (region_rules) for this code. */
export function hasRegionPage(code: string): boolean {
  return !!REGIONS[code]
}

export function regionSlug(code: string): string | null {
  return REGIONS[code]?.slug || null
}

/** Accepts "CA-ON", "ON" (with country CA), "US-GA", "GA", "Georgia". Returns a canonical code or null. */
export function normalizeCode(input: string, country?: Country): string | null {
  if (!input) return null
  const raw = String(input).trim()
  const up = raw.toUpperCase()
  if (/^(CA|US)-[A-Z]{2,3}$/.test(up)) return up
  if (country === 'CA' || (!country && (CA_PROVINCES[up] || CA_NOT_COVERED[up] || up === 'FED'))) {
    if (up === 'FED') return 'CA-FED'
    if (CA_PROVINCES[up] || CA_NOT_COVERED[up]) return 'CA-' + up
    const byName = Object.entries({ ...CA_PROVINCES, ...Object.fromEntries(Object.entries(CA_NOT_COVERED).map(([k, n]) => [k, { name: n }])) })
      .find(([, v]) => (v as { name: string }).name.toLowerCase() === raw.toLowerCase())
    return byName ? 'CA-' + byName[0] : null
  }
  if (US_STATES[up]) return 'US-' + up
  if (US_BY_NAME[raw.toLowerCase()]) return 'US-' + US_BY_NAME[raw.toLowerCase()]
  return null
}

export function isCovered(code: string | null | undefined): boolean {
  if (!code) return false
  if (code === 'CA-FED') return true
  if (code.startsWith('CA-')) return !!CA_PROVINCES[code.slice(3)]
  if (code.startsWith('US-')) return !!US_STATES[code.slice(3)]
  return false
}

/** The shared jurisdiction object, or null when the code is not covered. */
export function buildJurisdiction(code: string): Jurisdiction | null {
  if (!isCovered(code)) return null
  if (code === 'CA-FED') {
    return {
      country: 'CA', code, name: CA_FEDERAL.name, regime: 'ca_federal', statute_short: CA_FEDERAL.statute_short,
      has_statutory_severance: true, words: CA_WORDS,
    }
  }
  if (code.startsWith('CA-')) {
    const p = CA_PROVINCES[code.slice(3)]
    return {
      country: 'CA', code, name: p.name, regime: 'ca_province', statute_short: p.statute_short,
      has_statutory_severance: CA_SEVERANCE_LAYER.has(code), words: CA_WORDS,
    }
  }
  return {
    country: 'US', code, name: US_STATES[code.slice(3)], regime: hasRegionPage(code) ? 'us_state_page' : 'us_federal_only',
    statute_short: '', has_statutory_severance: false, words: US_WORDS,
  }
}

/**
 * Works out the jurisdiction code from the free-check answers.
 * Canada: federal "yes" -> CA-FED (Canada Labour Code table), else CA-<province>.
 * US: usState (full name or code).
 */
export function codeFromAnswers(country: Country, answers: Record<string, unknown>): string | null {
  if (country === 'CA') {
    if (String(answers.federal || '').toLowerCase() === 'yes') return 'CA-FED'
    return normalizeCode(String(answers.province || ''), 'CA')
  }
  return normalizeCode(String(answers.usState || answers.state || ''), 'US')
}

export function listJurisdictions(country?: Country) {
  const out: Array<Jurisdiction & { has_region_page: boolean; region_slug: string | null; covered: true }> = []
  if (!country || country === 'CA') {
    for (const k of Object.keys(CA_PROVINCES)) {
      const j = buildJurisdiction('CA-' + k)!
      out.push({ ...j, has_region_page: hasRegionPage(j.code), region_slug: regionSlug(j.code), covered: true })
    }
    const f = buildJurisdiction('CA-FED')!
    out.push({ ...f, has_region_page: hasRegionPage('CA-FED'), region_slug: regionSlug('CA-FED'), covered: true })
  }
  if (!country || country === 'US') {
    for (const k of Object.keys(US_STATES)) {
      const j = buildJurisdiction('US-' + k)!
      out.push({ ...j, has_region_page: hasRegionPage(j.code), region_slug: regionSlug(j.code), covered: true })
    }
  }
  return out
}
