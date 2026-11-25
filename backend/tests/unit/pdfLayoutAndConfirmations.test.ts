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
import { MismatchStep, type Rows } from '../../../src/components/report/mismatch-row'
import {
  ConfirmationCardModal,
  OfferAmountConfirmationCard,
} from '../../../src/components/report/ConfirmationCardModal'

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

describe('Confirmation centered cards & independent Offer Amount confirmation', () => {
  it('renders ConfirmationCardModal as a centered responsive card over visible page background', () => {
    const mmRows: Rows = {
      age: { value: 50, user_value: 50, doc_value: 54, source: 'agreement', quote: 'age 54', where: 'p. 2' },
    }
    const markup = renderToStaticMarkup(
      React.createElement(
        ConfirmationCardModal,
        { ariaLabel: 'Confirm your details', kicker: 'CHECK THIS FIRST' },
        React.createElement(MismatchStep, { rows: mmRows, onDone: () => {} })
      )
    )
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6')
    expect(markup).toContain('max-w-[540px]')
    expect(markup).toContain('p-5 sm:p-7')
    expect(markup).toContain('Your age: which is right?')
  })

  it('renders OfferAmountConfirmationCard with both amounts, quote, custom option, and centered card shell', () => {
    const markup = renderToStaticMarkup(
      React.createElement(OfferAmountConfirmationCard, {
        docLabel: 'Your agreement says',
        conflictLead: 'Your agreement and your answers give different amounts. Which is right?',
        docDisplay: '$20,192',
        docQuote: 'twenty thousand one hundred ninety-two dollars',
        docWhere: 'Section 2',
        intakeDisplay: '$15,000',
        selectedChoice: null,
        showCustom: false,
        onShowCustom: () => {},
        customVal: '',
        onCustomValChange: () => {},
        onChoose: () => {},
      })
    )
    expect(markup).toContain('aria-label="Confirm money offered"')
    expect(markup).toContain('max-w-[540px]')
    expect(markup).toContain('Money offered')
    expect(markup).toContain('$20,192')
    expect(markup).toContain('$15,000')
    expect(markup).toContain('Your agreement says')
    expect(markup).toContain('You told us')
    expect(markup).toContain('Use this')
    expect(markup).toContain('Something else')
  })

  it('keeps underlying Review page rendered (not full-screen replaced) and separates Mismatch vs Offer cards in both US and CA', () => {
    const usSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/us/USReviewPage.tsx'), 'utf8')
    const caSrc = fs.readFileSync(path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx'), 'utf8')
    const flowSrc = fs.readFileSync(path.join(rootDir, 'src/app/report/ReportFlow.tsx'), 'utf8')

    // Neither review page replaces the full review body with needsMismatchStep anymore
    expect(usSrc).not.toContain(') : needsMismatchStep ? (')
    expect(caSrc).not.toContain(') : needsMismatchStep ? (')

    // Both US & CA render centered MismatchStep AND restored centered OfferAmountConfirmationCard sequentially without duplication
    for (const src of [usSrc, caSrc]) {
      expect(src).toContain('{reviewLoaded && needsMismatchStep && (')
      expect(src).toContain('{reviewLoaded && !needsMismatchStep && offerConflictChoice === null && hasOfferConflict && (')
      expect(src).toContain('<OfferAmountConfirmationCard')
      expect(src).toContain('resolveConflict(activeCaseId, \'offer_amount\'')
      expect(src).toContain('offerResolvedLocallyRef')
      expect(src).not.toContain("action: 'conflict_choice'")
    }

    // ReportFlow Step 3 also uses centered ConfirmationCardModal for MismatchStep
    expect(flowSrc).toContain('<ConfirmationCardModal ariaLabel="Confirm your details"')
  })
})
