'use client'

import React, { useEffect } from 'react'
import { AdminProvider } from './AdminContext'
import AdminSidebar from './AdminSidebar'
import AdminModals from './AdminModals'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    document.documentElement.setAttribute('data-admin', 'true')
    return () => {
      document.documentElement.removeAttribute('data-admin')
    }
  }, [])

  return (
    <AdminProvider>
      <div data-admin="true" className="min-h-screen bg-[#f6f4ef] flex text-[#17242f] font-sans antialiased">
        {/* Left non-scrollable sticky sidebar */}
        <AdminSidebar />

        {/* Main dashboard view */}
        <main className="flex-1 p-[26px_32px_60px] max-w-[1440px] w-full min-w-0 overflow-x-auto">
          {children}
        </main>

        {/* Modals & Toasts */}
        <AdminModals />
      </div>
    </AdminProvider>
  )
}
