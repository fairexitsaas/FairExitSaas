/**
 * PDF renderer (Notes for Phase 1, item 6).
 * Each section starts on a clean page, items never split across pages, and the contents list is
 * built from the sections that came back with their REAL page numbers. Page numbers are found
 * with a layout pass: section i starts on (pages of cover + contents + sections 0..i-1) + 1.
 *
 * Uses Playwright (Chromium). It is an optional dependency: `npm i playwright && npx playwright
 * install chromium` on the server. Without it, GET /report/pdf answers 501 and clients can use
 * GET /report/html (print-ready) instead.
 */
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { renderReportHtml, reportSections, ReportJson, RenderMeta } from '../fairexit/reportOutput'

type Browser = { newPage: () => Promise<any>; close: () => Promise<void> }
let browserPromise: Promise<Browser> | null = null

async function browser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      let pw: any
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        pw = require('playwright')
      } catch {
        browserPromise = null
        throw new ApiError(501, 'PDF rendering is not installed on this server (npm i playwright). Use /report/html instead.')
      }
      return pw.chromium.launch()
    })()
  }
  return browserPromise
}

function countPages(pdf: Buffer): number {
  const m = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)
  return m ? m.length : 0
}

async function printPdf(html: string, footer: string): Promise<Buffer> {
  const b = await browser()
  const page = await b.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    const buf: Buffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-size:8px;color:#5a6b78;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial"><span>${footer}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    })
    return buf
  } finally {
    await page.close()
  }
}

export async function renderReportPdf(report: ReportJson, meta: RenderMeta): Promise<Buffer> {
  const footer = `FairExit Severance Report · ${meta.reportId} · Information, not legal advice`
  const sections = reportSections(report, meta)
  const pages: Record<string, number> = {}
  // layout pass: cover + contents (+ sections before i) -> start page of section i
  for (let i = 0; i < sections.length; i++) {
    const pdf = await printPdf(renderReportHtml(report, { ...meta, pages: placeholderPages(sections.map((s) => s.id)) }, i), footer)
    pages[sections[i].id] = countPages(pdf) + 1
  }
  logger.info('Report PDF layout', { reportId: meta.reportId, pages })
  return printPdf(renderReportHtml(report, { ...meta, pages }), footer)
}

/** Same-width placeholders so the contents page has the same height in the layout pass. */
function placeholderPages(ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, 88]))
}
