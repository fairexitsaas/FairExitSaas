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

    // (b) Custom offer amount ($250,000), age 50, group layoff
    const metaB = createMeta({ age: 50, others: 'few', offer: 250000 }, 250000)
    const secB = reportSections(baseReport, metaB).find((s) => s.id === 's1_release')!
    expect(secB.html).not.toContain('<div class="feature-card-amount">$250,000</div>')
    expect(secB.html).toContain('<div class="feature-card-amount">45 days</div>')

    // (c) Age under 40 (age 28) with no statutory OWBPA period
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
})

