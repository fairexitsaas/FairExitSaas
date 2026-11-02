import { Router, Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { asyncHandler as h } from '../utils/asyncHandler'
import { validate } from '../middleware/validate'
import { authRateLimiter } from '../middleware/rateLimiter'
import * as V from '../validators/fairexit.validator'
import { recoveryService } from '../services/recovery.service'

/** "Bring your report in": email I paid with -> 6-digit code -> case tokens. */
const router = Router()
router.use(authRateLimiter)
router.post('/start', validate({ body: V.recoverStartSchema }), h(async (req: Request, res: Response) => ApiResponse.ok(res, await recoveryService.start(req.body.email, req.body.orderNumber))))
router.post('/verify', validate({ body: V.recoverVerifySchema }), h(async (req: Request, res: Response) => ApiResponse.ok(res, await recoveryService.verify(req.body.email, req.body.code, req.body.orderNumber))))
export default router
