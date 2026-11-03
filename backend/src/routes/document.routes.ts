import { Router } from 'express'
import { documentController } from '../controllers/document.controller'
import { optionalAuthenticate } from '../middleware/caseAccess'
import { validate } from '../middleware/validate'
import { asyncHandler as h } from '../utils/asyncHandler'
import {
  createDocumentSchema,
  documentParamsSchema,
  updateReviewSchema,
} from '../validators/document.validator'

const router = Router()

// Support optional Bearer token or anonymous session
router.use(optionalAuthenticate)

// POST /api/v1/documents — upload/register documents and start processing
router.post('/', validate({ body: createDocumentSchema }), h(documentController.createDocument))

// POST /api/v1/documents/:id/process — trigger document extraction (Call A)
router.post('/:id/process', validate({ params: documentParamsSchema }), h(documentController.processDocument))

// GET /api/v1/documents/:id — retrieve document status and metadata
router.get('/:id', validate({ params: documentParamsSchema }), h(documentController.getDocument))

// GET /api/v1/documents/:id/extracted-facts — retrieve original extracted facts
router.get('/:id/extracted-facts', validate({ params: documentParamsSchema }), h(documentController.getExtractedFacts))

// GET /api/v1/documents/:id/review — retrieve current review data
router.get('/:id/review', validate({ params: documentParamsSchema }), h(documentController.getReview))

// PUT /api/v1/documents/:id/review — save user-corrected facts
router.put('/:id/review', validate({ params: documentParamsSchema, body: updateReviewSchema }), h(documentController.updateReview))

export default router
