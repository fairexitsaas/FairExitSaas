import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export const metadata: Metadata = {
  title: 'Dashboard — Fairexit',
  description: 'Your Fairexit authenticated dashboard.',
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect('/login')
  }

  let user = null
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      redirect('/login')
    }
    user = authUser
  } catch {
    redirect('/login')
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'
  const email = user.email || 'No email associated'
  const isEmailConfirmed = Boolean(user.email_confirmed_at)
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Dashboard Top Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-base shadow-sm transition-transform group-hover:scale-105">
              FE
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fairexit
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {fullName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {email}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome, {fullName}! 👋
          </h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            You are securely authenticated via Supabase SSR Auth.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* User Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                User Information
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-400">
                Authenticated
              </span>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {fullName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {email}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Account Created
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {createdAt}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Verification
                </dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      isEmailConfirmed ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {isEmailConfirmed ? 'Verified' : 'Pending verification'}
                  </span>
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User ID (UUID)
                </dt>
                <dd className="mt-1 rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {user.id}
                </dd>
              </div>
            </dl>
          </div>

          {/* Security & System Info Card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Session & Security
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Server Validation</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Active (SSR)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Cookie Security</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    HttpOnly / PKCE
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Route Protection</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    Middleware + Server
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
