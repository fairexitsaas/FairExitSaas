import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { asyncHandler as h } from '../utils/asyncHandler'
import { env } from '../config/env'
import { jobsService } from '../services/jobs.service'
import { configSnapshot, configWarnings } from '../utils/diagnostics'
import { getPdfBrowser, releasePdfBrowser } from '../services/pdfBrowser'
import { callClaudeJson } from '../services/claude.service'
import { caseService } from '../services/case.service'
import { flowService } from '../services/flow.service'

/** For an external scheduler (Vercel Cron, GitHub Actions, Supabase cron...). Header: X-Cron-Secret. */
const router = Router()
router.use((req: Request, _res: Response, next: NextFunction) => {
  // X-Cron-Secret, or Authorization: Bearer <CRON_SECRET> (what Vercel Cron sends)
  const auth = String(req.headers.authorization || '')
  const got = String(req.headers['x-cron-secret'] || (auth.startsWith('Bearer ') ? auth.slice(7) : ''))
  const want = env.CRON_SECRET || ''
  if (!want || got.length !== want.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) return next(ApiError.unauthorized('Bad cron secret'))
  next()
})
/**
 * GET /api/v1/internal/diagnostics            settings + warnings (no secrets)
 * GET /api/v1/internal/diagnostics?pdf=1      also makes a tiny PDF with the real browser setup
 * GET /api/v1/internal/diagnostics?claude=1   also makes a tiny Claude call (a few tokens)
 * Header: X-Cron-Secret: <CRON_SECRET>  (or Authorization: Bearer <CRON_SECRET>)
 */
router.get('/diagnostics', h(async (req, res) => {
  const config = configSnapshot()
  const out: Record<string, unknown> = { config, warnings: configWarnings(config) }
  if (req.query.pdf === '1') {
    const t = Date.now()
    try {
      const b = await getPdfBrowser()
      const p = await b.newPage()
      await p.setContent('<h1>FairExit diagnostics</h1>', { waitUntil: 'domcontentloaded' })
      const pdf = Buffer.from(await p.pdf({ format: 'Letter' }))
      await p.close().catch(() => undefined)
      await releasePdfBrowser()
      out.pdf = { ok: pdf.subarray(0, 5).toString() === '%PDF-', bytes: pdf.length, durationMs: Date.now() - t }
    } catch (e) {
      out.pdf = { ok: false, durationMs: Date.now() - t, error: (e as Error).message }
    }
  }
  if (req.query.claude === '1') {
    const t = Date.now()
    try {
      const r = await callClaudeJson<{ ok: boolean }>({
        system: 'Reply with the JSON {"ok": true} and nothing else.',
        content: [{ type: 'text', text: 'ping' }],
        maxTokens: 20,
        label: 'Diagnostics',
        context: { requestId: 'diagnostics' } as never,
      })
      out.claude = { ok: !!r.json?.ok, model: r.model, durationMs: Date.now() - t }
    } catch (e) {
      out.claude = { ok: false, durationMs: Date.now() - t, error: (e as Error).message }
    }
  }
  return ApiResponse.ok(res, out)
}))

const runJobs = h(async (_req, res) => ApiResponse.ok(res, await jobsService.runAll()))
router.post('/jobs/run', runJobs)
router.get('/jobs/run', runJobs) // Vercel Cron uses GET
router.post('/jobs/process-report', h(async (req, res) => {
  const { caseId } = req.body
  if (!caseId) throw ApiError.badRequest('caseId is required')
  const c = await caseService.get(caseId)
  const r = await flowService.startBuild(c, req.id)
  return ApiResponse.ok(res, r, 'Report build processed')
}))
export default router
