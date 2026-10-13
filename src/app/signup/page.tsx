import type { Metadata } from 'next'
import Navbar from '@/components/ui/Navbar'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Sign Up — Fairexit',
  description: 'Create a new Fairexit account.',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <SignupForm />
      </main>
    </div>
  )
}
