import { z } from 'zod'

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const

export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

export const documentParamsSchema = z.object({
  id: z.string().min(1, 'Document or Case ID is required'),
})

export const createDocumentSchema = z.object({
  caseId: z.string().uuid().optional(),
  kind: z.enum(['letter', 'contract']),
  fileName: z.string().max(255).optional(),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: 'Unsupported file type. Use PDF, JPEG, PNG, WEBP or plain text.',
    }),
  }),
  sizeBytes: z
    .number()
    .positive()
    .max(MAX_DOCUMENT_SIZE_BYTES, `File too large (max 15 MB)`)
    .optional(),
  dataBase64: z.string().optional(),
  country: z.enum(['CA', 'US']).optional(),
  province: z.string().optional(),
  state: z.string().optional(),
  autoProcess: z.boolean().optional(),
})

export const updateReviewSchema = z.object({
  key: z.string().optional(),
  value: z.any().optional(),
  action: z
    .enum([
      'confirm',
      'change',
      'ack_change',
      'use_document',
      'keep_mine',
      'not_sure',
      'not_in_docs',
      'answer',
    ])
    .optional(),
  agreed: z.boolean().optional(),
  corrections: z.record(z.any()).optional(),
})

export const callAFactSchema = z.object({
  key: z.string().min(1),
  value: z.string().nullable().optional(),
  document: z.enum(['letter', 'contract', 'agreement']),
  quote: z.string().nullable().optional(),
  where: z.string().nullable().optional(),
  confidence: z.enum(['high', 'low']).optional(),
})

export const callAOutputSchema = z.object({
  facts: z.array(callAFactSchema),
  missing: z.array(z.string()).default([]),
  error: z.string().optional(),
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>
export type CallAFactValidated = z.infer<typeof callAFactSchema>
export type CallAOutputValidated = z.infer<typeof callAOutputSchema>
