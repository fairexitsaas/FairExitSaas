import { Router } from 'express'
import { caseController as cc } from '../controllers/case.controller'
import { optionalAuthenticate, caseAccess } from '../middleware/caseAccess'
import { validate } from '../middleware/validate'
import { asyncHandler as h } from '../utils/asyncHandler'
import * as V from '../validators/fairexit.validator'

/**
 * /api/v1/cases — one person's journey: free check -> pay -> upload -> read -> check -> report.
 * Every route under /:caseId needs X-Case-Token (or the owner's / an admin's Bearer token).
 */
const router = Router()
router.use(optionalAuthenticate)

router.post('/', validate({ body: V.createCaseSchema }), h(cc.create))

const one = Router({ mergeParams: true })
router.use('/:caseId', validate({ params: V.caseParams }), caseAccess, one)

one.get('/', h(cc.get))
one.patch('/answers', validate({ body: V.patchAnswersSchema }), h(cc.updateAnswers))
one.post('/claim', h(cc.claim))
one.delete('/', h(cc.remove))

// payment
one.get('/price', h(cc.price))
one.post('/checkout/prepare', validate({ body: V.checkoutPrepareSchema }), h(cc.prepareCheckout))
one.post('/checkout/stripe', validate({ body: V.stripeCheckoutSchema }), h(cc.stripeCheckout))
one.post('/checkout/stripe/confirm', validate({ body: V.stripeConfirmSchema }), h(cc.stripeConfirm))
one.post('/checkout/apple', validate({ body: V.appleIapSchema }), h(cc.appleIap))
one.post('/checkout/google', validate({ body: V.googleIapSchema }), h(cc.googleIap))
one.post('/checkout/mock', h(cc.mockPay))

// documents (only two: letter and contract; a scan may have several pages)
one.get('/documents', h(cc.listDocs))
one.post('/documents/upload-url', validate({ body: V.uploadSlotSchema }), h(cc.uploadSlot))
one.post('/documents/:docId/complete', validate({ params: V.docParams }), h(cc.completeUpload))
one.post('/documents', validate({ body: V.uploadBase64Schema }), h(cc.uploadBase64))
one.patch('/documents/:docId', validate({ params: V.docParams, body: V.updateDocSchema }), h(cc.updateDocKind))
one.delete('/documents/:docId', validate({ params: V.docParams }), h(cc.removeDoc))
one.put('/contract-status', validate({ body: V.contractStatusSchema }), h(cc.setContractStatus))

// AI reads the documents (Call A)
one.post('/read', h(cc.startRead))
one.get('/read', h(cc.readStatus))

// check page (step 8) + second look (Call A2)
one.get('/check', h(cc.check))
one.post('/check/rows/:key', validate({ params: V.rowParams, body: V.rowActionSchema }), h(cc.rowAction))
one.post('/check/conflicts/:key', validate({ params: V.rowParams, body: V.conflictSchema }), h(cc.conflict))
one.post('/check/attest', validate({ body: V.attestSchema }), h(cc.attest))
one.post('/check/jurisdiction', validate({ body: V.changeJurisdictionSchema }), h(cc.changeJurisdiction))
one.put('/jurisdiction', validate({ body: V.changeJurisdictionSchema }), h(cc.changeJurisdiction))

// report (Call B)
one.post('/report', h(cc.startBuild))
one.get('/report/status', h(cc.reportStatus))
one.get('/report', h(cc.report))
one.get('/report/html', h(cc.reportHtml))
one.get('/report/pdf', h(cc.reportPdf))
one.get('/report/inputs', h(cc.reportInputs))

// deadlines, reminders, push
one.get('/deadlines', h(cc.deadlines))
one.put('/reminders', validate({ body: V.remindersSchema }), h(cc.reminders))
one.post('/devices', validate({ body: V.deviceSchema }), h(cc.registerDevice))

export default router
