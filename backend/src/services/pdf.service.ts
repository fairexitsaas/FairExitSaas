/**
 * PDF renderer for FairExit Severance Reports.
 * Recreates the exact multi-page visual design, margins, page breaks, and footers
 * matching the Canada and US reference templates.
 *
 * Order: Browserless REST (/pdf, plain HTTPS) -> a browser from ./pdfBrowser
 * (remote WebSocket, @sparticuz/chromium on Vercel, Playwright locally).
 */
import { logger } from '../utils/logger'
import { renderReportHtml, reportSections, ReportJson, RenderMeta } from '../fairexit/reportOutput'
import { getPdfBrowser, releasePdfBrowser } from './pdfBrowser'

type PdfLogContext = { caseId?: string; reportId?: string; generationId?: string; requestId?: string }

/** One set of print options, used by every renderer so the PDF looks the same everywhere. */
const PDF_OPTIONS = {
  format: 'Letter',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
}

/**
 * Browserless REST endpoint (https://<host>/pdf?token=...). A plain HTTPS call: no Puppeteer, no Chromium,
 * nothing to bundle. Set PDF_BROWSERLESS_URL, or it is derived from PDF_BROWSER_WS_ENDPOINT
 * (wss://production-sfo.browserless.io?token=X -> https://production-sfo.browserless.io/pdf?token=X).
 */
function browserlessPdfUrl(): string | null {
  const explicit = process.env.PDF_BROWSERLESS_URL
  if (explicit) return explicit
  const ws = process.env.PDF_BROWSER_WS_ENDPOINT
  if (!ws || !/browserless\.io/i.test(ws)) return null
  try {
    const u = new URL(ws.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:'))
    const token = u.searchParams.get('token')
    if (!token) return null
    return `${u.protocol}//${u.host}/pdf?token=${encodeURIComponent(token)}&timeout=90000`
  } catch {
    return null
  }
}

/**
 * Browserless /pdf. The report is ~1 MB of HTML (images inlined) plus Google Fonts.
 * "networkidle0" timed out at 60 s on Browserless (408 "waiting for page content"), so we wait for the
 * normal "load" event, give fonts up to 8 s, and set bestAttempt so a slow resource never fails the PDF.
 * Retries: 408/429/5xx -> lighter settings; 400 (option not accepted) -> the minimal body that curl used.
 */
async function postBrowserless(url: string, body: Record<string, unknown>, timeoutMs: number) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const e = new Error(`Browserless /pdf returned ${res.status}: ${text.slice(0, 300)}`) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Browserless /pdf returned something that is not a PDF (${buf.length} bytes)`)
  return buf
}

async function printViaBrowserlessRest(url: string, html: string, context: PdfLogContext): Promise<Buffer> {
  const attempts: Array<{ name: string; body: Record<string, unknown> }> = [
    {
      name: 'load+fonts',
      body: {
        html,
        options: PDF_OPTIONS,
        gotoOptions: { waitUntil: 'load', timeout: 45000 },
        waitForFunction: { fn: "() => document.fonts.status === 'loaded'", timeout: 8000 },
        bestAttempt: true,
      },
    },
    { name: 'domcontentloaded', body: { html, options: PDF_OPTIONS, gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30000 }, bestAttempt: true } },
    { name: 'minimal', body: { html, options: PDF_OPTIONS } },
  ]
  let lastErr: unknown
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]
    const t = Date.now()
    try {
      const buf = await postBrowserless(url, a.body, 90_000)
      if (i > 0) logger.info('[PDF][BROWSERLESS_RETRY_OK]', { ...context, attempt: a.name, durationMs: Date.now() - t })
      return buf
    } catch (err) {
      lastErr = err
      const status = (err as { status?: number }).status
      logger.warn('[PDF][BROWSERLESS_ATTEMPT_FAILED]', { ...context, attempt: a.name, status, durationMs: Date.now() - t, message: (err as Error).message })
      // 401/403 = bad token: retrying won't help
      if (status === 401 || status === 403) break
    }
  }
  throw lastErr
}

async function printViaBrowser(html: string): Promise<Buffer> {
  const b = await getPdfBrowser()
  const page = await b.newPage()
  try {
    page.setDefaultTimeout(90000) // 90s max for PDF operations
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    try {
      await page.evaluate('document.fonts.ready.then(() => true)')
    } catch { /* proceed if fonts offline */ }
    return Buffer.from(await page.pdf(PDF_OPTIONS))
  } finally {
    await page.close().catch(() => undefined)
    await releasePdfBrowser()
  }
}

/** Browserless REST first (no packages), then a browser (remote WS / @sparticuz / Playwright). */
async function printPdf(html: string, context: PdfLogContext, startedAt: number): Promise<Buffer> {
  const errors: string[] = []
  const restUrl = browserlessPdfUrl()
  if (restUrl) {
    const t = Date.now()
    try {
      const buf = await printViaBrowserlessRest(restUrl, html, context)
      logger.info('[PDF][COMPLETE]', { ...context, renderer: 'browserless-rest', durationMs: Date.now() - startedAt, renderMs: Date.now() - t, bytes: buf.length })
      return buf
    } catch (err) {
      errors.push(`browserless-rest: ${(err as Error).message}`)
      logger.error('[PDF][RENDERER_FAILED]', { ...context, renderer: 'browserless-rest', durationMs: Date.now() - t, message: (err as Error).message })
    }
  } else {
    logger.warn('[PDF][NO_BROWSERLESS] PDF_BROWSER_WS_ENDPOINT / PDF_BROWSERLESS_URL not set in this environment; using a local browser', { ...context })
  }
  const t = Date.now()
  try {
    const buf = await printViaBrowser(html)
    logger.info('[PDF][COMPLETE]', { ...context, renderer: 'browser', durationMs: Date.now() - startedAt, renderMs: Date.now() - t, bytes: buf.length })
    return buf
  } catch (err) {
    errors.push(`browser: ${(err as Error).message}`)
    logger.error('[PDF][ERROR]', { ...context, durationMs: Date.now() - startedAt, errors })
    throw new Error(`PDF could not be made. ${errors.join(' | ')}`)
  }
}

export async function renderReportPdf(report: ReportJson, meta: RenderMeta, context: PdfLogContext = {}): Promise<Buffer> {
  const startedAt = Date.now()
  logger.info('[PDF][START]', { ...context, reportId: context.reportId || meta.reportId })
  const layoutStartedAt = Date.now()
  const initialSections = reportSections(report, meta)
  const totalPages = initialSections.length
  const pages: Record<string, number> = {}
  let cur = 1
  for (const s of initialSections) {
    pages[s.id] = cur
    cur += 1
  }
  logger.info('[PDF][LAYOUT_COMPLETE]', { ...context, reportId: meta.reportId, pages, totalPages, durationMs: Date.now() - layoutStartedAt })
  const html = renderReportHtml(report, { ...meta, pages }, totalPages)
  return printPdf(html, { ...context, reportId: meta.reportId }, startedAt)
}
