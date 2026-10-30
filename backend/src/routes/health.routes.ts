import { Router } from 'express'
import { healthController } from '../controllers/health.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.get('/', healthController.getHealth)
router.get('/ready', asyncHandler(healthController.getReadiness))

export default router

