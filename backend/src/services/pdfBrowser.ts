/**
 * Headless Chromium for PDF rendering, on any host.
 *
 *  - Vercel / AWS Lambda (serverless): `puppeteer-core` + `@sparticuz/chromium`.
 *    Playwright's own browser download does NOT exist on Vercel, which is what caused
 *    "browserType.launch: Executable doesn't exist at .../ms-playwright/...".
 *  - Local / a normal server (Docker, Render, Railway, VM): Playwright's Chromium
 *    (`npx playwright install chromium` once), or full `puppeteer` if that is installed.
 *
 * Override with PDF_BROWSER=sparticuz | playwright | puppeteer.
 * Both drivers expose the same small surface we use: newPage(), setContent(), pdf(), close().
 */
import { logger } from '../utils/logger'
import { ApiError } from '../utils/ApiError'

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

function pickDriver(): 'sparticuz' | 'playwright' | 'puppeteer' {
  const forced = (process.env.PDF_BROWSER || '').toLowerCase()
  if (forced === 'sparticuz' || forced === 'playwright' || forced === 'puppeteer') return forced
  return isServerless() ? 'sparticuz' : 'playwright'
}

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
async function launchSparticuz(): Promise<PdfBrowser> {
  let chromium: any, puppeteer: any
  try {
    chromium = require('@sparticuz/chromium')
    chromium = chromium.default || chromium
    puppeteer = require('puppeteer-core')
    puppeteer = puppeteer.default || puppeteer
  } catch {
    throw new ApiError(501, 'PDF on serverless needs: npm i puppeteer-core @sparticuz/chromium')
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

async function launchPuppeteer(): Promise<PdfBrowser> {
  let puppeteer: any
  try {
    puppeteer = require('puppeteer')
  } catch {
    throw new ApiError(501, 'PDF_BROWSER=puppeteer needs: npm i puppeteer')
  }
  return wrapPuppeteer(await (puppeteer.default || puppeteer).launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }))
}

function wrapPuppeteer(browser: any): PdfBrowser {
  return {
    isConnected: () => browser.connected ?? browser.isConnected?.() ?? true,
    close: () => browser.close(),
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
  const driver = pickDriver()
  const started = Date.now()
  browserPromise = (driver === 'sparticuz' ? launchSparticuz() : driver === 'puppeteer' ? launchPuppeteer() : launchPlaywright())
    .then((b) => {
      logger.info('[PDF][BROWSER_READY]', { driver, durationMs: Date.now() - started })
      return b
    })
    .catch((err) => {
      browserPromise = null
      logger.error('[PDF][BROWSER_LAUNCH_ERROR]', { driver, message: (err as Error).message })
      throw err
    })
  return browserPromise
}

/** Close after use on serverless so the function can freeze cleanly; keep it warm elsewhere. */
export async function releasePdfBrowser(): Promise<void> {
  if (!isServerless() || !browserPromise) return
  const p = browserPromise
  browserPromise = null
  try {
    await (await p).close()
  } catch {
    /* already gone */
  }
}
