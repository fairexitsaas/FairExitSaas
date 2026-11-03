import { Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { documentService } from '../services/document.service'
import { extractionService } from '../services/extraction.service'
import { reviewService } from '../services/review.service'
import { caseService } from '../services/case.service'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { runInBackground } from '../utils/background'
import type { CreateDocumentInput, UpdateReviewInput } from '../validators/document.validator'
import type { CaseRow, DocKind } from '../fairexit/types'

/** Helper to resolve or verify case ownership */
async function resolveCaseForRequest(req: Request, caseId?: string): Promise<{ caseRow: CaseRow; caseToken?: string }> {
  const token = (req.headers['x-case-token'] as string) || (req.query?.t as string)
  const authUser = req.user

  if (caseId) {
    const c = await caseService.get(caseId)
    // Check ownership if case is tied to a user
    if (c.user_id && authUser?.id && c.user_id !== authUser.id) {
      throw ApiError.forbidden('You do not have permission to access this case')
    }
    if (token) {
      const valid = caseService.hasToken(c, token)
      if (!valid && !authUser?.id) {
        throw ApiError.notFound('Case not found')
      }
    }
    return { caseRow: c, caseToken: token }
  }

  // Create a new case if no caseId is provided
  const country = (req.body?.country || 'CA') as 'CA' | 'US'
  const province = req.body?.province || (country === 'CA' ? 'ON' : undefined)
  const usState = req.body?.state || (country === 'US' ? 'Georgia' : undefined)
  const answers = { ...(province ? { province } : {}), ...(usState ? { usState } : {}) }
  const created = await caseService.create({
    country,
    answers,
    platform: (req.headers['x-platform'] as any) || 'web',
    userId: authUser?.id || null,
  })

  // For testing/mock mode: ensure case is marked as paid so upload is accepted
  if (env.PAYMENTS_MODE === 'mock') {
    await caseService.update(created.row.id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      amount_cents: env.REPORT_PRICE_CENTS,
    })
  }

  return { caseRow: created.row, caseToken: created.token }
}

export const documentController = {
  /**
   * POST /api/v1/documents
   * Upload / register a document and optionally start processing
   */
  async createDocument(req: Request, res: Response) {
    const body: CreateDocumentInput = req.body
    const startTime = Date.now()
    const { caseRow: c, caseToken } = await resolveCaseForRequest(req, body.caseId)

    // Ensure case has paid status for document handling in dev/mock mode
    if (!caseService.isPaid(c) && env.PAYMENTS_MODE === 'mock') {
      await caseService.update(c.id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_provider: 'mock',
      })
      c.status = 'paid'
    }

    let docResult: any
    let uploadSlot: any = null

    if (body.dataBase64) {
      // Direct base64 upload
      docResult = await documentService.uploadBase64(c, {
        kind: body.kind as DocKind,
        fileName: body.fileName,
        mimeType: body.mimeType,
        dataBase64: body.dataBase64,
      })
    } else {
      // Slot upload (direct PUT to storage)
      const slot = await documentService.createUploadSlot(c, {
        kind: body.kind as DocKind,
        fileName: body.fileName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      })
      docResult = slot.document
      uploadSlot = slot.upload
    }

    // Check if auto-processing is requested or if documents are ready
    let processingStarted = false
    if (body.autoProcess) {
      const allDocs = await caseService.documents(c.id)
      const ready = caseService.readiness(c, allDocs)
      if (ready.letterPages && ready.contractOk) {
        runInBackground(`process:${c.id}`, 'Call A Document Extraction', async () => {
          await extractionService.processCaseDocuments(c.id)
        })
        processingStarted = true
      }
    }

    const durationMs = Date.now() - startTime
    logger.info('Document registered', {
      docId: docResult.id,
      caseId: c.id,
      kind: body.kind,
      processingStarted,
      durationMs,
    })

    return ApiResponse.created(res, {
      document: docResult,
      uploadSlot,
      caseId: c.id,
      caseToken,
      processingStatus: processingStarted ? 'reading' : docResult.status,
    }, 'Document registered successfully')
  },

  /**
   * POST /api/v1/documents/:id/process
   * Manually trigger or retry Call A document extraction
   */
  async processDocument(req: Request, res: Response) {
    const id = req.params.id
    const doc = await documentService.viewDocById(id).catch(() => null)
    const caseId = doc ? doc.caseId : id

    const result = await extractionService.processCaseDocuments(caseId)
    return ApiResponse.ok(res, result, 'Document extraction completed')
  },

  /**
   * GET /api/v1/documents/:id
   * Retrieve document status and metadata (supports document ID or case ID)
   */
  async getDocument(req: Request, res: Response) {
    const id = req.params.id
    try {
      // Try resolving as document ID
      const doc = await documentService.viewDocById(id)
      const c = await caseService.get(doc.caseId)
      return ApiResponse.ok(res, {
        document: doc,
        caseId: c.id,
        processingStatus: c.status,
        statusDetail: c.status_detail,
      }, 'Document retrieved successfully')
    } catch {
      // Fallback: try resolving as case ID
      const c = await caseService.get(id)
      const docs = await caseService.documents(c.id)
      return ApiResponse.ok(res, {
        caseId: c.id,
        documents: docs.map(documentService.view),
        processingStatus: c.status,
        statusDetail: c.status_detail,
      }, 'Case documents retrieved successfully')
    }
  },

  /**
   * GET /api/v1/documents/:id/extracted-facts
   * Retrieve the original validated facts extracted by Call A
   */
  async getExtractedFacts(req: Request, res: Response) {
    const id = req.params.id
    const { facts, missing } = await extractionService.getExtractedFacts(id)
    return ApiResponse.ok(res, {
      facts,
      missing,
      count: facts.length,
    }, 'Original extracted facts retrieved successfully')
  },

  /**
   * GET /api/v1/documents/:id/review
   * Retrieve the current review data (extracted facts + user corrections)
   */
  async getReview(req: Request, res: Response) {
    const id = req.params.id
    const reviewData = await reviewService.getReviewData(id)
    return ApiResponse.ok(res, reviewData, 'Review data retrieved successfully')
  },

  /**
   * PUT /api/v1/documents/:id/review
   * Save user-corrected facts separately from original extracted facts
   */
  async updateReview(req: Request, res: Response) {
    const id = req.params.id
    const body: UpdateReviewInput = req.body
    const result = await reviewService.saveUserCorrection(id, body)
    return ApiResponse.ok(res, result, 'User corrections saved successfully')
  },
}
