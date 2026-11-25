import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as CP from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { renderReportHtml } from '../../src/fairexit/reportOutput'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import { sourcesFor } from '../../src/fairexit/regionData'
import { mockCallA, mockCallB } from '../../src/fairexit/mocks'
import {
  InlineMismatchPrompt,
  findMismatches,
  type Rows,
} from '../../../src/components/report/mismatch-row'
import { InlineOfferConflictBanner } from '../../../src/components/report/InlineOfferConflictBanner'
import {
  findUnresolvedMismatches,
  applySingleMismatchChoice,
} from '../../../src/lib/confirmation-mismatch'

const rootDir = path.resolve(__dirname, '../../..')

function makeNyHtml(clauseCount = 5, extraSources = 0) {
  const j = buildJurisdiction('US-NY')!
  const callA = mockCallA(j, true)
  const answers = { usState: 'New York', state: 'New York', age: 54, years: 9, salary: 175000, offer: 20192 }
  const check_state: any = {
    rows: {
      employee_name: { value: 'Dana Kowalczyk', status: 'confirmed' },
      years: { value: 9, status: 'confirmed' },
      offer_amount: { value: 20192, status: 'confirmed' },
      age: { value: 54, status: 'confirmed' },
      pay: { value: 175000, status: 'confirmed' },
    },
    attested: true,
  }
  const c: any = { id: 'layout-ny', country: 'US', jurisdiction: j, jurisdiction_code: 'US-NY', contract_status: 'added', answers, call_a: callA, check_state }
  const ctx: CP.CheckCtx = { country: 'US', answers, callA, contractStatus: 'added', check: check_state }
  const { input } = buildCallBInput(c, ctx)
  const allSources = sourcesFor(j)
  const extra = Array.from({ length: extraSources }, (_, i) => ({
    ...allSources[i % allSources.length],
    id: `EXT-${i + 1}`,
    rule: `${allSources[i % allSources.length].rule} (Supplemental ${i + 1})`,
  }))
  const usedSources = [...allSources, ...extra]
  const report: any = mockCallB(input)
  report.clauses = Array.from({ length: clauseCount }, (_, i) => ({
    title: `Clause ${i + 1}`,
    status: i % 2 === 0 ? 'bad' : 'ask',
    what_it_says: `Section ${i + 1}: Sample contractual provision text for testing dynamic pagination.`,
    what_it_means: `Explanation for clause ${i + 1} preserving full copy and vertical readability.`,
    question_to_ask: `Question to ask regarding clause ${i + 1}?`,
    source_id: usedSources[0]?.id,
  }))
  report.citations_used = usedSources.map((s) => s.id)
  report.sources_used = usedSources.map((s) => ({ id: s.id, short_name: s.rule }))
  return renderReportHtml(report, {
    reportId: 'RPT-TEST1',
    generatedAt: '2026-11-25T10:00:00Z',
    rulesAsOf: '2026-11-24',
    jurisdiction: j,
    sources: usedSources,
    input,
  })
}

describe('PDF Section 3 & Sources print pagination rules', () => {
  it('defines @page flow-page with 60pt top and 78pt bottom margin clear of Chromium footer', () => {
    const html = makeNyHtml(5, 0)
    expect(html).toContain('@page flow-page {\n  size: letter;\n  margin: 60pt 67.5pt 78pt 67.5pt;\n}')
    expect(html).toContain('.page.clauses-flow,\n  .page.sources-page {\n    page: flow-page;')
    expect(html).toContain('display: block !important;')
    expect(html).toContain('overflow: visible !important;')
    expect(html).toContain('.page-footer { display: none !important; }')
  })

  it('wraps Section 3 clauses in a repeating-header table with non-splitting clause rows', () => {
    const html = makeNyHtml(7, 0)
    expect(html).toContain('<table class="clauses-flow-table">')
    expect(html).toContain('.clauses-flow-table thead {\n  display: table-header-group;\n}')
    expect(html).toContain('.clauses-heading-row {\n  break-inside: avoid;\n  page-break-inside: avoid;\n  break-after: avoid;\n  page-break-after: avoid;\n}')
    expect(html).toContain('.clause-row {\n  break-inside: avoid;\n  page-break-inside: avoid;\n}')
    const clauseRows = html.match(/<tr class="clause-row">/g) || []
    expect(clauseRows.length).toBe(7)
    for (let i = 1; i <= 7; i++) {
      expect(html).toContain(`${i}. Clause ${i}`)
    }
  })

  it('keeps Sources table header repeating across pages and rows unbreakable', () => {
    const html = makeNyHtml(5, 8)
    expect(html).toContain('<table class="sources-table">')
    expect(html).toContain('.sources-table thead { display: table-header-group; }')
    expect(html).toContain('.sources-table tr { break-inside: avoid; page-break-inside: avoid; }')
    expect(html).toContain('IN YOUR REPORT')
    expect(html).toContain('HOW WE GOT IT')
    expect(html).toContain('SOURCE')
    expect(html).toContain('Supplemental 8')
  })
})

describe('Inline confirmation panels (Offer Amount, Age, Monthly/Annual Pay)', () => {
  it('renders InlineOfferConflictBanner inline (no modal overlay) matching second-look checklist UI', () => {
    const markup = renderToStaticMarkup(
      React.createElement(InlineOfferConflictBanner, {
        docSourceText: 'Your letter, paragraph 2, says:',
        docDisplay: '$24,000',
        docQuote: 'a lump sum of $24,000, less required deductions.',
        keepDisplay: '$26,000',
        onUseDocument: () => {},
        onKeepCurrent: () => {},
        onAddClearerCopy: () => {},
      })
    )
    expect(markup).not.toContain('role="dialog"')
    expect(markup).not.toContain('fixed inset-0')
    expect(markup).toContain('We looked again.')
    expect(markup).toContain('Your letter, paragraph 2, says:')
    expect(markup).toContain('$24,000')
    expect(markup).toContain('a lump sum of $24,000, less required deductions.')
    expect(markup).toContain('Use $24,000')
    expect(markup).toContain('Keep $26,000')
    expect(markup).toContain('Add a clearer copy')
  })

  it('renders client-provided MismatchRow UI inline for Age and Yearly Pay without modals', () => {
    const rows: Rows = {
      age: {
        value: 50,
        user_value: 50,
        doc_value: 54,
        source: 'letter',
        quote: 'age 54',
        where: 'paragraph 3',
      },
      annual_pay: {
        value: 120000,
        user_value: 120000,
        doc_value: 175000,
        source: 'letter',
        quote: 'annual salary of $175,000',
        where: 'paragraph 1',
      },
    }
    const allMismatches = findMismatches(rows)
    const ageMismatch = allMismatches.find((m) => m.key === 'age')!
    const payMismatch = allMismatches.find((m) => m.key === 'annual_pay')!

    const ageMarkup = renderToStaticMarkup(
      React.createElement(InlineMismatchPrompt, {
        mismatch: ageMismatch,
        onConfirm: () => {},
      })
    )
    expect(ageMarkup).not.toContain('fixed inset-0')
    expect(ageMarkup).toContain('class="fx-mm-inline"')
    expect(ageMarkup).toContain('Your age: which is right?')
    expect(ageMarkup).toContain('What you told us')
    expect(ageMarkup).toContain('>50<')
    expect(ageMarkup).toContain('What your letter says')
    expect(ageMarkup).toContain('>54<')
    expect(ageMarkup).toMatch(/<button[^>]*class="fx-mm-continue"[^>]*disabled=""/)

    const payMarkup = renderToStaticMarkup(
      React.createElement(InlineMismatchPrompt, {
        mismatch: payMismatch,
        onConfirm: () => {},
      })
    )
    expect(payMarkup).not.toContain('fixed inset-0')
    expect(payMarkup).toContain('class="fx-mm-inline"')
    expect(payMarkup).toContain('Your yearly pay: which is right?')
    expect(payMarkup).toContain('$120,000')
    expect(payMarkup).toContain('$175,000')
    expect(payMarkup).toMatch(/<button[^>]*class="fx-mm-continue"[^>]*disabled=""/)
  })

  it('resolving Age or Pay independently leaves other active mismatches intact', () => {
    const rows: Rows = {
      age: { value: 50, user_value: 50, doc_value: 54, source: 'agreement' },
      annual_pay: { value: 120000, user_value: 120000, doc_value: 175000, source: 'agreement' },
    }
    const initialUnresolved = findUnresolvedMismatches(rows, findMismatches(rows))
    expect(initialUnresolved.map((m) => m.key)).toEqual(['age', 'annual_pay'])

    // Resolving age alone must keep annual_pay unresolved
    const afterAge = applySingleMismatchChoice(rows, 'age', 'doc')
    expect(afterAge.age.status).toBe('confirmed_from_document')
    expect(afterAge.age.value).toBe(54)
    const remainingAfterAge = findUnresolvedMismatches(afterAge, findMismatches(afterAge))
    expect(remainingAfterAge.map((m) => m.key)).toEqual(['annual_pay'])

    // Then resolving annual_pay completes mismatches cleanly
    const afterPay = applySingleMismatchChoice(afterAge, 'annual_pay', 'user')
    expect(afterPay.annual_pay.status).toBe('confirmed_by_user')
    expect(afterPay.annual_pay.value).toBe(120000)
    expect(findUnresolvedMismatches(afterPay, findMismatches(afterPay))).toEqual([])
  })

  it('removes ConfirmationCardModal and keeps Offer, Age, and Pay confirmations inline in US, CA, and ReportFlow', () => {
    const modalPath = path.join(rootDir, 'src/components/report/ConfirmationCardModal.tsx')
    expect(fs.existsSync(modalPath)).toBe(false)

    const usSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/us/USReviewPage.tsx'), 'utf8')
    const caSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx'), 'utf8')
    const flowSrc = fs.readFileSync(path.join(rootDir, 'src/app/report/ReportFlow.tsx'), 'utf8')
    const mmCss = fs.readFileSync(path.join(rootDir, 'src/components/report/mismatch-row.css'), 'utf8')

    for (const src of [usSrc, caSrc, flowSrc]) {
      expect(src).not.toContain('ConfirmationCardModal')
      expect(src).not.toContain('OfferAmountConfirmationCard')
      expect(src).not.toContain('needsMismatchStep')
      expect(src).toContain('InlineMismatchPrompt')
    }

    for (const src of [usSrc, caSrc]) {
      expect(src).toContain('hasOfferConflict && (')
      expect(src).toContain('<InlineOfferConflictBanner')
      expect(src).toContain('handleResolveSingleMismatch')
      expect(src).toContain('offerResolvedLocallyRef')
      expect(src).toContain('resolvedMismatchKeysRef')
      expect(src).not.toContain("action: 'conflict_choice'")
    }

    // Mobile responsive layout rules present in mismatch-row.css
    expect(mmCss).toContain('.fx-mm-inline')
    expect(mmCss).toContain('@media (max-width: 560px) { .fx-mm__tiles { grid-template-columns: 1fr; } }')
    expect(mmCss).toContain('overflow-wrap: anywhere')
  })
})
