import { describe, expect, it } from 'vitest'
import { reportSections, renderReportHtml, ReportJson, RenderMeta } from '../../src/fairexit/reportOutput'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'

describe('US Release Check - Key Number and Consideration Period', () => {
  const usJurisdiction = buildJurisdiction('US-NY')!
  const caJurisdiction = buildJurisdiction('CA-ON')!

  const mockSources = [
    { id: 'SRC-1', rule: 'EEOC OWBPA Q&A', section: 'Consideration period', url: 'https://example.com/owbpa', status: 'verified' as const, checked: '2026-10-01' },
    { id: 'SRC-2', rule: 'NY Labor Law', section: 'Wage Notice', url: 'https://example.com/nylaw', status: 'verified' as const, checked: '2026-10-01' },
  ]

  const baseReport: ReportJson = {
    cover: {
      name_line: 'Jane Doe',
      role_line: 'Software Engineer · 6 years',
      place_line: 'New York',
    },
    glance: 'Your employer offered you $12,500 in exchange for signing a general release of claims.',
    confirmed_line: 'Built on the details you confirmed on October 15, 2026.',
    checks: [
      {
        topic: 'Money offered',
        letter_says: '$12,500',
        contract_says: 'None',
        rule_says: 'US law sets no legal minimum severance',
        status: 'info',
        why: 'Severance in the US is discretionary unless contracted.',
        source_id: 'SRC-1',
        from_answers: false,
      },
    ],
    release_check: [
      {
        status: 'bad',
        point: 'Time to consider',
        detail: 'Under federal OWBPA rules, employees 40 and older must receive at least 21 days for an individual termination.',
        source_id: 'SRC-1',
      },
      {
        status: 'ok',
        point: 'Revocation period',
        detail: 'Agreement provides 7 days to revoke after signing.',
        source_id: 'SRC-1',
      },
    ],
    myths: [],
    clauses: [],
    questions: ['Can the company confirm final payment date in writing?'],
    next_steps: ['Review the release terms before signing.'],
    citations_used: ['SRC-1'],
  }

  const createMeta = (answers: Record<string, any>, offer: number = 12500, jurisdiction = usJurisdiction): RenderMeta => ({
    reportId: 'RPT-US-TEST',
    jurisdiction,
    sources: mockSources,
    rulesAsOf: '2026-10-01',
    attestedAt: '2026-10-15T12:00:00Z',
    generatedAt: '2026-10-15T12:05:00Z',
    answers,
    numbers: {
      country: jurisdiction.country as 'CA' | 'US',
      minimum: { amount: null, weeks: null, none: true },
      range: null,
      offer,
      gauge: null,
      factorValues: { service: '6 years' },
    },
  })

  // 1. Age 45, individual termination, confirmed ADEA waiver -> 21 days and separate 7-day revocation
  it('1. Age 45, individual termination, confirmed ADEA waiver -> 21 days and separate 7-day revocation', () => {
    const meta = createMeta({
      age: 45,
      others: 'me',
      layoffType: 'individual',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')
    expect(releaseSec).toBeDefined()
    const html = releaseSec!.html

    // Must display "21 days" as the key number
    expect(html).toContain('<div class="feature-card-kicker">YOUR KEY NUMBER</div>')
    expect(html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).toContain('The time federal rules give you to consider a release at your age (21 days for an individual termination)')

    // 7-day revocation period is rendered in its own dedicated panel/badge
    expect(html).toContain('class="revocation-panel"')
    expect(html).toContain('REVOCATION PERIOD')
    expect(html).toContain('7 days after signing')
    expect(html).toContain('7 calendar days after you sign')
    expect(html).toContain('separate from the consideration period')

    // Must NOT display "21 or 45 days"
    expect(html).not.toContain('21 or 45 days')
    // Must NOT display offer amount as key number
    expect(html).not.toContain('<div class="feature-card-amount">$12,500</div>')
  })

  // 2. Age 45, ordinary layoff of a few employees -> 21 days
  it('2. Age 45, ordinary layoff of a few employees -> 21 days', () => {
    const meta = createMeta({
      age: 45,
      others: 'few',
      ended: 'layoff',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).toContain('<div class="feature-card-kicker">YOUR KEY NUMBER</div>')
    expect(html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
    expect(html).toContain('class="revocation-panel"')
  })

  // 3. Age 45, qualifying group termination program with verified required disclosures -> 45 days and separate 7-day revocation
  it('3. Age 45, qualifying group termination program with verified required disclosures -> 45 days and separate 7-day revocation', () => {
    const meta = createMeta({
      age: 45,
      others: 'few',
      group_program: true,
      disclosures_verified: true,
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).toContain('<div class="feature-card-kicker">YOUR KEY NUMBER</div>')
    expect(html).toContain('<div class="feature-card-amount">45 days</div>')
    expect(html).toContain('qualifying group termination or exit incentive program')
    expect(html).toContain('class="revocation-panel"')
    expect(html).toContain('7 days after signing')
  })

  // 4. Age 45, list: 'Provided' alone -> must not trigger 45 days
  it('4. Age 45, list: "Provided" alone -> must not trigger 45 days', () => {
    const meta = createMeta({
      age: 45,
      others: 'few',
      list: 'Provided',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
  })

  // 5. Age 45, Exhibit A mentioned in report text alone -> must not trigger 45 days
  it('5. Age 45, Exhibit A mentioned in report text alone -> must not trigger 45 days', () => {
    const reportWithExhibitA: ReportJson = {
      ...baseReport,
      glance: 'Your employer provided an Exhibit A referencing employee demographic disclosures.',
      checks: [
        {
          topic: 'Exhibit A',
          letter_says: 'Exhibit A attached',
          contract_says: 'None',
          rule_says: 'Disclosure schedule',
          status: 'info',
          why: 'Exhibit A demographic disclosure schedule was provided.',
          source_id: 'SRC-1',
          from_answers: false,
        },
      ],
    }

    const meta = createMeta({
      age: 45,
      others: 'few',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(reportWithExhibitA, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
  })

  // 6. Age 45, generated release-check text mentioning 45 days alone -> must not trigger 45 days
  it('6. Age 45, generated release-check text mentioning 45 days alone -> must not trigger 45 days', () => {
    const reportWith45Check: ReportJson = {
      ...baseReport,
      release_check: [
        {
          status: 'bad',
          point: '45 days to consider',
          detail: 'Under OWBPA rules, group layoffs require 45 days to consider.',
          source_id: 'SRC-1',
        },
      ],
    }

    const meta = createMeta({
      age: 45,
      others: 'few',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(reportWith45Check, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    // Circular release_check text must not trigger 45 days; falls back to 21 days
    expect(html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
  })

  // Clean report for non-OWBPA tests where release_check does not contain OWBPA-specific detail text
  const reportWithoutOwbpa: ReportJson = {
    ...baseReport,
    release_check: [
      {
        status: 'info',
        point: 'General release',
        detail: 'Agreement contains a release of claims.',
        source_id: 'SRC-1',
      },
    ],
  }

  // 7. Age 45, general release present but ADEA waiver not established -> must not assert OWBPA periods
  it('7. Age 45, general release present but ADEA waiver not established -> must not assert OWBPA periods', () => {
    const meta = createMeta({
      age: 45,
      release: 'yes',
      others: 'me',
      offer: 12500,
    })

    const sections = reportSections(reportWithoutOwbpa, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    // When ADEA waiver is not established, do not assert OWBPA statutory periods or 7-day revocation
    expect(html).not.toContain('YOUR KEY NUMBER')
    expect(html).not.toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
    expect(html).not.toContain('21 days')
    expect(html).not.toContain('45 days')
    expect(html).not.toContain('revocation-panel')
  })

  // 8. Age 35, release present -> no OWBPA statutory period or 7-day revocation panel
  it('8. Age 35, release present -> no OWBPA statutory period or 7-day revocation panel', () => {
    const meta = createMeta({
      age: 35,
      release: 'yes',
      others: 'me',
      adea_waiver: true,
      offer: 12500,
    })

    const sections = reportSections(reportWithoutOwbpa, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).not.toContain('YOUR KEY NUMBER')
    expect(html).not.toContain('<div class="feature-card-amount">21 days</div>')
    expect(html).not.toContain('<div class="feature-card-amount">45 days</div>')
    expect(html).not.toContain('21 days')
    expect(html).not.toContain('45 days')
    expect(html).not.toContain('revocation-panel')
  })

  // 9. Unknown or ambiguous age -> no guessed statutory period
  it('9. Unknown or ambiguous age -> no guessed statutory period', () => {
    // (a) Ambiguous text "under 40"
    const metaUnder40Text = createMeta({
      age: 'under 40',
      release: 'yes',
      others: 'me',
      adea_waiver: true,
      offer: 12500,
    })
    const secUnder40 = reportSections(reportWithoutOwbpa, metaUnder40Text).find((s) => s.id === 's1_release')!
    expect(secUnder40.html).not.toContain('YOUR KEY NUMBER')
    expect(secUnder40.html).not.toContain('<div class="feature-card-amount">21 days</div>')
    expect(secUnder40.html).not.toContain('21 days')
    expect(secUnder40.html).not.toContain('45 days')
    expect(secUnder40.html).not.toContain('revocation-panel')

    // (b) Text "unknown"
    const metaUnknown = createMeta({
      age: 'unknown',
      release: 'yes',
      others: 'me',
      adea_waiver: true,
      offer: 12500,
    })
    const secUnknown = reportSections(reportWithoutOwbpa, metaUnknown).find((s) => s.id === 's1_release')!
    expect(secUnknown.html).not.toContain('YOUR KEY NUMBER')
    expect(secUnknown.html).not.toContain('<div class="feature-card-amount">21 days</div>')
    expect(secUnknown.html).not.toContain('21 days')
    expect(secUnknown.html).not.toContain('45 days')
    expect(secUnknown.html).not.toContain('revocation-panel')

    // (c) Omitted age
    const metaMissing = createMeta({
      release: 'yes',
      others: 'me',
      adea_waiver: true,
      offer: 12500,
    })
    const secMissing = reportSections(reportWithoutOwbpa, metaMissing).find((s) => s.id === 's1_release')!
    expect(secMissing.html).not.toContain('YOUR KEY NUMBER')
    expect(secMissing.html).not.toContain('<div class="feature-card-amount">21 days</div>')
    expect(secMissing.html).not.toContain('21 days')
    expect(secMissing.html).not.toContain('45 days')
    expect(secMissing.html).not.toContain('revocation-panel')
  })

  // 10. Agreement explicitly specifies 14 days -> show 14 days as AGREEMENT DEADLINE when supported by the agreement
  it('10. Agreement explicitly specifies 14 days -> show 14 days as AGREEMENT DEADLINE when supported by the agreement', () => {
    // Under-40 employee whose agreement specifies 14 days
    const meta = createMeta({
      age: 35,
      days_to_decide: 14,
      release: 'yes',
      others: 'me',
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    expect(html).toContain('<div class="feature-card-kicker">AGREEMENT DEADLINE</div>')
    expect(html).toContain('<div class="feature-card-amount">14 days</div>')
    expect(html).toContain('The review deadline specified in your agreement. Because you are under 40, statutory consideration periods under federal OWBPA rules do not apply')
    // No statutory 7-day ADEA revocation for under 40 or purely contractual deadlines
    expect(html).not.toContain('revocation-panel')
  })

  // 11. Missing or incomplete group-program disclosures -> must not trigger 45 days
  it('11. Missing or incomplete group-program disclosures -> must not trigger 45 days', () => {
    // Group program indicated, but disclosures marked incomplete
    const metaIncomplete = createMeta({
      age: 45,
      others: 'few',
      group_program: true,
      disclosures_verified: false,
      adea_waiver: true,
      offer: 12500,
    })

    const secIncomplete = reportSections(baseReport, metaIncomplete).find((s) => s.id === 's1_release')!
    expect(secIncomplete.html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(secIncomplete.html).not.toContain('<div class="feature-card-amount">45 days</div>')

    // Group program indicated, but owbpa_disclosures explicitly 'incomplete'
    const metaExplicitIncomplete = createMeta({
      age: 45,
      others: 'few',
      group_program: true,
      owbpa_disclosures: 'incomplete',
      adea_waiver: true,
      offer: 12500,
    })

    const secExplicit = reportSections(baseReport, metaExplicitIncomplete).find((s) => s.id === 's1_release')!
    expect(secExplicit.html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(secExplicit.html).not.toContain('<div class="feature-card-amount">45 days</div>')
  })

  // 12. Offer amounts must never appear as the key number
  it('12. Offer amounts must never appear as the key number', () => {
    // (a) Age 45 with offer $12,500
    const metaA = createMeta({ age: 45, adea_waiver: true, offer: 12500 })
    const secA = reportSections(baseReport, metaA).find((s) => s.id === 's1_release')!
    expect(secA.html).not.toContain('<div class="feature-card-amount">$12,500</div>')
    expect(secA.html).toContain('<div class="feature-card-amount">21 days</div>')

    // (b) Custom offer amount ($250,000), qualifying group program
    const metaB = createMeta(
      { age: 50, others: 'few', group_program: true, disclosures_verified: true, adea_waiver: true, offer: 250000 },
      250000
    )
    const secB = reportSections(baseReport, metaB).find((s) => s.id === 's1_release')!
    expect(secB.html).not.toContain('<div class="feature-card-amount">$250,000</div>')
    expect(secB.html).toContain('<div class="feature-card-amount">45 days</div>')

    // (c) Payment sections still display the correct offer amount
    const glanceSec = reportSections(baseReport, metaA).find((s) => s.id === 's1_glance')!
    expect(glanceSec.html).toContain('<span class="glance-col-val bold">$12,500</span>')

    // (d) Complete HTML render
    const fullHtml = renderReportHtml(baseReport, metaA)
    expect(fullHtml).toContain('<span class="glance-col-val bold">$12,500</span>')
    expect(fullHtml).toContain('<div class="feature-card-amount">21 days</div>')
    expect(fullHtml).not.toContain('<div class="feature-card-amount">$12,500</div>')
  })

  // 13. Canadian reports must remain unchanged
  it('13. Canadian reports must remain unchanged', () => {
    const caReport: ReportJson = {
      cover: {
        name_line: 'Alex Tremblay',
        role_line: 'Operations Lead · 10 years',
        place_line: 'Ontario',
      },
      glance: 'Your employer offered you $40,000 in exchange for signing a release.',
      confirmed_line: 'Built on the details you confirmed on October 15, 2026.',
      checks: [
        {
          topic: 'Notice you already worked',
          letter_says: 'None',
          contract_says: 'None',
          rule_says: 'Statutory minimum',
          status: 'ok',
          why: 'Notice calculation verified.',
          source_id: 'SRC-1',
          from_answers: false,
        },
      ],
      factors: {
        service: 0.8,
        age: 0.7,
        job_level: 0.6,
        similar_jobs: 0.5,
        reasons: {
          service: '10 years of service is substantial',
          age: 'Age 50 is a significant factor',
          job_level: 'Management role',
          similar_jobs: 'Moderate availability',
        },
      },
      myths: [],
      clauses: [],
      questions: ['Ask about vacation pay payout.'],
      next_steps: ['Do not sign before reviewing.'],
      citations_used: ['SRC-1'],
    }

    const caMeta = createMeta(
      {
        province: 'ON',
        age: 50,
        years: 10,
        salary: 100000,
        offer: 40000,
      },
      40000,
      caJurisdiction
    )

    const sections = reportSections(caReport, caMeta)

    // Canadian reports have factors section, NEVER a release_check section
    const releaseSec = sections.find((s) => s.id === 's1_release')
    expect(releaseSec).toBeUndefined()

    const factorsSec = sections.find((s) => s.id === 's1_factors')
    expect(factorsSec).toBeDefined()
    expect(factorsSec!.html).toContain('What lifts your <i>range.</i>')
    expect(factorsSec!.html).not.toContain('YOUR KEY NUMBER')
    expect(factorsSec!.html).not.toContain('OWBPA')
    expect(factorsSec!.html).not.toContain('revocation-panel')
  })
})
