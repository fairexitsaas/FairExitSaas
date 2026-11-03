import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import healthRoutes from './health.routes'
import publicRoutes from './public.routes'
import caseRoutes from './case.routes'
import documentRoutes from './document.routes'
import leadRoutes from './lead.routes'
import recoverRoutes from './recover.routes'
import adminRoutes from './admin.routes'
import internalRoutes from './internal.routes'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/user', userRoutes)

// FairExit Phase 1
router.use('/', publicRoutes) // /config, /jurisdictions, /rules/estimate
router.use('/cases', caseRoutes)
router.use('/documents', documentRoutes)
router.use('/leads', leadRoutes)
router.use('/recover', recoverRoutes)
router.use('/admin', adminRoutes)
router.use('/internal', internalRoutes)

export default router
