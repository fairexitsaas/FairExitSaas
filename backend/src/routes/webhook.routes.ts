import express, { Router, Request, Response } from 'express'
import { asyncHandler as h } from '../utils/asyncHandler'
import { paymentService } from '../services/payment.service'

/**
 * Mounted in app.ts BEFORE express.json(), because Stripe signs the raw body.
 * Stripe dashboard -> Webhooks -> endpoint: https://<api>/api/v1/webhooks/stripe
 * Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 *         payment_intent.succeeded, charge.refunded
 */
const router = Router()
router.post('/stripe', express.raw({ type: '*/*', limit: '1mb' }), h(async (req: Request, res: Response) => {
  const evt = paymentService.verifyStripeSignature(req.body as Buffer, req.headers['stripe-signature'] as string | undefined)
  await paymentService.handleStripeEvent(evt)
  res.json({ received: true })
}))
export default router
