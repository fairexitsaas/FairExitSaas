import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { asyncHandler as h } from '../utils/asyncHandler'
import { env } from '../config/env'
import { jobsService } from '../services/jobs.service'
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
