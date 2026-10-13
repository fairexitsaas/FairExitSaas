import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  // Prevent open redirect attacks by ensuring the destination is a safe relative path
  const isSafeRedirect = next.startsWith('/') && !next.startsWith('//')
  const safeRedirectTarget = isSafeRedirect ? next : '/dashboard'

  const authError = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth provider error responses (e.g. user cancelled prompt)
  if (errorDescription || authError) {
    const errorUrl = new URL('/login', requestUrl.origin)
    const displayMsg =
      errorDescription ||
      (authError === 'access_denied'
        ? 'Google sign-in was cancelled.'
        : authError) ||
      'Authentication failed'
    errorUrl.searchParams.set('error', displayMsg)
    return NextResponse.redirect(errorUrl)
  }

  if (code) {
    if (!isSupabaseConfigured()) {
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set(
        'error',
        'Authentication service is currently unavailable. Please try again.'
      )
      return NextResponse.redirect(errorUrl)
    }

    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'

        if (isLocalEnv) {
          return NextResponse.redirect(`${requestUrl.origin}${safeRedirectTarget}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${safeRedirectTarget}`)
        } else {
          return NextResponse.redirect(`${requestUrl.origin}${safeRedirectTarget}`)
        }
      }

      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set(
        'error',
        error.message || 'Unable to exchange authentication code.'
      )
      return NextResponse.redirect(errorUrl)
    } catch {
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set(
        'error',
        'Authentication callback failed. Please try logging in.'
      )
      return NextResponse.redirect(errorUrl)
    }
  }

  // If no auth code was provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
