'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()

  const navLinks = [
    {
      href: '/admin/overview',
      label: 'Overview',
      icon: '▦',
      badge: null,
      isActive: pathname === '/admin/overview' || pathname === '/admin',
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: '≡',
      badge: null,
      isActive: pathname === '/admin/users',
    },
    {
      href: '/admin/lawyer-requests',
      label: 'Lawyer requests',
      icon: '↗',
      badge: '2',
      isActive: pathname === '/admin/lawyer-requests' || pathname === '/admin/requests',
    },
    {
      href: '/admin/reports',
      label: 'Reports',
      icon: '▤',
      badge: null,
      isActive: pathname === '/admin/reports',
    },
    {
      href: '/admin/lawyers',
      label: 'Lawyers',
      icon: '⚖',
      badge: null,
      isActive: pathname === '/admin/lawyers',
    },
  ]

  return (
    <aside
      className="w-[232px] shrink-0 bg-[#062c55] text-[#cfdcea] p-[22px_14px] sticky top-0 h-screen flex flex-col gap-1 select-none overflow-hidden z-30"
      aria-label="Operations"
    >
      {/* Brand & Subtitle */}
      <Link href="/admin/overview" className="block px-2.5 pt-0 pb-0 text-white hover:opacity-90 transition-opacity">
        <div className="text-[18px] font-extrabold tracking-[-0.2px] leading-tight">
          FairExit
        </div>
      </Link>
      <div className="text-[10.5px] font-bold tracking-[0.9px] uppercase text-[#8fb0cf] px-2.5 pb-4">
        Operator · phase 1
      </div>

      {/* Navigation items */}
      <nav className="flex flex-col gap-1">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-[13.5px] font-semibold transition-colors duration-150 ${
              item.isActive
                ? 'bg-white/[0.12] text-white'
                : 'text-[#cfdcea] hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <span className="w-[18px] text-center opacity-85 text-sm">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-[#0eb28d] text-[#04291f] text-[11px] font-extrabold rounded-[9px] px-[7px] py-0 leading-tight">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Archive link */}
      <div className="text-[12px] text-[#8fb0cf] pt-2.5 px-2.5">
        <a
          href="#archived"
          onClick={(e) => {
            e.preventDefault()
            alert('Phase 1 archive view.')
          }}
          className="text-[#8fb0cf] hover:text-white transition-colors cursor-pointer"
        >
          Previous version (archived) →
        </a>
      </div>

      {/* Profile at bottom */}
      <div className="mt-auto flex items-center gap-2.5 pt-3.5 px-2.5 border-t border-white/10">
        <div className="w-[30px] h-[30px] rounded-full bg-[#0eb28d] text-[#04291f] font-extrabold text-sm flex items-center justify-center shrink-0">
          S
        </div>
        <div className="leading-tight">
          <b className="text-white text-[13px] block font-bold">Sundeep</b>
          <small className="text-[#8fb0cf] text-[11.5px] block font-medium">Owner</small>
        </div>
      </div>
    </aside>
  )
}
