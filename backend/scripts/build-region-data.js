/* eslint-disable */
/**
 * FairExit · build-region-data.js
 *
 * Exports the verified facts and sources from the client's region pages
 * (resource-hub-v2/provinces/<name>.js and resource-hub-us/states/<name>.js in the code pack)
 * into backend/src/data/regions.json. Call B uses this file as `region_rules` and `sources`
 * (prompt v0.6: "Only facts from our checked pages; no law from memory").
 *
 * Run again whenever the client sends a new code pack:
 *   node scripts/build-region-data.js ../FairExit-Phase1-Code-2026-10-25
 */
const fs = require('fs')
const path = require('path')

const packDir = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'FairExit-Phase1-Code-2026-10-25'))
const hubCA = path.join(packDir, 'resource-hub-v2')
const hubUS = path.join(packDir, 'resource-hub-us')
if (!fs.existsSync(hubCA) || !fs.existsSync(hubUS)) {
  console.error('Code pack not found at ' + packDir)
  process.exit(1)
}

const T = require(path.join(hubCA, 'region-page-lib.js'))
const noop = () => ''
const H = {
  T, TODAY: readToday(), R: { estimate: () => ({ statutory: {}, weekly: 0 }), rules: {} },
  EX: { salary: 78000, years: 7, label: '' }, engineFloor: () => ({ st: {}, weekly: 0 }),
  money: (n) => '$' + Math.round(n).toLocaleString('en-US'), CHECK: T.CHECK,
  tenureRows: noop, examples: noop,
}

function readToday() {
  const src = fs.readFileSync(path.join(hubUS, 'build-states.js'), 'utf8')
  const m = src.match(/const TODAY = "([0-9-]+)"/)
  return m ? m[1] : new Date().toISOString().slice(0, 10)
}

function plain(html) {
  return String(html || '')
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<span class="chk">\(check\)<\/span>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim()
}
function supRefs(html) {
  const out = []
  const re = /<sup[^>]*>(.*?)<\/sup>/gi
  let m
  while ((m = re.exec(String(html || '')))) {
    plain(m[1]).split(/[,\s]+/).forEach((n) => { if (/^\d+$/.test(n)) out.push(+n) })
  }
  return out
}

// US country-wide sources (federal rules) cited on the US free check (resource-hub-us/demo-v3.html).
const US_FEDERAL_SOURCES = [
  { id: 'US-FED-S1', rule: 'U.S. Department of Labor', section: 'WARN Act (Worker Adjustment and Retraining Notification)', url: 'https://www.dol.gov/agencies/eta/layoffs/warn', status: 'verified', checked: H.TODAY },
  { id: 'US-FED-S2', rule: 'U.S. Equal Employment Opportunity Commission', section: 'Q&A: Understanding waivers of discrimination claims in employee severance agreements (OWBPA, age 40+)', url: 'https://www.eeoc.gov/laws/guidance/qa-understanding-waivers-discrimination-claims-employee-severance-agreements', status: 'verified', checked: H.TODAY },
  { id: 'US-FED-S3', rule: '29 U.S.C. § 626(f)', section: 'Older Workers Benefit Protection Act: knowing and voluntary waiver (21/45 days to consider, 7 days to revoke, advice to consult an attorney, ages and job titles for group programs)', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title29-section626', status: 'verified', checked: H.TODAY },
]

function exportRegion(file) {
  const j = require(file)(H)
  const code = j.code
  const sources = (j.sources || []).map((s, i) => ({
    id: `${code}-S${i + 1}`,
    rule: s.name,
    section: s.section,
    url: s.url,
    status: s.tier === 1 ? 'verified' : 'unverified',
    checked: String(s.checked || H.TODAY).slice(0, 10),
    checked_note: String(s.checked || '').length > 10 ? String(s.checked).slice(10).trim() : undefined,
  }))
  const sid = (n) => (n && sources[n - 1] ? sources[n - 1].id : null)
  const rules = []
  ;(j.facts || []).forEach((f, i) => {
    rules.push({ id: `${code}-F${i + 1}`, topic: plain(f[0]), fact: plain(f[1]), source_id: sid(f[2]), status: 'confirmed' })
  })
  ;(j.different || []).forEach((d, i) => {
    rules.push({ id: `${code}-D${i + 1}`, topic: plain(d[0]), fact: plain(d[1]), source_id: sid(d[2]), status: 'confirmed' })
  })
  ;(j.deadlines || []).forEach((d, i) => {
    const refs = supRefs(d)
    rules.push({ id: `${code}-L${i + 1}`, topic: 'Deadline', fact: plain(d), source_id: sid(refs[0]), status: 'confirmed' })
  })
  ;(j.unconfirmed || []).forEach((u, i) => {
    rules.push({ id: `${code}-U${i + 1}`, topic: plain(u[0]), fact: plain(u[0]), source_id: null, status: 'unconfirmed', reason: plain(u[1]), how_to_check: plain(u[2]) })
  })
  return { code, slug: j.slug, name: j.short, kicker: plain(j.kicker), region_rules: rules, sources }
}

const out = { generated_at: new Date().toISOString(), pack: path.basename(packDir), today: H.TODAY, regions: {}, country_sources: { US: US_FEDERAL_SOURCES, CA: [] } }
for (const [dir, label] of [[path.join(hubCA, 'provinces'), 'CA'], [path.join(hubUS, 'states'), 'US']]) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
    const r = exportRegion(path.join(dir, f))
    out.regions[r.code] = r
    console.log(`${label} ${r.code.padEnd(7)} ${String(r.region_rules.length).padStart(3)} rules ${String(r.sources.length).padStart(2)} sources`)
  }
}
const dest = path.join(__dirname, '..', 'src', 'data', 'regions.json')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, JSON.stringify(out, null, 2))
console.log('wrote ' + dest + ' (' + Object.keys(out.regions).length + ' regions)')
