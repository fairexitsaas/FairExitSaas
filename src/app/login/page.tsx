import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import LoginForm from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export const metadata: Metadata = {
  title: 'Log In — Fairexit',
  description: 'Log in to your Fairexit account.',
}

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        redirect('/dashboard')
      }
    } catch {
      // Allow rendering the login page on session read error
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md h-96 animate-pulse rounded-2xl bg-white/50 dark:bg-slate-900/50" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
