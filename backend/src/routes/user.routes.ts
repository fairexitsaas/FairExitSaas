import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { updateProfileSchema, updateEmailSchema } from '../validators/user.validator'
import { db } from '../config/db'
import { ApiResponse } from '../utils/ApiResponse'
import { caseService } from '../services/case.service'
import { documentService } from '../services/document.service'
import type { CaseRow } from '../fairexit/types'

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

// FairExit: the signed-in person's saved reports (after "Save to your account")
router.get(
  '/cases',
  asyncHandler(async (req, res) => {
    const { data, error } = await db().from('cases').select('*').eq('user_id', req.user!.id).order('created_at', { ascending: false })
    if (error) throw error
    return ApiResponse.ok(res, (data as CaseRow[]).map((c) => caseService.view(c)))
  })
)

// FairExit: "Delete account" deletes every case, document and report, then the auth user
router.delete(
  '/account',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const { data } = await db().from('cases').select('id').eq('user_id', userId)
    for (const c of data || []) {
      await documentService.purge(c.id)
      await db().from('leads').delete().eq('case_id', c.id)
      await db().from('cases').delete().eq('id', c.id)
    }
    const { error } = await db().auth.admin.deleteUser(userId)
    if (error) throw error
    return ApiResponse.ok(res, { deleted: true }, 'Your account and data were deleted')
  })
)

export default router

