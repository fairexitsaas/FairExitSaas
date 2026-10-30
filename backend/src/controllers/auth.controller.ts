import { Request, Response } from 'express'
import { authService } from '../services/auth.service'
import { ApiResponse } from '../utils/ApiResponse'
import { ApiError } from '../utils/ApiError'

export class AuthController {
  signup = async (req: Request, res: Response) => {
    const result = await authService.signUp(req.body)
    return ApiResponse.created(
      res,
      result,
      result.requiresEmailVerification
        ? 'Account registered successfully. Please verify your email.'
        : 'Account registered and authenticated successfully.'
    )
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    return ApiResponse.ok(res, result, 'Login successful')
  }

  refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body
    const result = await authService.refreshToken(refreshToken)
    return ApiResponse.ok(res, result, 'Session refreshed successfully')
  }

  logout = async (req: Request, res: Response) => {
    const token = req.token
    if (!token) {
      throw ApiError.unauthorized('No session to logout')
    }
    await authService.signOut(token)
    return ApiResponse.ok(res, { loggedOut: true }, 'Successfully logged out')
  }

  getGoogleOAuthUrl = async (req: Request, res: Response) => {
    const { redirectTo, scopes } = req.query as { redirectTo?: string; scopes?: string }
    const result = await authService.getOAuthUrl('google', redirectTo, scopes)
    return ApiResponse.ok(res, result, 'Google OAuth URL generated')
  }

  getAppleOAuthUrl = async (req: Request, res: Response) => {
    const { redirectTo, scopes } = req.query as { redirectTo?: string; scopes?: string }
    const result = await authService.getOAuthUrl('apple', redirectTo, scopes)
    return ApiResponse.ok(res, result, 'Apple OAuth URL generated')
  }

  exchangeCode = async (req: Request, res: Response) => {
    const code = (req.body.code || req.query.code) as string
    if (!code) {
      throw ApiError.badRequest('Authorization code is required')
    }
    const result = await authService.exchangeCodeForSession(code)
    return ApiResponse.ok(res, result, 'Authorization code exchanged successfully')
  }

  nativeGoogleSignIn = async (req: Request, res: Response) => {
    const { idToken, nonce, accessToken } = req.body
    const result = await authService.signInWithNativeIdToken('google', idToken, nonce, accessToken)
    return ApiResponse.ok(res, result, 'Google authentication successful')
  }

  nativeAppleSignIn = async (req: Request, res: Response) => {
    const { idToken, nonce } = req.body
    const result = await authService.signInWithNativeIdToken('apple', idToken, nonce)
    return ApiResponse.ok(res, result, 'Apple authentication successful')
  }

  verifyEmail = async (req: Request, res: Response) => {
    const { email, token, type } = req.body
    const result = await authService.verifyOtp(email, token, type)
    return ApiResponse.ok(res, result, 'Email verified successfully')
  }

  resendVerification = async (req: Request, res: Response) => {
    const { email, type, redirectTo } = req.body
    const result = await authService.resendVerification(email, type, redirectTo)
    return ApiResponse.ok(res, result, 'Verification email sent')
  }

  forgotPassword = async (req: Request, res: Response) => {
    const { email, redirectTo } = req.body
    const result = await authService.forgotPassword(email, redirectTo)
    return ApiResponse.ok(res, result, 'Password reset instructions sent')
  }

  updatePassword = async (req: Request, res: Response) => {
    const token = req.token
    if (!token) {
      throw ApiError.unauthorized('Authentication required to update password')
    }
    const { newPassword } = req.body
    const result = await authService.updatePassword(token, newPassword)
    return ApiResponse.ok(res, result, 'Password updated successfully')
  }

  getMe = async (req: Request, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated')
    }
    return ApiResponse.ok(
      res,
      {
        user: {
          id: req.user.id,
          email: req.user.email,
          emailConfirmed: !!req.user.email_confirmed_at,
          role:
            (req.user.app_metadata?.role as string) ||
            (req.user.user_metadata?.role as string) ||
            'user',
          metadata: req.user.user_metadata,
          createdAt: req.user.created_at,
        },
      },
      'Authenticated user fetched successfully'
    )
  }
}

export const authController = new AuthController()

