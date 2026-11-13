import { describe, expect, it } from 'vitest'
import { reportSections, renderReportHtml, ReportJson, RenderMeta } from '../../src/fairexit/reportOutput'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'

describe('US Release Check - Key Number and Consideration Period', () => {
  const usJurisdiction = buildJurisdiction('US-NY')!
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

  const createMeta = (answers: Record<string, any>, offer: number = 12500): RenderMeta => ({
    reportId: 'RPT-US-TEST',
    jurisdiction: usJurisdiction,
    sources: mockSources,
    rulesAsOf: '2026-10-01',
    attestedAt: '2026-10-15T12:00:00Z',
    generatedAt: '2026-10-15T12:05:00Z',
    answers,
    numbers: {
      country: 'US',
      minimum: { amount: null, weeks: null, none: true },
      range: null,
      offer,
      gauge: null,
      factorValues: { service: '6 years' },
    },
  })

  it('1. Individual termination displays 21 days when applicable (age >= 40, individual termination)', () => {
    const meta = createMeta({
      age: 45,
      others: 'me',
      layoffType: 'individual',
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

    // Must NOT display "21 or 45 days"
    expect(html).not.toContain('21 or 45 days')
    // Must NOT display offer amount as key number
    expect(html).not.toContain('<div class="feature-card-amount">$12,500</div>')
  })

  it('2. Group termination displays 45 days when applicable (age >= 40, group layoff / exit incentive)', () => {
    const meta = createMeta({
      age: 52,
      others: '50',
      ended: 'mass',
      offer: 12500,
    })

    const groupReport: ReportJson = {
      ...baseReport,
      release_check: [
        {
          status: 'bad',
          point: '45 days to consider (group layoff)',
          detail: 'Under the Older Workers Benefit Protection Act (OWBPA), group reductions in force involving employees 40 years of age or older require at least 45 days to consider.',
          source_id: 'SRC-1',
        },
        {
          status: 'ok',
          point: '7 days to revoke',
          detail: 'Your agreement correctly gives you 7 days after signing to revoke.',
          source_id: 'SRC-1',
        },
      ],
    }

    const sections = reportSections(groupReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')
    expect(releaseSec).toBeDefined()
    const html = releaseSec!.html

    // Must display "45 days" as the key number
    expect(html).toContain('<div class="feature-card-kicker">YOUR KEY NUMBER</div>')
    expect(html).toContain('<div class="feature-card-amount">45 days</div>')
    expect(html).toContain('The time federal rules give you to consider a release in a group layoff at your age')

    // Must NOT display "21 or 45 days"
    expect(html).not.toContain('21 or 45 days')
    // Must NOT display offer amount as key number
    expect(html).not.toContain('<div class="feature-card-amount">$12,500</div>')
  })

  it('3. The offer amount never appears as the key number in this section', () => {
    // Test multiple scenarios where offer amount could have previously leaked as key number:
    // (a) No deadline specified, age 45, individual
    const metaA = createMeta({ age: 45, offer: 12500 })
    const secA = reportSections(baseReport, metaA).find((s) => s.id === 's1_release')!
    expect(secA.html).not.toContain('<div class="feature-card-amount">$12,500</div>')
    expect(secA.html).toContain('<div class="feature-card-amount">21 days</div>')

    // (b) Custom offer amount ($250,000), age 50, ordinary group layoff (others: 'few' without qualifying program)
    const metaB = createMeta({ age: 50, others: 'few', offer: 250000 }, 250000)
    const secB = reportSections(baseReport, metaB).find((s) => s.id === 's1_release')!
    expect(secB.html).not.toContain('<div class="feature-card-amount">$250,000</div>')
    // Ordinary group layoff does NOT assume 45 days; individual termination rules apply (21 days)
    expect(secB.html).toContain('<div class="feature-card-amount">21 days</div>')

    // (b2) Custom offer amount ($250,000), age 50, qualifying exit incentive / group termination program
    const metaB2 = createMeta({ age: 50, others: 'few', exit_incentive: true, offer: 250000 }, 250000)
    const secB2 = reportSections(baseReport, metaB2).find((s) => s.id === 's1_release')!
    expect(secB2.html).not.toContain('<div class="feature-card-amount">$250,000</div>')
    expect(secB2.html).toContain('<div class="feature-card-amount">45 days</div>')

    // (c) Age under 40 (age 28) with no statutory OWBPA period and no agreement deadline
    const metaC = createMeta({ age: 28, others: 'me', offer: 15000 }, 15000)
    const simpleRcReport: ReportJson = {
      ...baseReport,
      release_check: [
        { status: 'info', point: 'Release scope', detail: 'General waiver of employment claims.', source_id: 'SRC-1' },
      ],
    }
    const secC = reportSections(simpleRcReport, metaC).find((s) => s.id === 's1_release')!
    // Must NEVER show offer amount as key number
    expect(secC.html).not.toContain('<div class="feature-card-amount">$15,000</div>')
    expect(secC.html).not.toContain('YOUR KEY NUMBER')
  })

  it('4. Existing payment sections still display the correct offer amount', () => {
    const meta = createMeta({
      age: 48,
      others: 'me',
      offer: 12500,
    })

    const sections = reportSections(baseReport, meta)

    // Check Section 4.1 "Your offer, at a glance" (s1_glance)
    const glanceSec = sections.find((s) => s.id === 's1_glance')
    expect(glanceSec).toBeDefined()
    expect(glanceSec!.html).toContain('<span class="glance-col-label">They offered</span>')
    expect(glanceSec!.html).toContain('<span class="glance-col-val bold">$12,500</span>')
    expect(glanceSec!.html).toContain('<b>$12,500</b>')

    // Check checks section (s1_checks)
    const checksSec = sections.find((s) => s.id === 's1_checks')
    expect(checksSec).toBeDefined()
    expect(checksSec!.html).toContain('$12,500')

    // Check complete HTML render
    const fullHtml = renderReportHtml(baseReport, meta)
    expect(fullHtml).toContain('<span class="glance-col-val bold">$12,500</span>')
    // In full HTML, verify release check card has 21 days and not $12,500
    expect(fullHtml).toContain('<div class="feature-card-amount">21 days</div>')
    expect(fullHtml).not.toContain('<div class="feature-card-amount">$12,500</div>')
  })

  it('5. Revocation period of 7 days is displayed separately from consideration period', () => {
    const meta = createMeta({
      age: 42,
      others: 'me',
      offer: 10000,
    })

    const sections = reportSections(baseReport, meta)
    const releaseSec = sections.find((s) => s.id === 's1_release')!
    const html = releaseSec.html

    // Consideration period is the primary key number
    expect(html).toContain('<div class="feature-card-amount">21 days</div>')

    // 7-day revocation period is rendered in its own dedicated panel/badge
    expect(html).toContain('class="revocation-panel"')
    expect(html).toContain('REVOCATION PERIOD')
    expect(html).toContain('7 days after signing')
    expect(html).toContain('7 calendar days after you sign')
    expect(html).toContain('separate from the consideration period')
  })

  it('6. Does not assume every group layoff qualifies for 45 days (requires qualifying program)', () => {
    // Ordinary layoff where others were let go (e.g. 5 people), but no exit incentive or group program
    const ordinaryGroupMeta = createMeta({
      age: 46,
      others: 'few',
      ended: 'layoff',
      offer: 20000,
    })

    const secOrdinary = reportSections(baseReport, ordinaryGroupMeta).find((s) => s.id === 's1_release')!
    // Must NOT assume 45 days without a qualifying group termination program
    expect(secOrdinary.html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(secOrdinary.html).not.toContain('<div class="feature-card-amount">45 days</div>')

    // Qualifying group program with demographic disclosure (Exhibit A / age list)
    const qualifyingGroupMeta = createMeta({
      age: 46,
      others: 'few',
      list: 'Provided',
      offer: 20000,
    })

    const secQualifying = reportSections(baseReport, qualifyingGroupMeta).find((s) => s.id === 's1_release')!
    expect(secQualifying.html).toContain('<div class="feature-card-amount">45 days</div>')
    expect(secQualifying.html).toContain('qualifying group termination or exit incentive program')
  })

  it('7. Handles under 40 and missing age appropriately without guessing unsupported statutory periods', () => {
    // (a) Under 40 (age 32) with no document deadline
    const under40MetaNoDeadline = createMeta({ age: 32, others: 'me' })
    const simpleReport: ReportJson = {
      ...baseReport,
      release_check: [
        { status: 'info', point: 'Release scope', detail: 'General waiver of employment claims.', source_id: 'SRC-1' },
      ],
    }
    const secUnder40NoDeadline = reportSections(simpleReport, under40MetaNoDeadline).find((s) => s.id === 's1_release')!
    expect(secUnder40NoDeadline.html).not.toContain('YOUR KEY NUMBER')
    expect(secUnder40NoDeadline.html).not.toContain('21 days')
    expect(secUnder40NoDeadline.html).not.toContain('45 days')
    expect(secUnder40NoDeadline.html).not.toContain('revocation-panel')

    // (b) Under 40 (age 32) with a contractual deadline in document (14 days)
    const under40MetaWithDeadline = createMeta({ age: 32, others: 'me', days_to_decide: 14 })
    const secUnder40WithDeadline = reportSections(simpleReport, under40MetaWithDeadline).find((s) => s.id === 's1_release')!
    expect(secUnder40WithDeadline.html).toContain('AGREEMENT DEADLINE')
    expect(secUnder40WithDeadline.html).toContain('<div class="feature-card-amount">14 days</div>')
    expect(secUnder40WithDeadline.html).toContain('Because you are under 40, statutory consideration periods under federal OWBPA rules do not apply')
    // No statutory 7-day ADEA revocation for under 40
    expect(secUnder40WithDeadline.html).not.toContain('revocation-panel')

    // (c) Missing age with no document deadline
    const missingAgeMetaNoDeadline = createMeta({ others: 'me' })
    const secMissingAgeNoDeadline = reportSections(simpleReport, missingAgeMetaNoDeadline).find((s) => s.id === 's1_release')!
    expect(secMissingAgeNoDeadline.html).not.toContain('YOUR KEY NUMBER')
    expect(secMissingAgeNoDeadline.html).not.toContain('21 days')
    expect(secMissingAgeNoDeadline.html).not.toContain('45 days')

    // (d) Missing age with document deadline (21 days)
    const missingAgeMetaWithDeadline = createMeta({ others: 'me', days_to_decide: 21 })
    const secMissingAgeWithDeadline = reportSections(simpleReport, missingAgeMetaWithDeadline).find((s) => s.id === 's1_release')!
    expect(secMissingAgeWithDeadline.html).toContain('AGREEMENT DEADLINE')
    expect(secMissingAgeWithDeadline.html).toContain('<div class="feature-card-amount">21 days</div>')
    expect(secMissingAgeWithDeadline.html).toContain('Federal statutory consideration periods (21 days for individual terminations or 45 days for group programs) apply if you are age 40 or older')
  })
})

