/**
 * PDF renderer for FairExit Severance Reports.
 * Recreates the exact multi-page visual design, margins, page breaks, and footers
 * matching the Canada and US reference templates.
 *
 * Uses Playwright (Chromium).
 */
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { renderReportHtml, reportSections, ReportJson, RenderMeta } from '../fairexit/reportOutput'

type Browser = { newPage: () => Promise<any>; close: () => Promise<void> }
type PdfLogContext = { caseId?: string; reportId?: string; generationId?: string; requestId?: string }
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
      return pw.chromium.launch({ headless: true })
    })()
  }
  return browserPromise
}

async function printPdf(html: string, context: PdfLogContext, startedAt: number): Promise<Buffer> {
  const b = await browser()
  const page = await b.newPage()
  try {
    page.setDefaultTimeout(90000) // 90s max for PDF operations
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    try {
      await page.evaluateHandle('document.fonts.ready')
    } catch { /* proceed if fonts offline */ }
    const buf: Buffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-size:8.5px;color:#5a6b78;width:100%;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
      margin: {
        top: '10mm',
        bottom: '14mm',
        left: '14mm',
        right: '14mm',
      },
    })
    logger.info('[PDF][COMPLETE]', { ...context, durationMs: Date.now() - startedAt, bytes: buf.length })
    return buf
  } catch (err) {
    logger.error('[PDF][ERROR]', { ...context, durationMs: Date.now() - startedAt, message: (err as Error).message })
    throw err
  } finally {
    await page.close()
  }
}

export async function renderReportPdf(report: ReportJson, meta: RenderMeta, context: PdfLogContext = {}): Promise<Buffer> {
  const startedAt = Date.now()
  logger.info('[PDF][START]', { ...context, reportId: context.reportId || meta.reportId })
  const layoutStartedAt = Date.now()
  const sections = reportSections(report, meta)
  const pages: Record<string, number> = {}
  let cur = 1
  for (const s of sections) {
    pages[s.id] = cur
    cur += 1
  }
  logger.info('[PDF][LAYOUT_COMPLETE]', { ...context, reportId: meta.reportId, pages, durationMs: Date.now() - layoutStartedAt })
  return printPdf(renderReportHtml(report, { ...meta, pages }), { ...context, reportId: meta.reportId }, startedAt)
}
