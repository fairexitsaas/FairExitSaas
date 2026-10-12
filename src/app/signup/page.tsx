import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import SignupForm from '@/components/auth/SignupForm'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/client'

export const metadata: Metadata = {
  title: 'Sign Up — Fairexit',
  description: 'Create a new Fairexit account.',
}

export default async function SignupPage() {
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
      // Allow rendering the signup page on error
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SignupForm />
      </main>
    </div>
  )
}
