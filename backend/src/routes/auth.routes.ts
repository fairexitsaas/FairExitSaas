import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { authRateLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../utils/asyncHandler'
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
  nativeOAuthSchema,
  oauthUrlQuerySchema,
  exchangeCodeSchema,
} from '../validators/auth.validator'

const router = Router()

// Public auth endpoints
router.post(
  '/signup',
  authRateLimiter,
  validate({ body: signupSchema }),
  asyncHandler(authController.signup)
)

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login)
)

router.post(
  '/refresh-token',
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.refreshToken)
)

// OAuth URL generation
router.get(
  '/oauth/google',
  validate({ query: oauthUrlQuerySchema }),
  asyncHandler(authController.getGoogleOAuthUrl)
)

router.get(
  '/oauth/apple',
  validate({ query: oauthUrlQuerySchema }),
  asyncHandler(authController.getAppleOAuthUrl)
)

// OAuth Code Exchange (for Web callback & Mobile deep links)
router.post(
  '/oauth/callback',
  validate({ body: exchangeCodeSchema }),
  asyncHandler(authController.exchangeCode)
)

// Native mobile ID Token exchange (iOS/Android)
router.post(
  '/oauth/google/native',
  authRateLimiter,
  validate({ body: nativeOAuthSchema }),
  asyncHandler(authController.nativeGoogleSignIn)
)

router.post(
  '/oauth/apple/native',
  authRateLimiter,
  validate({ body: nativeOAuthSchema }),
  asyncHandler(authController.nativeAppleSignIn)
)

// Email verification & password recovery
router.post(
  '/verify-email',
  authRateLimiter,
  validate({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyEmail)
)

router.post(
  '/resend-verification',
  authRateLimiter,
  validate({ body: resendVerificationSchema }),
  asyncHandler(authController.resendVerification)
)

router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword)
)

// Protected auth endpoints
router.post(
  '/logout',
  authenticate,
  asyncHandler(authController.logout)
)

router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getMe)
)

router.put(
  '/update-password',
  authenticate,
  authRateLimiter,
  validate({ body: updatePasswordSchema }),
  asyncHandler(authController.updatePassword)
)

export default router

