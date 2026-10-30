import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import healthRoutes from './health.routes'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/user', userRoutes)

export default router

