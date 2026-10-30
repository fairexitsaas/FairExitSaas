import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'
import { logger } from '../utils/logger'

// Default client using publishable/anon key
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

// Privileged service-role client (only if key provided)
export const supabaseAdmin: SupabaseClient | null = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

/**
 * Creates a scoped Supabase client that carries the user's JWT token
 * ensuring Row-Level Security (RLS) is applied on behalf of that user.
 */
export function getUserSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

/**
 * Health check helper for Supabase connection
 */
export async function checkSupabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    // Attempt a lightweight fetch against Supabase auth settings or public schema
    const { error } = await supabase.auth.getSession()
    const latencyMs = Date.now() - start
    if (error) {
      return { healthy: false, latencyMs, error: error.message }
    }
    return { healthy: true, latencyMs }
  } catch (err: unknown) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Unknown Supabase connection error'
    logger.error('Supabase health check failed', { message, latencyMs })
    return { healthy: false, latencyMs, error: message }
  }
}

