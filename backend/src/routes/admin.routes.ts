import { Router, Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler as h } from '../utils/asyncHandler'
import { validate } from '../middleware/validate'
import { authenticate } from '../middleware/authenticate'
import { requireAdmin } from '../middleware/caseAccess'
import * as V from '../validators/fairexit.validator'
import { adminService, toCsv } from '../services/admin.service'
import { caseService } from '../services/case.service'
import { flowService } from '../services/flow.service'
import { jobsService } from '../services/jobs.service'
import { promptInfo } from '../fairexit/prompts'

/** Ops dashboard phase 1. Bearer token of a user whose profiles.role = 'ADMIN'. */
const router = Router()
router.use(authenticate, requireAdmin)

function out(req: Request, res: Response, rows: Array<Record<string, unknown>>, name: string) {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="fairexit-${name}-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.send(toCsv(rows))
  }
  return ApiResponse.ok(res, rows)
}

router.get('/overview', validate({ query: V.adminListQuery }), h(async (req, res) => ApiResponse.ok(res, await adminService.overview(req.query.country as any, req.query.month as string | undefined))))
router.get('/users', validate({ query: V.adminListQuery }), h(async (req, res) => out(req, res, await adminService.users(req.query.country as any, Number(req.query.limit), Number(req.query.offset)), 'users')))
router.get('/leads', validate({ query: V.adminListQuery }), h(async (req, res) => out(req, res, await adminService.leads(req.query.country as any, {
  status: req.query.status as string | undefined,
  enquiryType: req.query.enquiryType as string | undefined,
  search: req.query.search as string | undefined,
  region: req.query.region as string | undefined,
  limit: Number(req.query.limit) || 200,
  offset: Number(req.query.offset) || 0,
}), 'lawyer-requests')))
router.get('/enquiries', validate({ query: V.adminListQuery }), h(async (req, res) => out(req, res, await adminService.leads(req.query.country as any, {
  status: req.query.status as string | undefined,
  enquiryType: req.query.enquiryType as string | undefined,
  search: req.query.search as string | undefined,
  region: req.query.region as string | undefined,
  limit: Number(req.query.limit) || 200,
  offset: Number(req.query.offset) || 0,
}), 'lawyer-enquiries')))
router.patch('/leads/:id', validate({ params: V.idParams, body: V.adminLeadPatch }), h(async (req, res) => ApiResponse.ok(res, await adminService.updateLead(req.params.id, req.body))))
router.get('/reports', validate({ query: V.adminListQuery }), h(async (req, res) => out(req, res, await adminService.reports(req.query.country as any), 'reports')))
router.get('/cases/:id', validate({ params: V.idParams }), h(async (req, res) => ApiResponse.ok(res, await adminService.caseDetail(req.params.id))))
router.post('/cases/:id/retry', validate({ params: V.idParams }), h(async (req, res) => {
  const c = await caseService.get(req.params.id)
  const r = c.status_detail === 'build_failed' ? await flowService.startBuild(c) : await flowService.startRead(c)
  return ApiResponse.ok(res, r, 'Retry started')
}))
router.get('/lawyers', h(async (_req, res) => ApiResponse.ok(res, await adminService.lawyers())))
router.post('/lawyers', validate({ body: V.lawyerSchema }), h(async (req, res) => ApiResponse.created(res, await adminService.createLawyer(req.body))))
router.patch('/lawyers/:id', validate({ params: V.idParams, body: V.lawyerPatch }), h(async (req, res) => ApiResponse.ok(res, await adminService.updateLawyer(req.params.id, req.body))))
router.delete('/lawyers/:id', validate({ params: V.idParams }), h(async (req, res) => {
  await adminService.deleteLawyer(req.params.id)
  return ApiResponse.ok(res, { deleted: true })
}))
router.get('/prompt', (_req: Request, res: Response) => ApiResponse.ok(res, promptInfo()))
router.post('/jobs/run', h(async (_req, res) => ApiResponse.ok(res, await jobsService.runAll())))

export default router
