import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { updateProfileSchema, updateEmailSchema } from '../validators/user.validator'

const router = Router()

// All user routes require authentication
router.use(authenticate)

router.get('/profile', asyncHandler(userController.getProfile))

router.put(
  '/profile',
  validate({ body: updateProfileSchema }),
  asyncHandler(userController.updateProfile)
)

router.put(
  '/email',
  validate({ body: updateEmailSchema }),
  asyncHandler(userController.updateEmail)
)

export default router

