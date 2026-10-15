import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

export const metadata: Metadata = {
  title: 'Fairexit — Modern Next.js & Supabase Authentication',
  description:
    'Production-ready Next.js application template with official Supabase SSR authentication.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Next.js 16 + Supabase SSR Auth
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              Secure authentication for <span className="text-indigo-600">modern web apps</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Fairexit is a production-ready Next.js application equipped with official Supabase SSR
              authentication, automatic cookie refresh, server-level route guards, and type safety.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 transition-all"
              >
                Create Account
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Highlights Section */}
        <div className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold">
                  SSR
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  Server-Side Authentication
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Leveraging <code className="font-mono text-xs">@supabase/ssr</code> with secure cookie handling,
                  token validation via <code className="font-mono text-xs">getUser()</code>, and PKCE exchange flows.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                  🔒
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  Route Protection
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Middleware session synchronization and server-component route validation prevent unauthorized access to dashboards.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 font-bold">
                  ⚡
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  Tailwind & TypeScript
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Built on Next.js App Router with TypeScript and Tailwind CSS for accessible, responsive, and maintainable styling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8 text-sm text-slate-500 dark:text-slate-400">
          <p>© 2026 Fairexit. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white">
              Log In
            </Link>
            <Link href="/signup" className="hover:text-slate-900 dark:hover:text-white">
              Sign Up
            </Link>
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
