import { User } from '@supabase/supabase-js'
import { getUserSupabaseClient } from '../config/supabase'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { env } from '../config/env'

export interface UpdateProfileInput {
  fullName?: string
  avatarUrl?: string
  phone?: string
  country?: 'CA' | 'US'
  preferences?: Record<string, unknown>
}

export class UserService {
  /**
   * Fetch currently authenticated user's profile and database details
   */
  async getProfile(user: User, accessToken: string) {
    const userClient = getUserSupabaseClient(accessToken)

    let dbProfile: Record<string, unknown> | null = null

    try {
      const { data, error } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && data) {
        dbProfile = data
      }
    } catch (err) {
      logger.warn('Could not query profiles table', {
        userId: user.id,
        error: err instanceof Error ? err.message : err,
      })
    }

    return {
      id: user.id,
      email: user.email,
      emailConfirmed: !!user.email_confirmed_at,
      phone: user.phone || dbProfile?.phone || user.user_metadata?.phone || null,
      fullName:
        dbProfile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '',
      avatarUrl:
        dbProfile?.avatar_url ||
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null,
      country:
        dbProfile?.country ||
        user.user_metadata?.country ||
        'US',
      role:
        (dbProfile?.role as string) ||
        (user.app_metadata?.role as string)?.toUpperCase() ||
        (user.user_metadata?.role as string)?.toUpperCase() ||
        'USER',
      preferences: dbProfile?.preferences || user.user_metadata?.preferences || {},
      createdAt: user.created_at,
      updatedAt: dbProfile?.updated_at || user.updated_at || user.created_at,
    }
  }

  /**
   * Update user profile information securely
   */
  async updateProfile(user: User, accessToken: string, input: UpdateProfileInput) {
    const userClient = getUserSupabaseClient(accessToken)

    // Prepare metadata for Supabase Auth
    const metadataUpdates: Record<string, unknown> = {}
    if (input.fullName !== undefined) metadataUpdates.full_name = input.fullName
    if (input.avatarUrl !== undefined) metadataUpdates.avatar_url = input.avatarUrl
    if (input.phone !== undefined) metadataUpdates.phone = input.phone
    if (input.country !== undefined) metadataUpdates.country = input.country
    if (input.preferences !== undefined) metadataUpdates.preferences = input.preferences

    // 1. Update Auth user metadata
    const { error: authError } = await userClient.auth.updateUser({
      data: metadataUpdates,
    })

    if (authError) {
      throw ApiError.badRequest(authError.message)
    }

    // 2. Try to update or upsert profiles database table
    let dbUpdated = false
    try {
      const { error: dbError } = await userClient.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: input.fullName ?? user.user_metadata?.full_name ?? '',
        avatar_url: input.avatarUrl ?? user.user_metadata?.avatar_url ?? null,
        phone: input.phone ?? user.user_metadata?.phone ?? null,
        country: input.country ?? user.user_metadata?.country ?? 'US',
        preferences: input.preferences ?? user.user_metadata?.preferences ?? {},
        updated_at: new Date().toISOString(),
      })

      if (!dbError) {
        dbUpdated = true
      } else {
        logger.warn('profiles upsert skipped or errored', { error: dbError.message })
      }
    } catch (err) {
      logger.warn('Failed to upsert to profiles table', {
        userId: user.id,
        error: err instanceof Error ? err.message : err,
      })
    }

    return {
      id: user.id,
      email: user.email,
      fullName: input.fullName ?? user.user_metadata?.full_name,
      avatarUrl: input.avatarUrl ?? user.user_metadata?.avatar_url,
      phone: input.phone ?? user.user_metadata?.phone,
      country: input.country ?? user.user_metadata?.country,
      preferences: input.preferences ?? user.user_metadata?.preferences,
      dbUpdated,
    }
  }

  /**
   * Update user email (triggers verification email to new address)
   */
  async updateEmail(
    user: User,
    accessToken: string,
    newEmail: string,
    emailRedirectTo?: string
  ) {
    if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
      throw ApiError.badRequest('New email must be different from current email')
    }

    const userClient = getUserSupabaseClient(accessToken)
    const safeRedirect = emailRedirectTo || `${env.FRONTEND_URL}/auth/callback`

    const { data, error } = await userClient.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: safeRedirect }
    )

    if (error) {
      throw ApiError.badRequest(error.message)
    }

    return {
      success: true,
      message: 'Confirmation email sent to the new email address.',
      newEmail: data.user.new_email || newEmail,
    }
  }
}

export const userService = new UserService()

