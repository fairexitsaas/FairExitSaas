import { z } from 'zod'

const platform = z.enum(['web', 'ios', 'android']).default('web')
const country = z.enum(['CA', 'US'])
const uuid = z.string().uuid()

/**
 * Free-check answers. Field names match the web flow's state (CanadaFlow.tsx / USFlow.tsx and the
 * prototype). Known fields are typed; anything else is kept as-is (passthrough) so the flows can
 * add questions without a backend change.
 */
const numLike = z.union([z.number(), z.string()]).optional().transform((v) => {
  if (v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : undefined
})

export const answersSchema = z
  .object({
    // shared
    age: numLike,
    years: numLike,
    salary: numLike,
    offer: numLike,
    roleFactor: numLike,
    roleLabel: z.string().max(120).optional(),
    union: z.string().max(20).optional(),
    signed: z.string().max(20).optional(),
    reemployed: z.string().max(20).optional(),
    clause: z.string().max(20).optional(),
    contract: z.string().max(20).optional(),
    reason: z.string().max(30).optional(),
    market: z.string().max(20).optional(),
    redflag: z.string().max(30).optional(),
    groupLayoff: z.string().max(20).optional(),
    // Canada
    province: z.string().max(40).optional(),
    federal: z.string().max(10).optional(),
    emptype: z.string().max(30).optional(),
    payroll: z.string().max(10).optional(),
    pay: z.record(z.boolean()).optional(),
    bonus_regular: z.boolean().optional(),
    // US
    usState: z.string().max(40).optional(),
    comp: z.record(z.boolean()).optional(),
    ended: z.string().max(30).optional(),
    empsize: z.string().max(20).optional(),
    others: z.string().max(20).optional(),
    notice: z.string().max(20).optional(),
    release: z.string().max(20).optional(),
    promise: z.string().max(20).optional(),
    deadline: z.string().max(20).optional(),
    advise: z.string().max(20).optional(),
    list: z.string().max(20).optional(),
    revoke: z.string().max(20).optional(),
    nc: z.string().max(20).optional(),
  })
  .passthrough()

export const estimateSchema = z.object({
  country,
  answers: answersSchema,
})

export const createCaseSchema = z.object({
  country,
  answers: answersSchema,
  platform,
  industry: z.string().max(80).optional(),
})

export const patchAnswersSchema = z.object({
  answers: answersSchema,
})

export const caseParams = z.object({ caseId: uuid })
export const docParams = z.object({ caseId: uuid, docId: uuid })
export const rowParams = z.object({ caseId: uuid, key: z.string().regex(/^[a-z_]{2,40}$/) })

export const checkoutPrepareSchema = z.object({
  email: z.string().email().optional(),
  remind: z.boolean().optional(),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to continue' }) }),
  consentVersion: z.string().max(40).optional(),
})

export const postPaymentCustomerSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(150),
  email: z.string().trim().email({ message: 'Valid email is required' }),
  consentNews: z.boolean().optional(),
})

export const sendReportEmailSchema = z.object({
  email: z.string().trim().email().optional(),
  forceRetry: z.boolean().optional(),
})

export const stripeCheckoutSchema = z.object({
  email: z.string().email().optional(),
  remind: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
  mode: z.enum(['checkout', 'payment_intent']).default('checkout'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export const stripeConfirmSchema = z.object({
  sessionId: z.string().optional(),
  paymentIntentId: z.string().optional(),
})

export const appleIapSchema = z.object({ transactionId: z.string().min(1).max(64) })
export const googleIapSchema = z.object({ purchaseToken: z.string().min(10).max(4096), productId: z.string().max(200).optional() })

export const uploadSlotSchema = z.object({
  kind: z.enum(['letter', 'contract']),
  fileName: z.string().max(200).optional(),
  mimeType: z.string().max(120),
  sizeBytes: z.number().int().positive().optional(),
})

export const uploadBase64Schema = z.object({
  kind: z.enum(['letter', 'contract']),
  fileName: z.string().max(200).optional(),
  mimeType: z.string().max(120),
  dataBase64: z.string().min(10),
})

export const updateDocSchema = z.object({ kind: z.enum(['letter', 'contract']) })

export const contractStatusSchema = z.object({ status: z.enum(['never', 'missing']) })

export const rowActionSchema = z.object({
  action: z.enum(['confirm', 'answer', 'change', 'use_document', 'keep_mine', 'ack_change', 'not_in_docs', 'not_sure', 'reset']),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  agreed: z.boolean().optional(),
})

export const conflictSchema = z.object({
  choice: z.enum(['document', 'answers', 'other', 'not_sure']),
  value: z.union([z.string(), z.number()]).optional(),
})

export const attestSchema = z.object({ agreed: z.literal(true, { errorMap: () => ({ message: 'Tick the final agreement to continue' }) }) })

export const changeJurisdictionSchema = z.object({
  country: z.enum(['CA', 'US']),
  region: z.string().min(1).max(80),
})

export const remindersSchema = z.object({ email: z.boolean() })

export const deviceSchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  pushToken: z.string().min(10).max(4096),
})

export const leadSchema = z.object({
  caseId: uuid.optional(),
  country: country.optional(),
  jurisdictionCode: z.string().max(40).optional(),
  regionName: z.string().max(100).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  bestTime: z.string().max(60).optional(),
  enquiryType: z.string().trim().max(60).optional(),
  sourcePage: z.string().trim().max(200).optional(),
  consent: z.boolean().optional(),
  platform,
})

export const recoverStartSchema = z.object({ email: z.string().email(), orderNumber: z.string().max(20).optional() })
export const recoverVerifySchema = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/), orderNumber: z.string().max(20).optional() })

// ---- admin
export const adminListQuery = z.object({
  country: z.enum(['CA', 'US', 'all']).default('all'),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  status: z.string().max(30).optional(),
  enquiryType: z.string().max(60).optional(),
  search: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  limit: z.string().optional().transform((v) => (v ? Math.min(1000, parseInt(v, 10)) : 200)),
  offset: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
})

export const adminLeadPatch = z.object({
  status: z.enum(['new', 'sent', 'call_happened', 'retained', 'closed_no_response']).optional(),
  lawyerId: uuid.nullable().optional(),
  sentHow: z.string().max(40).optional(),
  sentBy: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
})

export const lawyerSchema = z.object({
  name: z.string().min(1).max(120),
  firm: z.string().max(160).optional(),
  contact_name: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  jurisdiction_code: z.string().regex(/^(CA|US)-[A-Z]{2,3}$/),
  country,
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  status: z.enum(['active', 'paused', 'inactive']).default('active'),
  agreement_signed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  monthly_max: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
})
export const lawyerPatch = lawyerSchema.partial()
export const idParams = z.object({ id: uuid })
