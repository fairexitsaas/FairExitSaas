import { Request, Response } from 'express'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { db } from '../config/db'
import { caseService } from '../services/case.service'
import { logger } from '../utils/logger'
import { documentService } from '../services/document.service'
import { flowService } from '../services/flow.service'
import { paymentService } from '../services/payment.service'
import { iapService } from '../services/iap.service'
import { leadService } from '../services/lead.service'
import { computeFreeResult } from '../fairexit/freeCheck'
import { buildJurisdiction, codeFromAnswers } from '../fairexit/jurisdictions'
import type { CaseRow, Platform } from '../fairexit/types'

const C = (req: Request): CaseRow => {
  if (!req.caseRow) throw ApiError.internal('caseAccess middleware missing')
  return req.caseRow
}

async function fullView(c: CaseRow) {
  const docs = await caseService.documents(c.id)
  return { ...caseService.view(c, docs), lawyerRequest: await leadService.forCase(c.id) }
}

export const caseController = {
  // ---------------------------------------------------------------- free check
  create: async (req: Request, res: Response) => {
    const { country, answers, platform, industry } = req.body
    logger.info('[FREE_CHECK][COMPLETED] Free questions finished. All user answers for free report:', { country, answers, platform, industry })
    const { row, token } = await caseService.create({ country, answers, platform: (req.headers['x-platform'] as Platform) || platform, industry, userId: req.user?.id || null })
    return ApiResponse.created(res, { caseId: row.id, caseToken: token, case: caseService.view(row, []) }, 'Free check saved. Keep caseToken: it is the only way to reopen this case without an account.')
  },

  get: async (req: Request, res: Response) => ApiResponse.ok(res, await fullView(C(req))),

  updateAnswers: async (req: Request, res: Response) => {
    const c = C(req)
    if (c.call_a) throw ApiError.conflict('After your documents are read, change answers on the check page instead')
    const answers = { ...c.answers, ...req.body.answers }
    const code = codeFromAnswers(c.country, answers)
    const jurisdiction = code ? buildJurisdiction(code) : null
    if (!jurisdiction) throw ApiError.unprocessable('jurisdiction_not_covered')
    const updated = await caseService.update(c.id, { answers, jurisdiction_code: code, jurisdiction, covered: !!jurisdiction, free_result: computeFreeResult(c.country, answers) })
    return ApiResponse.ok(res, await fullView(updated), 'Answers updated')
  },

  claim: async (req: Request, res: Response) => {
    const c = C(req)
    if (!req.user) throw ApiError.unauthorized('Sign in to save this report to your account')
    if (c.user_id && c.user_id !== req.user.id) throw ApiError.conflict('This report is saved to another account')
    const updated = await caseService.update(c.id, { user_id: req.user.id })
    return ApiResponse.ok(res, await fullView(updated), 'Saved to your account')
  },

  remove: async (req: Request, res: Response) => {
    const c = C(req)
    await documentService.purge(c.id)
    if (c.report_pdf_path) await db().storage.from(env.REPORTS_BUCKET).remove([c.report_pdf_path])
    await db().from('leads').delete().eq('case_id', c.id)
    await db().from('cases').delete().eq('id', c.id)
    return ApiResponse.ok(res, { deleted: true }, 'Your data for this report was deleted')
  },

  // ---------------------------------------------------------------- payment
  price: async (req: Request, res: Response) => ApiResponse.ok(res, { ...paymentService.price(C(req)), mode: env.PAYMENTS_MODE, iap: { appleProductId: env.APPLE_IAP_PRODUCT_ID, googleProductId: env.GOOGLE_IAP_PRODUCT_ID } }),

  prepareCheckout: async (req: Request, res: Response) => {
    const updated = await paymentService.prepare(C(req), req.body)
    return ApiResponse.ok(res, { ...(await fullView(updated)), price: paymentService.price(updated) }, 'Checkout details saved')
  },

  stripeCheckout: async (req: Request, res: Response) => {
    let c = C(req)
    if (req.body.email) c = await paymentService.prepare(c, { email: req.body.email, remind: req.body.remind, termsAccepted: req.body.termsAccepted === true })
    if (!c.email) throw ApiError.unprocessable('Add your email first (POST /checkout/prepare or send email + termsAccepted here)')
    if (req.body.mode === 'payment_intent') return ApiResponse.ok(res, await paymentService.stripePaymentIntent(c))
    const base = env.APP_WEB_URL.replace(/\/$/, '')
    return ApiResponse.ok(res, await paymentService.stripeCheckout(c, {
      successUrl: req.body.successUrl || `${base}/report/${c.id}/paid`,
      cancelUrl: req.body.cancelUrl || `${base}/report/${c.id}/checkout`,
    }))
  },

  stripeConfirm: async (req: Request, res: Response) => {
    const r = await paymentService.confirmStripe(C(req), req.body)
    const fresh = await caseService.get(C(req).id)
    return ApiResponse.ok(res, { paid: r.paid, case: await fullView(fresh) })
  },

  appleIap: async (req: Request, res: Response) => {
    const c = C(req)
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    const v = await iapService.verifyApple(req.body.transactionId)
    await paymentService.markPaid(c.id, 'apple', v.ref, v.amountCents, v.currency, v.raw)
    return ApiResponse.ok(res, { paid: true, finishTransaction: true, case: await fullView(await caseService.get(c.id)) })
  },

  googleIap: async (req: Request, res: Response) => {
    const c = C(req)
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    const v = await iapService.verifyGoogle(req.body.purchaseToken, req.body.productId)
    await paymentService.markPaid(c.id, 'google', v.ref, v.amountCents, v.currency, v.raw)
    return ApiResponse.ok(res, { paid: true, consumePurchase: true, case: await fullView(await caseService.get(c.id)) })
  },

  mockPay: async (req: Request, res: Response) => {
    if (env.PAYMENTS_MODE !== 'mock' || env.NODE_ENV === 'production') throw ApiError.forbidden('Mock payments are off')
    const c = C(req)
    if (!c.covered) throw ApiError.badRequest('jurisdiction_not_covered')
    await paymentService.markPaid(c.id, 'mock', `mock_${c.id}`, env.REPORT_PRICE_CENTS, c.country === 'US' ? 'USD' : 'CAD')
    return ApiResponse.ok(res, { paid: true, case: await fullView(await caseService.get(c.id)) }, 'Marked as paid (mock)')
  },

  // ---------------------------------------------------------------- documents
  listDocs: async (req: Request, res: Response) => ApiResponse.ok(res, await documentService.list(C(req))),
  uploadSlot: async (req: Request, res: Response) => ApiResponse.created(res, await documentService.createUploadSlot(C(req), req.body), 'PUT the file to upload.url, then call /complete'),
  completeUpload: async (req: Request, res: Response) => ApiResponse.ok(res, { document: await documentService.complete(C(req), req.params.docId), ...(await documentService.list(await caseService.get(C(req).id))) }),
  uploadBase64: async (req: Request, res: Response) => ApiResponse.created(res, { document: await documentService.uploadBase64(C(req), req.body), ...(await documentService.list(await caseService.get(C(req).id))) }),
  updateDocKind: async (req: Request, res: Response) => {
    const doc = await documentService.updateKind(C(req), req.params.docId, req.body.kind)
    return ApiResponse.ok(res, { document: doc, ...(await documentService.list(await caseService.get(C(req).id))) }, 'Updated')
  },
  removeDoc: async (req: Request, res: Response) => {
    await documentService.remove(C(req), req.params.docId)
    return ApiResponse.ok(res, await documentService.list(await caseService.get(C(req).id)), 'Removed')
  },
  setContractStatus: async (req: Request, res: Response) => {
    const updated = await documentService.setContractStatus(C(req), req.body.status)
    return ApiResponse.ok(res, await fullView(updated), req.body.status === 'never' ? 'Noted. Your report will explain what having no contract means.' : 'Noted. Your report will be marked "contract not added".')
  },

  // ---------------------------------------------------------------- AI read
  startRead: async (req: Request, res: Response) => {
    const r = await flowService.startRead(C(req), req.id)
    const statusCode = r.status === 'checking' ? 200 : 202
    return res.status(statusCode).json({ success: true, statusCode, message: r.status === 'checking' ? 'Documents read successfully' : 'Reading your documents', data: r })
  },
  readStatus: async (req: Request, res: Response) => ApiResponse.ok(res, flowService.readStatus(C(req))),

  // ---------------------------------------------------------------- check page
  check: async (req: Request, res: Response) => ApiResponse.ok(res, flowService.checkModel(C(req))),
  rowAction: async (req: Request, res: Response) => ApiResponse.ok(res, await flowService.rowAction(C(req), req.params.key, req.body)),
  conflict: async (req: Request, res: Response) => ApiResponse.ok(res, await flowService.resolveConflict(C(req), req.params.key, req.body)),
  attest: async (req: Request, res: Response) => ApiResponse.ok(res, await flowService.attest(C(req), req.body.agreed === true)),
  changeJurisdiction: async (req: Request, res: Response) => ApiResponse.ok(res, await flowService.changeJurisdiction(C(req), req.body.country, req.body.region), 'Jurisdiction updated successfully'),

  // ---------------------------------------------------------------- report
  startBuild: async (req: Request, res: Response) => {
    const r = await flowService.startBuild(C(req), req.id)
    const statusCode = r.status === 'ready' ? 200 : 202
    return res.status(statusCode).json({ success: true, statusCode, message: r.started ? 'Building your report' : r.status === 'ready' ? 'Report is already ready' : 'Report is already processing', data: r })
  },
  reportStatus: async (req: Request, res: Response) => {
    const c = C(req)
    const status = flowService.reportStatus(c)
    logger.info('[STATUS][POLL]', { requestId: req.id, caseId: c.id, reportId: status.reportId, generationId: status.generationId, status: status.status, stage: status.stage })
    return ApiResponse.ok(res, status)
  },
  report: async (req: Request, res: Response) => ApiResponse.ok(res, flowService.report(C(req))),
  reportHtml: async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:")
    res.send(flowService.html(C(req)))
  },
  reportPdf: async (req: Request, res: Response) => {
    const c = C(req)
    const buf = await flowService.pdf(c, req.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.download === '0' ? 'inline' : 'attachment'}; filename="FairExit-Severance-Report-${c.report_id}.pdf"`)
    res.send(buf)
  },
  reportInputs: async (req: Request, res: Response) => {
    if (req.caseAccessVia !== 'admin') throw ApiError.forbidden('Admins only')
    return ApiResponse.ok(res, C(req).report_inputs)
  },

  // ---------------------------------------------------------------- deadlines / reminders / devices
  deadlines: async (req: Request, res: Response) => ApiResponse.ok(res, flowService.deadlines(C(req))),
  reminders: async (req: Request, res: Response) => {
    const c = await caseService.update(C(req).id, { remind: !!req.body.email })
    return ApiResponse.ok(res, flowService.deadlines(c), 'Reminder setting saved')
  },
  registerDevice: async (req: Request, res: Response) => {
    const c = C(req)
    const { error } = await db().from('devices').upsert({ case_id: c.id, user_id: req.user?.id || null, platform: req.body.platform, push_token: req.body.pushToken }, { onConflict: 'push_token' })
    if (error) throw ApiError.internal(error.message)
    return ApiResponse.ok(res, { registered: true })
  },
}
