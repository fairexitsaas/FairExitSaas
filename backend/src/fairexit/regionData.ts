/**
 * Region facts and sources for Call B (prompt v0.6 inputs `region_rules` and `sources`).
 * Data comes from src/data/regions.json, generated from the client's region pages by
 * scripts/build-region-data.js. Nothing here is written from memory.
 */
import regionData from '../data/regions.json'
import type { Jurisdiction } from './jurisdictions'

export interface RegionRule {
  id: string
  topic: string
  fact: string
  source_id: string | null
  status: 'confirmed' | 'unconfirmed'
  reason?: string
  how_to_check?: string
}

export interface SourceRow {
  id: string
  rule: string
  section: string
  url: string
  status: 'verified' | 'unverified'
  checked: string
  checked_note?: string
}

interface RegionFile {
  generated_at: string
  pack: string
  today: string
  regions: Record<string, { code: string; slug: string; name: string; kicker: string; region_rules: RegionRule[]; sources: SourceRow[] }>
  country_sources: Record<'CA' | 'US', SourceRow[]>
}

const DATA = regionData as unknown as RegionFile

export const REGION_DATA_META = { generated_at: DATA.generated_at, pack: DATA.pack, rules_checked: DATA.today }

/** region_rules: empty for us_federal_only (prompt v0.6). */
export function regionRulesFor(j: Jurisdiction): RegionRule[] {
  if (j.regime === 'us_federal_only') return []
  return (DATA.regions[j.code]?.region_rules || []).map((r) => ({ ...r }))
}

/** sources: this jurisdiction's rows plus the country-wide rows, ONLY status "verified". */
export function sourcesFor(j: Jurisdiction): SourceRow[] {
  const own = j.regime === 'us_federal_only' ? [] : DATA.regions[j.code]?.sources || []
  const country = DATA.country_sources[j.country] || []
  return [...own, ...country].filter((s) => s.status === 'verified').map((s) => ({ ...s }))
}

/** H6: "Rules as of [sources' latest checked date]." */
export function latestCheckedDate(sources: SourceRow[]): string | null {
  const ds = sources.map((s) => s.checked).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  return ds.length ? ds[ds.length - 1] : null
}

export function regionPage(code: string) {
  const r = DATA.regions[code]
  if (!r) return null
  return { code: r.code, slug: r.slug, name: r.name, kicker: r.kicker, region_rules: r.region_rules, sources: r.sources }
}
