import { Router, Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { asyncHandler as h } from '../utils/asyncHandler'
import { validate } from '../middleware/validate'
import { optionalAuthenticate } from '../middleware/caseAccess'
import { authRateLimiter } from '../middleware/rateLimiter'
import * as V from '../validators/fairexit.validator'
import { leadService } from '../services/lead.service'
import { caseService } from '../services/case.service'
import type { Platform } from '../fairexit/types'

/** "Ask a lawyer to contact me". No account needed; a case is optional. */
const router = Router()

router.post('/', authRateLimiter, optionalAuthenticate, validate({ body: V.leadSchema }), h(async (req: Request, res: Response) => {
  let caseRow = null
  if (req.body.caseId) {
    try {
      const c = await caseService.get(req.body.caseId)
      const ok = caseService.hasToken(c, req.headers['x-case-token'] as string) || (req.user && req.user.id === c.user_id)
      if (ok) {
        caseRow = c
      } else {
        if (!req.body.country && c?.country) {
          req.body.country = c.country
          req.body.jurisdictionCode = req.body.jurisdictionCode || c.jurisdiction_code
        }
      }
    } catch {
      // Case not found or expired; continue with lead creation without crashing
    }
  }
  if (!req.body.country && !caseRow) {
    req.body.country = 'CA'
  }
  const r = await leadService.create({ ...req.body, caseRow, platform: (req.headers['x-platform'] as Platform) || req.body.platform })
  return ApiResponse.created(res, r, r.duplicate ? 'You already asked; we are on it.' : 'Sent')
}))

export default router
