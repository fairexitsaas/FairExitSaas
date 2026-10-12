'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const isConfigured = isSupabaseConfigured()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-base shadow-sm transition-transform group-hover:scale-105">
            FE
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fairexit
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
