'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AppleSignInButtonProps {
  onError?: (error: string) => void
  disabled?: boolean
  text?: string
}

export default function AppleSignInButton({
  onError,
  disabled = false,
  text = 'Continue with Apple',
}: AppleSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleAppleSignIn = async () => {
    setLoading(true)

    try {
      // Must use createClient (createBrowserClient) so @supabase/ssr writes the PKCE code-verifier cookie
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        onError?.(error.message)
        setLoading(false)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        onError?.(err.message)
      } else {
        onError?.('An unexpected error occurred while initiating Apple sign-in.')
      }
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAppleSignIn}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-900 bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 shrink-0 fill-current"
          viewBox="0 0 170 170"
          aria-hidden="true"
        >
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.85-12.04-14.3-6.04-8.99-10.8-19.16-14.29-30.5-3.48-11.34-5.23-22.3-5.23-32.88 0-14.3 3.58-26.15 10.74-35.56 7.16-9.41 16.27-14.21 27.32-14.42 4.8 0 10.15 1.25 16.06 3.74 5.91 2.49 9.87 3.79 11.89 3.89 1.63 0 5.8-1.39 12.5-4.17 6.7-2.78 12.28-4.04 16.74-3.79 12.87.66 22.95 5.37 30.24 14.13-11.23 6.82-16.69 16.33-16.37 28.53.33 9.77 4.16 17.84 11.49 24.2 7.33 6.36 15.93 10.02 25.8 10.98-2.18 6.75-4.8 13.59-7.85 20.52zM119.22 33.72c0-7.39 2.65-14.34 7.96-20.85 5.3-6.51 11.89-10.77 19.76-12.77 0 .54.05 1.14.16 1.8.11.65.16 1.25.16 1.8 0 7.39-2.73 14.45-8.2 21.17-5.46 6.72-12.18 10.84-20.15 12.35-.43-1.19-.69-2.36-.69-3.5z" />
        </svg>
      )}
      <span>{loading ? 'Connecting to Apple...' : text}</span>
    </button>
  )
}
