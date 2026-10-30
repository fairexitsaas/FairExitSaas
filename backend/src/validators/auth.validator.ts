import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().trim().optional(),
  country: z.enum(['CA', 'US']).optional(),
  redirectTo: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  token: z.string().min(4, 'Verification code/token is required'),
  type: z.enum(['signup', 'recovery', 'invite', 'magiclink', 'email_change', 'email']).default('signup'),
})

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  type: z.enum(['signup', 'email_change']).default('signup'),
  redirectTo: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  redirectTo: z.string().optional(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const updatePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const nativeOAuthSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  nonce: z.string().optional(),
  accessToken: z.string().optional(),
})

export const exchangeCodeSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
})

export const oauthUrlQuerySchema = z.object({
  redirectTo: z.string().optional(),
  scopes: z.string().optional(),
})

