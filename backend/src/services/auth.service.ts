import { supabase, supabaseAdmin, getUserSupabaseClient } from '../config/supabase'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export interface SignupInput {
  email: string
  password: string
  fullName?: string
  phone?: string
  country?: 'CA' | 'US'
  redirectTo?: string
}

export class AuthService {
  /**
   * Register a new user with email and password
   */
  async signUp(input: SignupInput) {
    const { email, password, fullName, phone, country, redirectTo } = input

    // Securely validate redirect URL if provided
    const emailRedirectTo = redirectTo
      ? this.validateRedirectUrl(redirectTo)
      : `${env.FRONTEND_URL}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName || '',
          phone: phone || '',
          country: country || 'US',
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        throw ApiError.conflict('An account with this email address already exists')
      }
      throw ApiError.badRequest(error.message)
    }

    if (!data.user) {
      throw ApiError.internal('Failed to create user account')
    }

    // Try to create profile row in database if session or service role is available
    if (data.session?.access_token) {
      try {
        const userClient = getUserSupabaseClient(data.session.access_token)
        await userClient.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
          phone: phone || '',
          country: country || 'US',
          role: 'USER',
          updated_at: new Date().toISOString(),
        })
      } catch (profileErr) {
        // Non-fatal if table doesn't exist yet or trigger handles it
        logger.warn('Failed to upsert profile record directly during signup', {
          userId: data.user.id,
          error: profileErr instanceof Error ? profileErr.message : profileErr,
        })
      }
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        metadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in,
            tokenType: data.session.token_type,
          }
        : null,
      requiresEmailVerification: !data.session,
    }
  }

  /**
   * Log in an existing user with email and password
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw ApiError.unauthorized('Invalid email or password')
      }
      if (error.message.includes('Email not confirmed')) {
        throw ApiError.forbidden('Email address is not confirmed. Please check your inbox.')
      }
      throw ApiError.badRequest(error.message)
    }

    if (!data.session || !data.user) {
      throw ApiError.unauthorized('Authentication failed')
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        metadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        tokenType: data.session.token_type,
      },
    }
  }

  /**
   * Refresh session tokens using a valid refresh token
   */
  async refreshToken(refreshToken: string) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session) {
      throw ApiError.unauthorized(error?.message || 'Invalid or expired refresh token')
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    }
  }

  /**
   * Sign out current session
   */
  async signOut(accessToken: string) {
    const userClient = getUserSupabaseClient(accessToken)
    const { error } = await userClient.auth.signOut()

    if (error) {
      logger.warn('Error during Supabase signout', { error: error.message })
    }

    return { success: true }
  }

  /**
   * Generate OAuth URL for Google or Apple
   */
  async getOAuthUrl(
    provider: 'google' | 'apple',
    redirectTo?: string,
    scopes?: string
  ) {
    const safeRedirect = redirectTo
      ? this.validateRedirectUrl(redirectTo)
      : `${env.FRONTEND_URL}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: safeRedirect,
        scopes: scopes || undefined,
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) {
      throw ApiError.badRequest(error?.message || `Failed to initiate ${provider} OAuth`)
    }

    return {
      provider,
      url: data.url,
      redirectTo: safeRedirect,
    }
  }

  /**
   * Exchange OAuth code for session (used by web / mobile deep links after OAuth redirect)
   */
  async exchangeCodeForSession(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.session || !data.user) {
      throw ApiError.unauthorized(
        error?.message || 'Failed to exchange authorization code for session'
      )
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        metadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        tokenType: data.session.token_type,
      },
    }
  }

  /**
   * Exchange native mobile ID token (Google Sign-In / Apple Sign-In on iOS/Android)
   */
  async signInWithNativeIdToken(
    provider: 'google' | 'apple',
    idToken: string,
    nonce?: string,
    accessToken?: string
  ) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider,
      token: idToken,
      nonce: nonce || undefined,
      access_token: accessToken || undefined,
    })

    if (error || !data.session || !data.user) {
      throw ApiError.unauthorized(
        error?.message || `Failed to verify native ${provider} credentials`
      )
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        metadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        tokenType: data.session.token_type,
      },
    }
  }

  /**
   * Verify email or OTP token
   */
  async verifyOtp(
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change' | 'email' = 'signup'
  ) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type as any,
    })

    if (error) {
      throw ApiError.badRequest(error.message)
    }

    return {
      verified: true,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
          }
        : null,
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in,
          }
        : null,
    }
  }

  /**
   * Resend confirmation email
   */
  async resendVerification(
    email: string,
    type: 'signup' | 'email_change' = 'signup',
    redirectTo?: string
  ) {
    const emailRedirectTo = redirectTo
      ? this.validateRedirectUrl(redirectTo)
      : `${env.FRONTEND_URL}/auth/callback`

    const { error } = await supabase.auth.resend({
      type: type as any,
      email,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      throw ApiError.badRequest(error.message)
    }

    return { success: true, message: 'Verification email resent successfully' }
  }

  /**
   * Send password reset email
   */
  async forgotPassword(email: string, redirectTo?: string) {
    const safeRedirect = redirectTo
      ? this.validateRedirectUrl(redirectTo)
      : `${env.FRONTEND_URL}/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: safeRedirect,
    })

    if (error) {
      throw ApiError.badRequest(error.message)
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    }
  }

  /**
   * Update password for an authenticated user
   */
  async updatePassword(accessToken: string, newPassword: string) {
    const userClient = getUserSupabaseClient(accessToken)
    const { data, error } = await userClient.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw ApiError.badRequest(error.message)
    }

    return {
      success: true,
      message: 'Password updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }
  }

  /**
   * Validate redirect URL to prevent open redirect vulnerabilities
   */
  private validateRedirectUrl(url: string): string {
    try {
      const parsedUrl = new URL(url)
      // Must match approved frontend or domain
      const allowedOrigins = [new URL(env.FRONTEND_URL).origin, ...env.CORS_ORIGINS]
      if (allowedOrigins.includes(parsedUrl.origin)) {
        return url
      }
    } catch {
      // If relative URL starting with /
      if (url.startsWith('/') && !url.startsWith('//')) {
        return `${env.FRONTEND_URL}${url}`
      }
    }
    return `${env.FRONTEND_URL}/auth/callback`
  }
}

export const authService = new AuthService()

