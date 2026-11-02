import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabase'
import { ApiError } from '../utils/ApiError'

/**
 * FairExit tables have RLS on with no policies, so only the service-role client can use them.
 * Every FairExit service goes through this.
 */
export function db(): SupabaseClient {
  if (!supabaseAdmin) {
    throw ApiError.internal('SUPABASE_SERVICE_ROLE_KEY is not set. The FairExit case API needs it (backend only, never ship it to clients).')
  }
  return supabaseAdmin
}

/** Throws a clean ApiError for a Supabase/PostgREST error. */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) {
    if (res.error.code === 'PGRST116') throw ApiError.notFound(`${what} not found`)
    throw new ApiError(500, `Database error (${what}): ${res.error.message}`, undefined, false)
  }
  return res.data
}
