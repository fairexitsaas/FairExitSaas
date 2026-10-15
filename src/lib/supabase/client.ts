import { createBrowserClient } from '@supabase/ssr'

const FALLBACK_URL = 'https://kvqxcidparapfarxdbzo.supabase.co'
const FALLBACK_KEY = 'sb_publishable_Q3vRwcgSoY0k_5JRLbPmFw_sX-YlXMq'

export function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim()
  }
  return FALLBACK_URL
}

export function getSupabaseKey(): string {
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (envKey && envKey.trim() !== '') {
    return envKey.trim()
  }
  return FALLBACK_KEY
}

export function isSupabaseConfigured(): boolean {
  return true
}

export function createClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseKey()

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
