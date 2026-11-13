'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminProvider, useAdmin } from './AdminContext'
import AdminSidebar from './AdminSidebar'
import AdminModals from './AdminModals'

function AdminMainContent({ children }: { children: React.ReactNode }) {
  const { authError, currentUserEmail, refreshData, signOut } = useAdmin()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial hydration, render children directly to guarantee matching HTML
  if (!mounted) {
    return (
      <main className="flex-1 p-4 sm:p-6 md:p-[26px_32px_60px] max-w-[1440px] w-full min-w-0 overflow-x-auto">
        {children}
      </main>
    )
  }

  if (authError === 'unauthorized') {
    return (
      <main className="flex-1 p-6 sm:p-12 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#e1dfd8] shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#062c55]/10 text-[#062c55] flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-extrabold text-[#062c55] mb-2">
            Operator Sign In Required
          </h2>
          <p className="text-sm text-[#5f7487] mb-6 leading-relaxed">
            The FairExit backoffice is restricted to authenticated operators. Please sign in with your administrative account to continue.
          </p>
          <Link
            href="/login?redirectTo=/admin/overview"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#062c55] hover:bg-[#083b70] text-white font-semibold text-sm transition-colors shadow-sm"
          >
            Sign in as Operator
          </Link>
        </div>
      </main>
    )
  }

  if (authError === 'forbidden') {
    return (
      <main className="flex-1 p-6 sm:p-12 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-[#f3d9d7] shadow-sm p-8 text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 text-xl">
            🛡️
          </div>
          <h2 className="text-xl font-extrabold text-[#062c55] mb-1">
            Operator Privileges Required
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block mb-3">
            Role: USER (Requires ADMIN)
          </p>
          <p className="text-sm text-[#5f7487] mb-4 leading-relaxed">
            You are signed in as <strong className="text-[#17242f] font-mono">{currentUserEmail || 'authenticated user'}</strong>, but this account does not have operator permissions. Access to leads, customer cases, and financial reporting is restricted.
          </p>

          <div className="bg-[#f6f4ef] rounded-xl p-4 border border-[#e1dfd8] mb-6 text-xs text-[#17242f]">
            <p className="font-bold text-[#062c55] mb-1">To elevate this account in development / production:</p>
            <code className="block bg-white p-2 rounded border border-[#e1dfd8] font-mono text-[11px] text-[#062c55] break-all select-all">
              npm --prefix backend run set-role -- {currentUserEmail || 'your-email@example.com'} ADMIN
            </code>
            <p className="text-[11px] text-[#5f7487] mt-1.5">
              Or run in Supabase SQL Editor: <code className="font-mono">select public.set_user_role(&apos;{currentUserEmail}&apos;, &apos;ADMIN&apos;);</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => refreshData()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0eb28d] hover:bg-[#0ca07e] text-[#04291f] font-bold text-sm transition-colors text-center cursor-pointer shadow-sm"
            >
              Recheck Permissions
            </button>
            <button
              type="button"
              onClick={signOut}
              className="py-2.5 px-4 rounded-xl border border-[#d2d0c7] hover:bg-[#f6f4ef] text-[#17242f] font-semibold text-sm transition-colors cursor-pointer"
            >
              Sign out / Switch account
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-[26px_32px_60px] max-w-[1440px] w-full min-w-0 overflow-x-auto">
      {children}
    </main>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-admin', 'true')
    return () => {
      document.documentElement.removeAttribute('data-admin')
    }
  }, [])

  return (
    <AdminProvider>
      <div data-admin="true" className="min-h-screen bg-[#f6f4ef] flex flex-col md:flex-row text-[#17242f] font-sans antialiased">
        {/* Mobile Top Header (hidden on md+) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#062c55] text-white sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-1.5 -ml-1 text-[#8fb0cf] hover:text-white transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="text-[16px] font-extrabold tracking-[-0.2px] leading-tight">
                FairExit
              </div>
              <div className="text-[9.5px] font-bold tracking-[0.8px] uppercase text-[#8fb0cf] leading-none">
                Operator
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#0eb28d] text-[#04291f] font-extrabold text-xs flex items-center justify-center">
            S
          </div>
        </header>

        {/* Mobile Drawer (hidden on md+) */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#062c55]/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <div className="relative w-[260px] max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
              <AdminSidebar onClose={() => setMobileNavOpen(false)} isMobileDrawer={true} />
            </div>
          </div>
        )}

        {/* Desktop Left non-scrollable sticky sidebar */}
        <AdminSidebar />

        {/* Main dashboard view with gatekeeper */}
        <AdminMainContent>
          {children}
        </AdminMainContent>

        {/* Modals & Toasts */}
        <AdminModals />
      </div>
    </AdminProvider>
  )
}
