import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pickDriver,
  isServerless,
  resolveSparticuzBinPath,
  loadChromium,
  loadPuppeteerCore,
  wrapPuppeteer,
} from '../../src/services/pdfBrowser'
import fs from 'node:fs'
import path from 'node:path'

describe('PDF Browser Serverless & Driver Tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    delete process.env.VERCEL
    delete process.env.AWS_LAMBDA_FUNCTION_NAME
    delete process.env.LAMBDA_TASK_ROOT
    delete process.env.PDF_BROWSER
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('Driver selection & serverless detection', () => {
    it('detects serverless when VERCEL is set', () => {
      process.env.VERCEL = '1'
      expect(isServerless()).toBe(true)
      expect(pickDriver()).toBe('sparticuz')
    })

    it('detects serverless when AWS_LAMBDA_FUNCTION_NAME is set', () => {
      process.env.AWS_LAMBDA_FUNCTION_NAME = 'render-pdf'
      expect(isServerless()).toBe(true)
      expect(pickDriver()).toBe('sparticuz')
    })

    it('detects serverless when LAMBDA_TASK_ROOT is set', () => {
      process.env.LAMBDA_TASK_ROOT = '/var/task'
      expect(isServerless()).toBe(true)
      expect(pickDriver()).toBe('sparticuz')
    })

    it('defaults to playwright on non-serverless machines', () => {
      expect(isServerless()).toBe(false)
      expect(pickDriver()).toBe('playwright')
    })

    it('honors PDF_BROWSER override explicitly', () => {
      process.env.PDF_BROWSER = 'sparticuz'
      expect(pickDriver()).toBe('sparticuz')

      process.env.PDF_BROWSER = 'puppeteer'
      expect(pickDriver()).toBe('puppeteer')

      process.env.PDF_BROWSER = 'playwright'
      expect(pickDriver()).toBe('playwright')
    })
  })

  describe('Chromium binary path resolution', () => {
    it('locates bin directory containing chromium.br', () => {
      const binPath = resolveSparticuzBinPath()
      expect(binPath).toBeDefined()
      expect(typeof binPath).toBe('string')
      expect(fs.existsSync(binPath!)).toBe(true)
      expect(fs.existsSync(path.join(binPath!, 'chromium.br'))).toBe(true)
    })
  })

  describe('Module loaders', () => {
    it('loads @sparticuz/chromium successfully and exposes required args', async () => {
      const chromium = await loadChromium()
      expect(chromium).toBeDefined()
      expect(Array.isArray(chromium.args)).toBe(true)
      expect(chromium.args.length).toBeGreaterThan(0)
      expect(typeof chromium.executablePath).toBe('function')
    })

    it('loads puppeteer-core successfully and exposes launch method', async () => {
      const puppeteer = await loadPuppeteerCore()
      expect(puppeteer).toBeDefined()
      expect(typeof puppeteer.launch).toBe('function')
    })
  })

  describe('Browser wrapper interface', () => {
    it('correctly wraps puppeteer browser instance with PdfBrowser interface', async () => {
      let closed = false
      const mockPage = {
        setDefaultTimeout: vi.fn(),
        setContent: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(true),
        pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
        close: vi.fn().mockResolvedValue(undefined),
      }
      const mockBrowser = {
        connected: true,
        close: vi.fn().mockImplementation(async () => {
          closed = true
        }),
        newPage: vi.fn().mockResolvedValue(mockPage),
      }

      const wrapped = wrapPuppeteer(mockBrowser)
      expect(wrapped.isConnected()).toBe(true)

      const page = await wrapped.newPage()
      page.setDefaultTimeout(5000)
      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(5000)

      await page.setContent('<html><body>Report</body></html>', { waitUntil: 'domcontentloaded' })
      expect(mockPage.setContent).toHaveBeenCalledWith('<html><body>Report</body></html>', { waitUntil: 'domcontentloaded' })

      const pdfBuf = await page.pdf({ format: 'Letter' })
      expect(pdfBuf).toBeInstanceOf(Buffer)

      await page.close()
      expect(mockPage.close).toHaveBeenCalled()

      await wrapped.close()
      expect(closed).toBe(true)
    })
  })
})
