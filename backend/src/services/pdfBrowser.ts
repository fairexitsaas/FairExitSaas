/**
 * Headless Chromium for PDF rendering, on any host.
 *
 *  - Vercel / AWS Lambda (serverless): `puppeteer-core` + `@sparticuz/chromium`.
 *    Playwright's own browser download does NOT exist on Vercel, which is what caused
 *    "browserType.launch: Executable doesn't exist at .../ms-playwright/...".
 *  - Local / a normal server (Docker, Render, Railway, VM): Playwright's Chromium
 *    (`npx playwright install chromium` once), or full `puppeteer` if that is installed.
 *
 * Recommended for production: PDF_BROWSER_WS_ENDPOINT = a hosted Chrome (e.g. Browserless:
 *   wss://production-sfo.browserless.io?token=YOUR_TOKEN). Nothing is bundled or launched; the
 *   same code path works locally and on Vercel. If it is set it is always tried first, and if it
 *   fails we fall back to the local driver below (so a remote outage never blocks a report).
 *
 * Override with PDF_BROWSER=remote | sparticuz | playwright | puppeteer.
 * Both drivers expose the same small surface we use: newPage(), setContent(), pdf(), close().
 */
import { logger } from '../utils/logger'
import { ApiError } from '../utils/ApiError'
import { maskUrl } from '../utils/diagnostics'

export interface PdfPage {
  setDefaultTimeout(ms: number): void
  setContent(html: string, opts: { waitUntil: 'load' | 'domcontentloaded' }): Promise<unknown>
  evaluate(fn: string): Promise<unknown>
  pdf(opts: Record<string, unknown>): Promise<Uint8Array>
  close(): Promise<void>
}
export interface PdfBrowser {
  newPage(): Promise<PdfPage>
  close(): Promise<void>
  isConnected(): boolean
}

const isServerless = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)

type Driver = 'remote' | 'sparticuz' | 'playwright' | 'puppeteer'

/** Drivers to try, in order. */
function driverOrder(): Driver[] {
  const forced = (process.env.PDF_BROWSER || '').toLowerCase() as Driver
  const local: Driver = isServerless() ? 'sparticuz' : 'playwright'
  if (forced === 'remote') return ['remote']
  if (forced === 'sparticuz' || forced === 'playwright' || forced === 'puppeteer') return [forced]
  return process.env.PDF_BROWSER_WS_ENDPOINT ? ['remote', local] : [local]
}

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
/**
 * puppeteer-core and @sparticuz/chromium are ES modules. This backend compiles to CommonJS, where
 * `require()` of an ES module fails on Vercel ("require() of ES Module ... not supported") and TypeScript
 * would turn `import()` into `require()`. So we call the real dynamic import() at runtime.
 */
const nativeImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>
async function loadModule(name: string): Promise<any> {
  const m = await nativeImport(name)
  return m?.default ?? m
}
// Never runs. It only tells Vercel's file tracer to ship these packages with the function.
if (process.env.__FAIREXIT_TRACE_ONLY__ === '1') {
  require('puppeteer-core')
  require('@sparticuz/chromium')
}

async function launchSparticuz(): Promise<PdfBrowser> {
  let chromium: any, puppeteer: any
  try {
    chromium = await loadModule('@sparticuz/chromium')
    puppeteer = await loadModule('puppeteer-core')
  } catch (err) {
    throw new ApiError(501, `Could not load puppeteer-core / @sparticuz/chromium: ${(err as Error).message}`)
  }
  // No GPU / no WebGL on Lambda; keeps start-up fast.
  if (typeof chromium.setGraphicsMode !== 'undefined') chromium.setGraphicsMode = false
  const executablePath: string = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: 'shell',
    defaultViewport: { width: 816, height: 1056 }, // US Letter at 96 dpi
  })
  return wrapPuppeteer(browser)
}

/** Hosted Chrome over WebSocket (Browserless or any Chrome DevTools endpoint). Uses puppeteer-core only. */
async function connectRemote(): Promise<PdfBrowser> {
  const endpoint = process.env.PDF_BROWSER_WS_ENDPOINT
  if (!endpoint) throw new ApiError(501, 'PDF_BROWSER_WS_ENDPOINT is not set')
  let puppeteer: any
  try {
    puppeteer = await loadModule('puppeteer-core')
  } catch (err) {
    throw new ApiError(501, `Could not load puppeteer-core: ${(err as Error).message}`)
  }
  const browser = await puppeteer.connect({ browserWSEndpoint: endpoint, protocolTimeout: 120_000 })
  // disconnect (not close): Browserless ends the session on disconnect, and a shared Chrome stays up
  return wrapPuppeteer(browser, true)
}

async function launchPuppeteer(): Promise<PdfBrowser> {
  let puppeteer: any
  try {
    puppeteer = require('puppeteer')
  } catch {
    throw new ApiError(501, 'PDF_BROWSER=puppeteer needs: npm i puppeteer')
  }
  return wrapPuppeteer(await (puppeteer.default || puppeteer).launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }))
}

function wrapPuppeteer(browser: any, remote = false): PdfBrowser {
  return {
    isConnected: () => browser.connected ?? browser.isConnected?.() ?? true,
    close: () => (remote ? browser.disconnect() : browser.close()),
    newPage: async () => {
      const p = await browser.newPage()
      return {
        setDefaultTimeout: (ms) => p.setDefaultTimeout(ms),
        setContent: (html, o) => p.setContent(html, { waitUntil: o.waitUntil === 'load' ? 'load' : 'domcontentloaded' }),
        evaluate: (fn) => p.evaluate(fn),
        pdf: (o) => p.pdf(o),
        close: () => p.close(),
      }
    },
  }
}

async function launchPlaywright(): Promise<PdfBrowser> {
  let pw: any
  try {
    pw = require('playwright')
  } catch {
    throw new ApiError(501, 'PDF rendering is not installed (npm i playwright && npx playwright install chromium)')
  }
  const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  return {
    isConnected: () => browser.isConnected(),
    close: () => browser.close(),
    newPage: async () => {
      const p = await browser.newPage()
      return {
        setDefaultTimeout: (ms) => p.setDefaultTimeout(ms),
        setContent: (html, o) => p.setContent(html, o),
        evaluate: (fn) => p.evaluate(fn),
        pdf: (o) => p.pdf(o),
        close: () => p.close(),
      }
    },
  }
}
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */

let browserPromise: Promise<PdfBrowser> | null = null

/** One shared browser per warm instance. A failed or crashed launch is never cached. */
export async function getPdfBrowser(): Promise<PdfBrowser> {
  if (browserPromise) {
    try {
      const b = await browserPromise
      if (b.isConnected()) return b
    } catch {
      /* fall through and relaunch */
    }
    browserPromise = null
  }
  const launch: Record<Driver, () => Promise<PdfBrowser>> = {
    remote: connectRemote, sparticuz: launchSparticuz, playwright: launchPlaywright, puppeteer: launchPuppeteer,
  }
  browserPromise = (async () => {
    let lastErr: unknown
    const order = driverOrder()
    logger.info('[PDF][BROWSER_LAUNCH]', { order, remoteEndpoint: maskUrl(process.env.PDF_BROWSER_WS_ENDPOINT), serverless: isServerless() })
    for (const driver of order) {
      const started = Date.now()
      try {
        const b = await launch[driver]()
        logger.info('[PDF][BROWSER_READY]', { driver, durationMs: Date.now() - started })
        return b
      } catch (err) {
        lastErr = err
        logger.error('[PDF][BROWSER_LAUNCH_ERROR]', { driver, durationMs: Date.now() - started, message: (err as Error).message })
      }
    }
    throw lastErr
  })().catch((err) => {
    browserPromise = null
    throw err
  })
  return browserPromise
}

/** Close after use on serverless so the function can freeze cleanly; keep it warm elsewhere. */
export async function releasePdfBrowser(): Promise<void> {
  // Remote sessions are billed while open, and serverless instances freeze: close after each PDF.
  if (!browserPromise || (!isServerless() && !process.env.PDF_BROWSER_WS_ENDPOINT)) return
  const p = browserPromise
  browserPromise = null
  try {
    await (await p).close()
  } catch {
    /* already gone */
  }
}
