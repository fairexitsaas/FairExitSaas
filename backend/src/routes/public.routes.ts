import { Router, Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { asyncHandler as h } from '../utils/asyncHandler'
import { validate } from '../middleware/validate'
import { env } from '../config/env'
import * as V from '../validators/fairexit.validator'
import { listJurisdictions, buildJurisdiction, normalizeCode, CA_NOT_COVERED } from '../fairexit/jurisdictions'
import { regionPage, REGION_DATA_META } from '../fairexit/regionData'
import { computeFreeResult } from '../fairexit/freeCheck'
import { RULES_VERSION, RULES_LAST_UPDATED, getRule } from '../fairexit/severanceRules'
import { PROMPT_VERSION } from '../fairexit/prompts'

/** Public reference data. No auth. */
const router = Router()

router.get('/config', (_req: Request, res: Response) =>
  ApiResponse.ok(res, {
    price: { amountCents: env.REPORT_PRICE_CENTS, currencies: { CA: 'CAD', US: 'USD' }, taxNote: 'plus applicable tax' },
    payments: { mode: env.PAYMENTS_MODE, bypass: env.PAYMENT_BYPASS_ENABLED, appleProductId: env.APPLE_IAP_PRODUCT_ID, googleProductId: env.GOOGLE_IAP_PRODUCT_ID },
    ai: { mode: env.AI_MODE, promptVersion: PROMPT_VERSION },
    rules: { version: RULES_VERSION, lastUpdated: RULES_LAST_UPDATED, regionData: REGION_DATA_META },
    retention: { documentsDays: env.RETENTION_DOCS_DAYS, reportMonths: env.RETENTION_REPORT_MONTHS },
    uploads: { maxMb: env.MAX_UPLOAD_MB, types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'], kinds: ['letter', 'contract'] },
    notCovered: { CA: CA_NOT_COVERED },
  }),
)

router.get('/jurisdictions', (req: Request, res: Response) => {
  const c = String(req.query.country || '').toUpperCase()
  return ApiResponse.ok(res, listJurisdictions(c === 'CA' || c === 'US' ? c : undefined))
})

router.get('/jurisdictions/:code', (req: Request, res: Response) => {
  const code = normalizeCode(req.params.code)
  const j = code ? buildJurisdiction(code) : null
  if (!j) throw ApiError.notFound('jurisdiction_not_covered')
  const rule = getRule(code!)
  return ApiResponse.ok(res, {
    jurisdiction: j,
    engine: { terminationTable: rule.terminationTable || null, severance: rule.severance || null, note: rule.note, status: rule.status },
    regionPage: regionPage(code!),
  })
})

router.post('/rules/estimate', validate({ body: V.estimateSchema }), h(async (req: Request, res: Response) =>
  ApiResponse.ok(res, computeFreeResult(req.body.country, req.body.answers)),
))

export default router
