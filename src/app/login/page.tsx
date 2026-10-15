import { Suspense } from 'react'
import type { Metadata } from 'next'
import Navbar from '@/components/ui/Navbar'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Log In — Fairexit',
  description: 'Log in to your Fairexit account.',
}

export default function LoginPage() {
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
