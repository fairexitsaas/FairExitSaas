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
import fs from 'node:fs'
import path from 'node:path'
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

export const isServerless = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)

export function pickDriver(): 'sparticuz' | 'playwright' | 'puppeteer' {
  const forced = (process.env.PDF_BROWSER || '').toLowerCase()
  if (forced === 'sparticuz' || forced === 'playwright' || forced === 'puppeteer') return forced
  return isServerless() ? 'sparticuz' : 'playwright'
}

// Native dynamic import helper that survives CommonJS transpilation in TypeScript
/* eslint-disable @typescript-eslint/no-implied-eval, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
const dynamicImport = new Function('specifier', 'return import(specifier)') as <T = any>(specifier: string) => Promise<T>

export function resolveSparticuzBinPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin'),
    path.join(process.cwd(), 'backend', 'node_modules', '@sparticuz', 'chromium', 'bin'),
    ...(process.env.LAMBDA_TASK_ROOT
      ? [
          path.join(process.env.LAMBDA_TASK_ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin'),
          path.join(process.env.LAMBDA_TASK_ROOT, 'backend', 'node_modules', '@sparticuz', 'chromium', 'bin'),
        ]
      : []),
  ]
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'chromium.br'))) {
        return candidate
      }
    } catch {
      /* ignore lookup errors */
    }
  }
  return undefined
}

export async function loadChromium(): Promise<any> {
  let importErr: any = null
  try {
    const mod = await dynamicImport('@sparticuz/chromium')
    logger.info('[PDF][SPARTICUZ_LOADED]', { method: 'dynamic_import' })
    return mod.default || mod
  } catch (err: any) {
    importErr = err
    logger.warn('[PDF][SPARTICUZ_IMPORT_WARN]', {
      message: err?.message,
      code: err?.code,
    })
  }

  try {
    const mod = require('@sparticuz/chromium')
    logger.info('[PDF][SPARTICUZ_LOADED]', { method: 'require' })
    return mod.default || mod
  } catch (requireErr: any) {
    logger.error('[PDF][SPARTICUZ_LOAD_ERROR]', {
      importMessage: importErr?.message,
      importCode: importErr?.code,
      requireMessage: requireErr?.message,
      requireCode: requireErr?.code,
      stack: requireErr?.stack || importErr?.stack,
    })
    throw new ApiError(
      501,
      `Failed to load @sparticuz/chromium: ${importErr?.message || requireErr?.message || 'unknown error'} (importCode=${importErr?.code || 'none'}, requireCode=${requireErr?.code || 'none'})`
    )
  }
}

export async function loadPuppeteerCore(): Promise<any> {
  let requireErr: any = null
  try {
    const mod = require('puppeteer-core')
    logger.info('[PDF][PUPPETEER_LOADED]', { method: 'require' })
    return mod.default || mod
  } catch (err: any) {
    requireErr = err
    logger.warn('[PDF][PUPPETEER_REQUIRE_WARN]', {
      message: err?.message,
      code: err?.code,
    })
  }

  try {
    const mod = await dynamicImport('puppeteer-core')
    logger.info('[PDF][PUPPETEER_LOADED]', { method: 'dynamic_import' })
    return mod.default || mod
  } catch (importErr: any) {
    logger.error('[PDF][PUPPETEER_LOAD_ERROR]', {
      requireMessage: requireErr?.message,
      requireCode: requireErr?.code,
      importMessage: importErr?.message,
      importCode: importErr?.code,
      stack: importErr?.stack || requireErr?.stack,
    })
    throw new ApiError(
      501,
      `Failed to load puppeteer-core: ${requireErr?.message || importErr?.message || 'unknown error'} (requireCode=${requireErr?.code || 'none'}, importCode=${importErr?.code || 'none'})`
    )
  }
}

async function launchSparticuz(): Promise<PdfBrowser> {
  const launchStart = Date.now()
  logger.info('[PDF][SPARTICUZ_INIT]', {
    nodeVersion: process.version,
    cwd: process.cwd(),
    taskRoot: process.env.LAMBDA_TASK_ROOT || null,
  })

  // Statically reference symbols so @vercel/nft traces both packages into the bundle
  if ((false as boolean)) {
    require('@sparticuz/chromium')
    require('puppeteer-core')
  }

  const [chromium, puppeteer] = await Promise.all([
    loadChromium(),
    loadPuppeteerCore(),
  ])

  // No GPU / no WebGL on Lambda; keeps start-up fast.
  if (typeof chromium.setGraphicsMode !== 'undefined') {
    chromium.setGraphicsMode = false
  }

  const binDir = resolveSparticuzBinPath()
  logger.info('[PDF][SPARTICUZ_BIN_LOCATION]', { binDir: binDir || 'package_default' })

  let executablePath: string
  try {
    executablePath = binDir ? await chromium.executablePath(binDir) : await chromium.executablePath()
  } catch (execErr: any) {
    logger.error('[PDF][SPARTICUZ_EXECUTABLE_ERROR]', {
      binDir,
      message: execErr?.message,
      code: execErr?.code,
      stack: execErr?.stack,
    })
    throw new ApiError(500, `Failed to resolve serverless Chromium executable: ${execErr?.message}`)
  }

  const exists = fs.existsSync(executablePath)
  let statSize: number | null = null
  try {
    if (exists) statSize = fs.statSync(executablePath).size
  } catch {
    /* ignore */
  }

  logger.info('[PDF][SPARTICUZ_EXECUTABLE_RESOLVED]', {
    executablePath,
    exists,
    sizeBytes: statSize,
  })

  if (!exists) {
    throw new ApiError(500, `Chromium executable not found at resolved path: ${executablePath}`)
  }

  let browser: any
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: 'shell',
      defaultViewport: { width: 816, height: 1056 }, // US Letter at 96 dpi
    })
    logger.info('[PDF][SPARTICUZ_LAUNCH_SUCCESS]', {
      durationMs: Date.now() - launchStart,
      connected: browser.connected ?? browser.isConnected?.() ?? true,
    })
  } catch (launchErr: any) {
    logger.error('[PDF][SPARTICUZ_LAUNCH_ERROR]', {
      executablePath,
      message: launchErr?.message,
      code: launchErr?.code,
      stack: launchErr?.stack,
    })
    throw new ApiError(500, `Failed to launch Chromium on serverless: ${launchErr?.message}`)
  }

  return wrapPuppeteer(browser)
}

async function launchPuppeteer(): Promise<PdfBrowser> {
  let puppeteer: any
  try {
    puppeteer = require('puppeteer')
  } catch (err: any) {
    logger.error('[PDF][PUPPETEER_LOCAL_ERROR]', { message: err?.message, code: err?.code })
    throw new ApiError(501, `PDF_BROWSER=puppeteer needs: npm i puppeteer (${err?.message})`)
  }
  return wrapPuppeteer(await (puppeteer.default || puppeteer).launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }))
}

export function wrapPuppeteer(browser: any): PdfBrowser {
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
  } catch (err: any) {
    logger.error('[PDF][PLAYWRIGHT_LAUNCH_ERROR]', { message: err?.message, code: err?.code })
    throw new ApiError(501, `PDF rendering is not installed (npm i playwright && npx playwright install chromium): ${err?.message}`)
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
/* eslint-enable @typescript-eslint/no-implied-eval, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */

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
