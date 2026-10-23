'use client'

import React, { useEffect, useState } from 'react'
import { AdminProvider } from './AdminContext'
import AdminSidebar from './AdminSidebar'
import AdminModals from './AdminModals'

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

        {/* Main dashboard view */}
        <main className="flex-1 p-4 sm:p-6 md:p-[26px_32px_60px] max-w-[1440px] w-full min-w-0 overflow-x-auto">
          {children}
        </main>

        {/* Modals & Toasts */}
        <AdminModals />
      </div>
    </AdminProvider>
  )
}
