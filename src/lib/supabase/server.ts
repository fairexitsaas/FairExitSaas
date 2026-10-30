import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FALLBACK_URL = 'https://kvqxcidparapfarxdbzo.supabase.co'
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXhjaWRwYXJhcGZhcnhkYnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTMwMzAsImV4cCI6MjEwNzM2OTAzMH0.r7gJ0cMlEjygr1N1v2ABPSpieRjgD3ATk0PUEkQGXSc'

export function getSupabaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim()
  }
  return FALLBACK_URL
}

export function getSupabaseKey(): string {
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  if (envKey && envKey.trim() !== '') {
    return envKey.trim()
  }
  return FALLBACK_KEY
}

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseKey()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be safely ignored when middleware handles refreshing sessions.
        }
      },
    },
  })
}
