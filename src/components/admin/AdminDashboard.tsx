'use client'

import React, { useState, useEffect, useId, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type AdminTab = 'overview' | 'users' | 'lawyer-requests' | 'reports' | 'lawyers'

export interface AdminDashboardProps {
  initialTab?: AdminTab
  userProfile?: {
    name?: string
    role?: string
  }
}

// ==========================================
// MOCK DATA MATCHING EXACT SCREENSHOT VALUES
// ==========================================

interface UserRecord {
  id: string
  region: string
  industry: string
  freeCheck: string
  report: string
  lawyerRequest: string
  date: string
  country: 'CA' | 'US'
}

const INITIAL_USERS: UserRecord[] = [
  { id: 'FX-0420', region: 'California', industry: 'Tech', freeCheck: 'Done', report: 'Bought', lawyerRequest: 'Yes', date: 'Today', country: 'US' },
  { id: 'FX-0419', region: 'British Columbia', industry: 'Construction', freeCheck: 'Done', report: '—', lawyerRequest: 'Yes', date: 'Today', country: 'CA' },
  { id: 'FX-0418', region: 'Ontario', industry: 'Logistics', freeCheck: 'Done', report: 'Bought', lawyerRequest: '—', date: 'Yesterday', country: 'CA' },
  { id: 'FX-0417', region: 'British Columbia', industry: 'Software', freeCheck: 'Done', report: '—', lawyerRequest: '—', date: 'Yesterday', country: 'CA' },
  { id: 'FX-0409', region: 'Alberta', industry: 'Energy', freeCheck: 'Done', report: 'Bought', lawyerRequest: '—', date: '2 days', country: 'CA' },
  { id: 'FX-0408', region: 'New York', industry: 'Finance', freeCheck: 'Done', report: 'Bought', lawyerRequest: '—', date: '2 days', country: 'US' },
  { id: 'FX-0405', region: 'Texas', industry: 'Healthcare', freeCheck: 'Done', report: '—', lawyerRequest: 'Yes', date: '3 days', country: 'US' },
  { id: 'FX-0402', region: 'Quebec', industry: 'Manufacturing', freeCheck: 'Done', report: '—', lawyerRequest: '—', date: '3 days', country: 'CA' },
]

interface LawyerRequestRecord {
  id: string
  daysAgo: string
  region: string
  name: string
  email: string
  phone: string
  status: 'New' | 'Sent to lawyer' | 'Call happened' | 'Retained' | 'Closed · no response'
  lawyer: string
  dateSent: string
  howBy: { method: string; agent: string } | null
  whatWeSent: { type: string; details: string } | null
  notes: string
  country: 'CA' | 'US'
}

const INITIAL_LAWYER_REQUESTS: LawyerRequestRecord[] = [
  {
    id: 'REQ-0029',
    daysAgo: '2 days ago',
    region: 'Ontario',
    name: 'A. Patel',
    email: 'a.patel@..',
    phone: '(647) 555-..',
    status: 'New',
    lawyer: '',
    dateSent: '—',
    howBy: null,
    whatWeSent: null,
    notes: '',
    country: 'CA',
  },
  {
    id: 'REQ-0028',
    daysAgo: 'Today',
    region: 'California',
    name: 'T. Nguyen',
    email: 't.nguyen@..',
    phone: '(415) 555-..',
    status: 'New',
    lawyer: '',
    dateSent: '—',
    howBy: null,
    whatWeSent: null,
    notes: '',
    country: 'US',
  },
  {
    id: 'REQ-0027',
    daysAgo: '3 days ago',
    region: 'British Columbia',
    name: 'K. Singh',
    email: 'k.singh@..',
    phone: '(604) 555-..',
    status: 'Sent to lawyer',
    lawyer: 'Coastline Work La',
    dateSent: 'Oct 3',
    howBy: { method: 'Email', agent: 'Sundeep' },
    whatWeSent: { type: 'Summary', details: 'no documents' },
    notes: 'Emailed firm, CC...',
    country: 'CA',
  },
  {
    id: 'REQ-0024',
    daysAgo: '8 days ago',
    region: 'Ontario',
    name: 'M. Bell',
    email: 'm.bell@..',
    phone: '(416) 555-..',
    status: 'Call happened',
    lawyer: 'Jordan Ellis · Ellis Employm',
    dateSent: 'Sep 29',
    howBy: { method: 'Email', agent: 'Riaz' },
    whatWeSent: { type: 'Summary', details: 'no documents' },
    notes: 'Lawyer confirmed...',
    country: 'CA',
  },
]

interface ReportRecord {
  id: string
  user: string
  region: string
  status: 'Completed' | 'Processing' | 'Failed · scan unreadable' | 'Pending payment'
  paidVia: string
  amount: string
  date: string
  country: 'CA' | 'US'
}

const INITIAL_REPORTS: ReportRecord[] = [
  { id: 'RPT-7Q4K2M', user: 'FX-0418', region: 'Ontario', status: 'Completed', paidVia: 'Web · Stripe', amount: '$59 CAD', date: 'Today', country: 'CA' },
  { id: 'RPT-5M8N1C', user: 'FX-0420', region: 'California', status: 'Processing', paidVia: 'App · Apple', amount: '$59 USD', date: 'Today', country: 'US' },
  { id: 'RPT-8K2L4Q', user: 'FX-0411', region: 'Ontario', status: 'Failed · scan unreadable', paidVia: 'Web · Stripe', amount: '$59 CAD', date: '2 days', country: 'CA' },
  { id: 'RPT-2H6T9P', user: 'FX-0409', region: 'Alberta', status: 'Completed', paidVia: 'App · Google', amount: '$59 CAD', date: '2 days', country: 'CA' },
  { id: 'RPT-1D4P9S', user: 'FX-0408', region: 'New York', status: 'Completed', paidVia: 'Web · Stripe', amount: '$59 USD', date: '2 days', country: 'US' },
]

interface LawyerRecord {
  id: string
  name: string
  firm: string
  addressLines: string[]
  regionCountry: string
  email: string
  phone: string
  status: 'Active' | 'Paused · at monthly max'
  agreementDate: string
  agreementType: string
  sentMonth: number
  notes: string
  country: 'CA' | 'US'
}

const INITIAL_LAWYERS: LawyerRecord[] = [
  {
    id: 'LAW-001',
    name: 'Jordan Ellis',
    firm: 'Ellis Employment Law',
    addressLines: ['120 Adelaide St W,', 'Suite 2200', 'Toronto ON M5H 1T1'],
    regionCountry: 'Ontario · Canada',
    email: 'intake@..',
    phone: '(416) 555-..',
    status: 'Active',
    agreementDate: 'Signed Jun 2026',
    agreementType: 'flat ad fee',
    sentMonth: 11,
    notes: 'Prefers email intros',
    country: 'CA',
  },
  {
    id: 'LAW-002',
    name: 'Coastline Work Law',
    firm: 'firm - contact: Sam Osei',
    addressLines: ['800 W Pender St,', '5th floor', 'Vancouver BC V6C 2V6'],
    regionCountry: 'British Columbia · Canada',
    email: 'hello@..',
    phone: '(604) 555-..',
    status: 'Paused · at monthly max',
    agreementDate: 'Signed Aug 2026',
    agreementType: 'flat ad fee',
    sentMonth: 7,
    notes: 'Max 8 a month',
    country: 'CA',
  },
  {
    id: 'LAW-003',
    name: 'Morgan Reyes',
    firm: 'Reyes Employment Law',
    addressLines: ['355 S Grand Ave,', 'Suite 1800', 'Los Angeles CA 90071'],
    regionCountry: 'California · US',
    email: 'office@..',
    phone: '(213) 555-..',
    status: 'Active',
    agreementDate: 'Signed Sep 2026',
    agreementType: 'flat ad fee',
    sentMonth: 6,
    notes: '—',
    country: 'US',
  },
]

function AdminDashboardInner({
  initialTab = 'overview',
  userProfile = { name: 'Sundeep', role: 'Owner' },
}: AdminDashboardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tabQuery = searchParams.get('tab') as AdminTab | null
  const [activeTab, setActiveTab] = useState<AdminTab>(tabQuery || initialTab)

  useEffect(() => {
    if (tabQuery && ['overview', 'users', 'lawyer-requests', 'reports', 'lawyers'].includes(tabQuery)) {
      setActiveTab(tabQuery)
    }
  }, [tabQuery])

  const [regionFilter, setRegionFilter] = useState<'Both' | 'Canada' | 'US'>('Both')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // State for data tables
  const [lawyerRequests, setLawyerRequests] = useState<LawyerRequestRecord[]>(INITIAL_LAWYER_REQUESTS)
  const [lawyers, setLawyers] = useState<LawyerRecord[]>(INITIAL_LAWYERS)
  const [users] = useState<UserRecord[]>(INITIAL_USERS)
  const [reports] = useState<ReportRecord[]>(INITIAL_REPORTS)

  // Modals state
  const [summaryModalReq, setSummaryModalReq] = useState<LawyerRequestRecord | null>(null)
  const [addLawyerModalOpen, setAddLawyerModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // New lawyer form state
  const [newLawyerForm, setNewLawyerForm] = useState({
    name: '',
    firm: '',
    addressStreet: '',
    addressSuite: '',
    addressCityStateZip: '',
    regionCountry: 'Ontario · Canada',
    country: 'CA' as 'CA' | 'US',
    email: '',
    phone: '',
    status: 'Active' as 'Active' | 'Paused · at monthly max',
    agreementDate: 'Signed Oct 2026',
    agreementType: 'flat ad fee',
    notes: '',
  })

  const formIdPrefix = useId()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }

  // Update lawyer request status
  const handleStatusChange = (id: string, newStatus: LawyerRequestRecord['status']) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    )
    showToast(`Updated status for ${id} to "${newStatus}"`)
  }

  // Update lawyer assignment
  const handleLawyerChange = (id: string, newLawyer: string) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, lawyer: newLawyer } : req))
    )
    showToast(`Assigned lawyer for ${id}`)
  }

  // Update note
  const handleNoteChange = (id: string, newNote: string) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, notes: newNote } : req))
    )
  }

  // Export CSV handler
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${filename}.csv`)
  }

  // Export PDF handler
  const handleExportPDF = () => {
    window.print()
  }

  // Add lawyer submit
  const handleAddLawyerSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLawyerForm.name.trim()) return

    const newEntry: LawyerRecord = {
      id: `LAW-${String(lawyers.length + 1).padStart(3, '0')}`,
      name: newLawyerForm.name.trim(),
      firm: newLawyerForm.firm.trim() || 'Independent Counsel',
      addressLines: [
        newLawyerForm.addressStreet.trim(),
        newLawyerForm.addressSuite.trim(),
        newLawyerForm.addressCityStateZip.trim(),
      ].filter(Boolean),
      regionCountry: newLawyerForm.regionCountry,
      email: newLawyerForm.email.trim() || 'intake@..',
      phone: newLawyerForm.phone.trim() || '—',
      status: newLawyerForm.status,
      agreementDate: newLawyerForm.agreementDate.trim() || 'Signed Current Month',
      agreementType: newLawyerForm.agreementType.trim() || 'flat ad fee',
      sentMonth: 0,
      notes: newLawyerForm.notes.trim() || '—',
      country: newLawyerForm.country,
    }

    setLawyers((prev) => [newEntry, ...prev])
    setAddLawyerModalOpen(false)
    setNewLawyerForm({
      name: '',
      firm: '',
      addressStreet: '',
      addressSuite: '',
      addressCityStateZip: '',
      regionCountry: 'Ontario · Canada',
      country: 'CA',
      email: '',
      phone: '',
      status: 'Active',
      agreementDate: 'Signed Oct 2026',
      agreementType: 'flat ad fee',
      notes: '',
    })
    showToast(`Added ${newEntry.name} to lawyer roster`)
  }

  // Active breadcrumb text
  const getTabLabel = (tab: AdminTab) => {
    switch (tab) {
      case 'overview':
        return 'Overview'
      case 'users':
        return 'Users'
      case 'lawyer-requests':
        return 'Lawyer requests'
      case 'reports':
        return 'Reports'
      case 'lawyers':
        return 'Lawyers'
    }
  }

  const navigateToTab = (tab: AdminTab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
    router.push(`${pathname}?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#d8d3c9] p-3 sm:p-5 lg:p-7 font-sans text-[#17242F]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#062C55] text-white px-4 py-2.5 text-xs font-semibold shadow-lg border border-white/20 animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0EB28D]"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Tag exactly as displayed in screenshots */}
      <div className="mb-3.5 px-0.5">
        <span className="text-[11px] font-bold tracking-wider text-slate-800 uppercase block mb-1">
          COMMON
        </span>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EAE6DF] border border-[#DDD8CF] shadow-xs text-xs font-semibold text-slate-900">
          <span>COMMON · CA + US · {getTabLabel(activeTab)}</span>
        </div>
      </div>

      {/* Main Admin Container Window */}
      <div className="flex rounded-2xl overflow-hidden border border-[#D5D0C7] shadow-xl min-h-[820px] bg-[#FAF9F5]">
        {/* ========================================================= */}
        {/* SIDEBAR: Deep Navy matching brand tokens (#062C55)         */}
        {/* ========================================================= */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#062C55] text-white transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col justify-between shrink-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Brand & Nav */}
          <div className="p-6">
            {/* Logo and operator title */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <Link href="/" className="inline-block group">
                  <h1 className="text-xl font-semibold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    FairExit
                  </h1>
                </Link>
                {/* Mobile close button */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-slate-300 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-[#7BA5CD] mt-1">
                OPERATOR · PHASE 1
              </p>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1.5 text-xs font-medium">
              {/* Overview */}
              <button
                type="button"
                onClick={() => navigateToTab('overview')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#133863] text-white font-semibold shadow-xs'
                    : 'text-[#9BB3CC] hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
                <span>Overview</span>
              </button>

              {/* Users */}
              <button
                type="button"
                onClick={() => navigateToTab('users')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#133863] text-white font-semibold shadow-xs'
                    : 'text-[#9BB3CC] hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
                </svg>
                <span>Users</span>
              </button>

              {/* Lawyer requests */}
              <button
                type="button"
                onClick={() => navigateToTab('lawyer-requests')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'lawyer-requests'
                    ? 'bg-[#133863] text-white font-semibold shadow-xs'
                    : 'text-[#9BB3CC] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                  <span>Lawyer requests</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-[#0EB28D] text-[#062C55] font-bold text-[11px] flex items-center justify-center">
                  2
                </span>
              </button>

              {/* Reports */}
              <button
                type="button"
                onClick={() => navigateToTab('reports')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-left cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-[#133863] text-white font-semibold shadow-xs'
                    : 'text-[#9BB3CC] hover:text-white hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Reports</span>
              </button>

              {/* Lawyers */}
              <button
                type="button"
                onClick={() => navigateToTab('lawyers')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-left pl-10.5 cursor-pointer ${
                  activeTab === 'lawyers'
                    ? 'bg-[#133863] text-white font-semibold shadow-xs'
                    : 'text-[#9BB3CC] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Lawyers</span>
              </button>
            </nav>

            {/* Archived version link */}
            <div className="mt-8 pt-4">
              <Link
                href="/questions"
                className="text-xs text-[#7BA5CD] hover:text-white flex items-center gap-1.5 transition-colors group"
              >
                <span>Previous version (archived)</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          </div>

          {/* Bottom user profile */}
          <div className="p-4 border-t border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0EB28D] text-[#062C55] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              S
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{userProfile.name || 'Sundeep'}</span>
              <span className="text-[11px] text-[#7BA5CD] truncate">{userProfile.role || 'Owner'}</span>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ========================================================= */}
        {/* MAIN WORK AREA                                            */}
        {/* ========================================================= */}
        <main className="flex-1 p-5 sm:p-7 lg:p-9 overflow-y-auto">
          {/* Mobile header trigger */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 lg:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-bold text-sm text-[#062C55]">FairExit Operator</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">{getTabLabel(activeTab)}</span>
          </div>

          {/* ========================================== */}
          {/* TAB 1: OVERVIEW                            */}
          {/* ========================================== */}
          {activeTab === 'overview' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                  <h2 className="text-3xl font-normal font-serif text-[#062C55] tracking-tight">
                    Overview
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6B78] max-w-2xl leading-relaxed">
                    The numbers that matter this month. Lawyer work is done by hand in phase 1: the team sends each
                    request and updates its status here.
                  </p>
                </div>

                {/* Country Filter Pill Group: [ Both ] [ Canada ] [ US ] */}
                <div className="inline-flex items-center rounded-lg bg-white p-1 border border-[#E2DDD3] shadow-xs shrink-0 self-start">
                  {(['Both', 'Canada', 'US'] as const).map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setRegionFilter(reg)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        regionFilter === reg
                          ? 'bg-[#062C55] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-6">
                {/* 1. Free checks */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    FREE CHECKS
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">
                    {regionFilter === 'Both' ? '412' : regionFilter === 'Canada' ? '238' : '174'}
                  </div>
                  <div className="text-xs font-medium text-[#0C8F72] mt-1 flex items-center gap-1">
                    <span>+18% vs last month</span>
                  </div>
                </div>

                {/* 2. Reports bought - $59 */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REPORTS BOUGHT - $59
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">
                    {regionFilter === 'Both' ? '37' : regionFilter === 'Canada' ? '21' : '16'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">9% of free checks</div>
                </div>

                {/* 3. Revenue */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REVENUE
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">
                    {regionFilter === 'Both' ? '$2,183' : regionFilter === 'Canada' ? '$1,239' : '$944'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">1 refund</div>
                </div>

                {/* 4. Lawyer requests */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    LAWYER REQUESTS
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">
                    {regionFilter === 'Both' ? '29' : regionFilter === 'Canada' ? '17' : '12'}
                  </div>
                  <div className="text-xs font-medium text-[#B45309] mt-1">2 not sent yet</div>
                </div>

                {/* 5. Sent to a lawyer */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    SENT TO A LAWYER
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">
                    {regionFilter === 'Both' ? '24' : regionFilter === 'Canada' ? '14' : '10'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Updated by the team</div>
                </div>
              </div>

              {/* Middle Row: Report status & Needs attention */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
                {/* Left: Report status this month */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-[#E7E4DD] p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      Report status <span className="text-slate-400 font-normal ml-1">this month</span>
                    </h3>

                    <div className="mt-4 space-y-3.5">
                      {/* Completed */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-700">Completed</span>
                          <span className="font-bold text-slate-900">33</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EAE6DF] overflow-hidden">
                          <div className="h-full rounded-full bg-[#0EB28D] w-[89%]"></div>
                        </div>
                      </div>

                      {/* Processing */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-700">Processing</span>
                          <span className="font-bold text-slate-900">2</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EAE6DF] overflow-hidden">
                          <div className="h-full rounded-full bg-[#E1C497] w-[8%]"></div>
                        </div>
                      </div>

                      {/* Failed (needs a look) */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-700">Failed (needs a look)</span>
                          <span className="font-bold text-slate-900">1</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EAE6DF] overflow-hidden">
                          <div className="h-full rounded-full bg-[#E1C497] w-[4%]"></div>
                        </div>
                      </div>

                      {/* Pending payment */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-700">Pending payment</span>
                          <span className="font-bold text-slate-900">1</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EAE6DF] overflow-hidden">
                          <div className="h-full rounded-full bg-[#E1C497] w-[4%]"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Needs attention */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-[#E7E4DD] p-5 shadow-xs">
                  <h3 className="text-xs font-semibold text-slate-900">Needs attention</h3>

                  <div className="mt-4 space-y-3.5">
                    {/* Item 1: REQ-0029 */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1"></span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">
                          REQ-0029 not sent yet · 2 business days old
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          Promise is 3 business days.{' '}
                          <button
                            type="button"
                            onClick={() => navigateToTab('lawyer-requests')}
                            className="text-[#062C55] font-semibold underline hover:text-emerald-700 cursor-pointer"
                          >
                            Open Lawyer requests.
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Item 2: Failed build */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">1 report failed to build</p>
                        <p className="text-slate-500 mt-0.5">
                          RPT-8K2L4Q · scan unreadable.{' '}
                          <button
                            type="button"
                            onClick={() => navigateToTab('reports')}
                            className="text-[#062C55] font-semibold underline hover:text-emerald-700 cursor-pointer"
                          >
                            Email the person.
                          </button>
                        </p>
                      </div>
                    </div>

                    {/* Item 3: No lawyer for Alberta */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1"></span>
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">No lawyer listed for Alberta yet</p>
                        <p className="text-slate-500 mt-0.5">
                          Requests from Alberta wait until you{' '}
                          <button
                            type="button"
                            onClick={() => navigateToTab('lawyers')}
                            className="text-[#062C55] font-semibold underline hover:text-emerald-700 cursor-pointer"
                          >
                            add one.
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card: Recent users */}
              <div className="mt-5 bg-white rounded-xl border border-[#E7E4DD] p-5 shadow-xs">
                <h3 className="text-xs font-semibold text-slate-900 mb-3.5">Recent users</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">USER ID</th>
                        <th className="py-2.5 px-3">REGION</th>
                        <th className="py-2.5 px-3">INDUSTRY</th>
                        <th className="py-2.5 px-3">REPORT</th>
                        <th className="py-2.5 px-3">LAWYER REQUEST</th>
                        <th className="py-2.5 px-3">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {users.slice(0, 4).map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-[#062C55]">{user.id}</td>
                          <td className="py-3 px-3">{user.region}</td>
                          <td className="py-3 px-3">{user.industry}</td>
                          <td className="py-3 px-3">{user.report}</td>
                          <td className="py-3 px-3">{user.lawyerRequest}</td>
                          <td className="py-3 px-3">{user.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: USERS                               */}
          {/* ========================================== */}
          {activeTab === 'users' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                  <h2 className="text-3xl font-normal font-serif text-[#062C55] tracking-tight">
                    Users
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6B78] max-w-2xl leading-relaxed">
                    Everyone who ran a free check. No names, emails, phones, employers or documents here: a user is an
                    ID, a region and an industry.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      'users',
                      ['USER ID', 'REGION', 'INDUSTRY', 'FREE CHECK', 'REPORT', 'LAWYER REQUEST', 'DATE'],
                      users.map((u) => [u.id, u.region, u.industry, u.freeCheck, u.report, u.lawyerRequest, u.date])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors self-start shrink-0 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="mt-6 bg-white rounded-xl border border-[#E7E4DD] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-4">USER ID</th>
                        <th className="py-3.5 px-4">REGION</th>
                        <th className="py-3.5 px-4">INDUSTRY</th>
                        <th className="py-3.5 px-4">FREE CHECK</th>
                        <th className="py-3.5 px-4">REPORT</th>
                        <th className="py-3.5 px-4">LAWYER REQUEST</th>
                        <th className="py-3.5 px-4">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#062C55]">{u.id}</td>
                          <td className="py-3.5 px-4">{u.region}</td>
                          <td className="py-3.5 px-4">{u.industry}</td>
                          <td className="py-3.5 px-4">{u.freeCheck}</td>
                          <td className="py-3.5 px-4">{u.report}</td>
                          <td className="py-3.5 px-4">{u.lawyerRequest}</td>
                          <td className="py-3.5 px-4">{u.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: LAWYER REQUESTS                     */}
          {/* ========================================== */}
          {activeTab === 'lawyer-requests' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                  <h2 className="text-3xl font-normal font-serif text-[#062C55] tracking-tight">
                    Lawyer requests
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6B78] max-w-2xl leading-relaxed">
                    People who used &quot;Ask a lawyer to contact me&quot;. The team emails or calls a lawyer from the
                    Lawyers list, then updates the status here by hand. Promise: a lawyer contacts them within 3
                    business days. Contact details are kept only to route the request and are deleted 12 months after it
                    closes.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleExportCSV(
                        'lawyer-requests',
                        ['REQUEST', 'REGION', 'NAME', 'EMAIL', 'PHONE', 'STATUS', 'LAWYER', 'DATE SENT', 'NOTES'],
                        lawyerRequests.map((r) => [
                          r.id,
                          r.region,
                          r.name,
                          r.email,
                          r.phone,
                          r.status,
                          r.lawyer || 'Unassigned',
                          r.dateSent,
                          r.notes,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Table Card */}
              <div className="mt-6 bg-white rounded-xl border border-[#E7E4DD] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-4">REQUEST</th>
                        <th className="py-3.5 px-4">REGION</th>
                        <th className="py-3.5 px-4">NAME</th>
                        <th className="py-3.5 px-4">EMAIL · PHONE</th>
                        <th className="py-3.5 px-4">STATUS (SET BY TEAM)</th>
                        <th className="py-3.5 px-4">LAWYER</th>
                        <th className="py-3.5 px-4">DATE SENT</th>
                        <th className="py-3.5 px-4">HOW · BY</th>
                        <th className="py-3.5 px-4">WHAT WE SENT</th>
                        <th className="py-3.5 px-4">NOTES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {lawyerRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Request ID + relative date */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="font-bold text-[#062C55] block">{req.id}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">{req.daysAgo}</span>
                          </td>

                          {/* Region */}
                          <td className="py-3.5 px-4 align-top">{req.region}</td>

                          {/* Name */}
                          <td className="py-3.5 px-4 align-top font-medium">{req.name}</td>

                          {/* Email & Phone */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="block text-slate-700">{req.email}</span>
                            <span className="block text-slate-400 text-[11px]">{req.phone}</span>
                          </td>

                          {/* Status Dropdown */}
                          <td className="py-3.5 px-4 align-top">
                            <select
                              value={req.status}
                              onChange={(e) =>
                                handleStatusChange(req.id, e.target.value as LawyerRequestRecord['status'])
                              }
                              className="rounded-md border border-slate-300 bg-white py-1 px-2 text-xs font-medium text-slate-800 shadow-xs focus:border-[#0EB28D] focus:outline-none"
                            >
                              <option value="New">New</option>
                              <option value="Sent to lawyer">Sent to lawyer</option>
                              <option value="Call happened">Call happened</option>
                              <option value="Retained">Retained</option>
                              <option value="Closed · no response">Closed · no response</option>
                            </select>
                          </td>

                          {/* Lawyer Dropdown */}
                          <td className="py-3.5 px-4 align-top">
                            <select
                              value={req.lawyer}
                              onChange={(e) => handleLawyerChange(req.id, e.target.value)}
                              className="rounded-md border border-slate-300 bg-white py-1 px-2 text-xs font-medium text-slate-800 shadow-xs focus:border-[#0EB28D] focus:outline-none max-w-[150px] truncate"
                            >
                              <option value="">Choose..</option>
                              {lawyers.map((l) => (
                                <option key={l.id} value={l.name}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Date Sent */}
                          <td className="py-3.5 px-4 align-top text-slate-600">{req.dateSent}</td>

                          {/* How / By */}
                          <td className="py-3.5 px-4 align-top">
                            {req.howBy ? (
                              <div>
                                <span className="block text-slate-800 font-medium">{req.howBy.method}</span>
                                <span className="block text-slate-400 text-[11px]">{req.howBy.agent}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* What we sent */}
                          <td className="py-3.5 px-4 align-top">
                            {req.whatWeSent ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSummaryModalReq(req)}
                                  className="text-[#0EB28D] hover:underline font-semibold block text-left cursor-pointer"
                                >
                                  {req.whatWeSent.type}
                                </button>
                                <span className="text-[11px] text-slate-400 block">{req.whatWeSent.details}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Notes input */}
                          <td className="py-3.5 px-4 align-top">
                            <input
                              type="text"
                              value={req.notes}
                              onChange={(e) => handleNoteChange(req.id, e.target.value)}
                              placeholder="Add a note"
                              className="w-36 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-[#0EB28D] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status workflow note */}
              <p className="mt-3 text-[11px] text-[#5A6B78] leading-relaxed">
                Statuses: New → Sent to lawyer → Call happened → Retained, or Closed · no response. Everything here is
                entered by the team; nothing is sent to lawyers automatically. Matching, booking and lawyer accounts
                are phase 2.
              </p>

              {/* Callout Box: What "Summary" means */}
              <div className="mt-5 bg-white rounded-xl border border-[#E7E4DD] p-5 shadow-xs">
                <h4 className="text-xs font-semibold text-slate-900">
                  What &quot;Summary&quot; means · the only things we share with a lawyer
                </h4>
                <p className="mt-1.5 text-xs text-[#5A6B78] leading-relaxed">
                  Name, email, phone, province or state. Then a short summary of their answers: role level, years with
                  the employer, age range, how the job ended, amount offered, deadline to sign, and anything the free
                  check flagged. Never the uploaded documents or the report. The person ticked a consent box before we
                  sent anything. Lawyers pay a flat advertising fee, never per case.
                </p>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: REPORTS                             */}
          {/* ========================================== */}
          {activeTab === 'reports' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                  <h2 className="text-3xl font-normal font-serif text-[#062C55] tracking-tight">
                    Reports
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6B78] max-w-2xl leading-relaxed">
                    Severance Reports sold. The report is a PDF the person downloads. Its report ID is printed on the
                    last page, so a lawyer can tie it back to us later.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      'reports',
                      ['REPORT ID', 'USER', 'REGION', 'STATUS', 'PAID VIA', 'AMOUNT', 'DATE'],
                      reports.map((r) => [r.id, r.user, r.region, r.status, r.paidVia, r.amount, r.date])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors self-start shrink-0 cursor-pointer"
                >
                  <span>Export CSV</span>
                </button>
              </div>

              {/* 4 KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* 1. Sold this month */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    SOLD THIS MONTH
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">37</div>
                </div>

                {/* 2. Revenue */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REVENUE
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">$2,183</div>
                </div>

                {/* 3. Refunds */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    REFUNDS
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">1</div>
                </div>

                {/* 4. Failed builds */}
                <div className="bg-white rounded-xl border border-[#E7E4DD] p-4.5 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    FAILED BUILDS
                  </div>
                  <div className="text-3xl font-bold text-[#062C55] mt-1.5">1</div>
                </div>
              </div>

              {/* Reports Table */}
              <div className="mt-6 bg-white rounded-xl border border-[#E7E4DD] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-4">REPORT ID</th>
                        <th className="py-3.5 px-4">USER</th>
                        <th className="py-3.5 px-4">REGION</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4">PAID VIA</th>
                        <th className="py-3.5 px-4">AMOUNT</th>
                        <th className="py-3.5 px-4">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {reports.map((r) => {
                        let statusBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E6F5EF] text-[#0C7A60]">
                            Completed
                          </span>
                        )
                        if (r.status === 'Processing') {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#B45309]">
                              Processing
                            </span>
                          )
                        } else if (r.status === 'Failed · scan unreadable') {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEE2E2] text-[#B91C1C]">
                              Failed · scan unreadable
                            </span>
                          )
                        } else if (r.status === 'Pending payment') {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              Pending payment
                            </span>
                          )
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#062C55]">{r.id}</td>
                            <td className="py-3.5 px-4 font-bold text-[#062C55]">{r.user}</td>
                            <td className="py-3.5 px-4">{r.region}</td>
                            <td className="py-3.5 px-4">{statusBadge}</td>
                            <td className="py-3.5 px-4">{r.paidVia}</td>
                            <td className="py-3.5 px-4 font-medium">{r.amount}</td>
                            <td className="py-3.5 px-4">{r.date}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 5: LAWYERS                             */}
          {/* ========================================== */}
          {activeTab === 'lawyers' && (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                  <h2 className="text-3xl font-normal font-serif text-[#062C55] tracking-tight">
                    Lawyers
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-[13px] text-[#5A6B78] max-w-2xl leading-relaxed">
                    The lawyers we work with, kept by hand: who has agreed to take requests, where they are, and
                    whether they are taking requests right now. No lawyer logins or invites in phase 1. Fee terms live
                    in each signed agreement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddLawyerModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#062C55] hover:bg-[#041D38] text-white text-xs font-semibold shadow-xs transition-colors self-start shrink-0 cursor-pointer"
                >
                  <span>+ Add a lawyer</span>
                </button>
              </div>

              {/* Lawyers Table */}
              <div className="mt-6 bg-white rounded-xl border border-[#E7E4DD] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-4">LAWYER · FIRM</th>
                        <th className="py-3.5 px-4">ADDRESS</th>
                        <th className="py-3.5 px-4">PROVINCE / STATE · COUNTRY</th>
                        <th className="py-3.5 px-4">EMAIL · PHONE</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4">AGREEMENT</th>
                        <th className="py-3.5 px-4">SENT · MONTH</th>
                        <th className="py-3.5 px-4">NOTES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {lawyers.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Lawyer & Firm */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="font-bold text-[#062C55] block">{l.name}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{l.firm}</span>
                          </td>

                          {/* Address lines */}
                          <td className="py-3.5 px-4 align-top leading-snug">
                            {l.addressLines.map((line, i) => (
                              <span key={i} className="block text-slate-700">
                                {line}
                              </span>
                            ))}
                          </td>

                          {/* Region · Country */}
                          <td className="py-3.5 px-4 align-top">{l.regionCountry}</td>

                          {/* Email & Phone */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="block text-slate-700">{l.email}</span>
                            <span className="block text-slate-400 text-[11px]">{l.phone}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-top">
                            {l.status === 'Active' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E6F5EF] text-[#0C7A60]">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#B45309]">
                                Paused · at monthly max
                              </span>
                            )}
                          </td>

                          {/* Agreement */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="block text-slate-800 font-medium">{l.agreementDate}</span>
                            <span className="block text-slate-400 text-[11px]">{l.agreementType}</span>
                          </td>

                          {/* Sent this month */}
                          <td className="py-3.5 px-4 align-top font-bold text-[#062C55]">{l.sentMonth}</td>

                          {/* Notes */}
                          <td className="py-3.5 px-4 align-top text-slate-600">{l.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub notes footer */}
              <p className="mt-4 text-[11px] text-[#5A6B78] leading-relaxed">
                All names and addresses are fictional until real lawyers sign. &quot;Add a lawyer&quot; asks for:
                name, firm, address, province or state, country, email, phone, agreement date, status, notes. Lawyer
                sign-up, invites and profiles are phase 2.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Screenshot Captions */}
      <div className="mt-4 px-1 text-xs">
        <div className="text-emerald-800 font-semibold mb-1 flex items-center gap-1">
          <span>Open live</span>
          <span>↗</span>
        </div>
        {activeTab === 'overview' && (
          <p className="text-slate-600">
            5 KPIs: free checks, reports bought, revenue, lawyer requests, sent to a lawyer (updated by the team).
            Report status, needs attention, recent users.
          </p>
        )}
        {activeTab === 'users' && (
          <p className="text-slate-600">
            Everyone who ran a free check. ID, region, industry only. Export CSV.
          </p>
        )}
        {activeTab === 'lawyer-requests' && (
          <p className="text-slate-600">
            Manual table. Team sets status (New → Sent → Call happened → Retained / Closed), picks a lawyer, adds date
            and notes. Export CSV / PDF. Contact details deleted 12 months after closing.
          </p>
        )}
        {activeTab === 'reports' && (
          <p className="text-slate-600">
            Reports sold with status (completed, processing, failed, pending). Export CSV.
          </p>
        )}
        {activeTab === 'lawyers' && (
          <p className="text-slate-600">
            Hand-kept list: name, firm, region, email, agreement date, requests sent, notes. &quot;Add a lawyer&quot;
            form. No invites or lawyer logins (phase 2).
          </p>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: WHAT "SUMMARY" MEANS / PREVIEW FOR A REQUEST     */}
      {/* ========================================================= */}
      {summaryModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-[#062C55]">
                  Summary Sent to Lawyer · {summaryModalReq.id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Only anonymized structured fields are forwarded to participating counsel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalReq(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-semibold text-slate-800">
                    {summaryModalReq.name} ({summaryModalReq.email})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jurisdiction:</span>
                  <span className="font-semibold text-slate-800">{summaryModalReq.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned To:</span>
                  <span className="font-semibold text-[#0C8F72]">{summaryModalReq.lawyer || 'Unassigned'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <h5 className="font-bold uppercase text-[10px] tracking-wider text-slate-400">
                  Shared Answers Summary
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>Role seniority: Professional / Specialist</li>
                  <li>Tenure with employer: 4 years, 8 months</li>
                  <li>Age range: 40-49</li>
                  <li>Severance offered: 8 weeks pay</li>
                  <li>Deadline to sign agreement: 5 business days remaining</li>
                  <li>Free check flag: Below common law range by approx 10 weeks</li>
                </ul>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200/60 text-amber-900 text-[11px] leading-relaxed">
                <strong>Privacy Guarantee:</strong> Raw uploaded offer letters and full generated PDF reports are never
                transmitted to counsel during Phase 1 matching.
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSummaryModalReq(null)}
                className="px-4 py-2 rounded-lg bg-[#062C55] text-white text-xs font-semibold hover:bg-[#041D38] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD A LAWYER FORM                                */}
      {/* ========================================================= */}
      {addLawyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-[#062C55]">Add a lawyer to roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phase 1: Hand-curated list. Enter signed agreement details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddLawyerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLawyerSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formIdPrefix}-name`} className="block font-semibold text-slate-700 mb-1">Lawyer Name *</label>
                  <input
                    id={`${formIdPrefix}-name`}
                    type="text"
                    required
                    placeholder="e.g. Jordan Ellis"
                    value={newLawyerForm.name}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-firm`} className="block font-semibold text-slate-700 mb-1">Firm Name</label>
                  <input
                    id={`${formIdPrefix}-firm`}
                    type="text"
                    placeholder="e.g. Ellis Employment Law"
                    value={newLawyerForm.firm}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, firm: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formIdPrefix}-street`} className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    id={`${formIdPrefix}-street`}
                    type="text"
                    placeholder="e.g. 120 Adelaide St W"
                    value={newLawyerForm.addressStreet}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, addressStreet: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-suite`} className="block font-semibold text-slate-700 mb-1">Suite / Floor</label>
                  <input
                    id={`${formIdPrefix}-suite`}
                    type="text"
                    placeholder="e.g. Suite 2200"
                    value={newLawyerForm.addressSuite}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, addressSuite: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={`${formIdPrefix}-city`} className="block font-semibold text-slate-700 mb-1">City & Postal/Zip</label>
                  <input
                    id={`${formIdPrefix}-city`}
                    type="text"
                    placeholder="e.g. Toronto ON M5H 1T1"
                    value={newLawyerForm.addressCityStateZip}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, addressCityStateZip: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-regionCountry`} className="block font-semibold text-slate-700 mb-1">Region & Country Label</label>
                  <input
                    id={`${formIdPrefix}-regionCountry`}
                    type="text"
                    placeholder="e.g. Ontario · Canada"
                    value={newLawyerForm.regionCountry}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, regionCountry: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-country`} className="block font-semibold text-slate-700 mb-1">Country</label>
                  <select
                    id={`${formIdPrefix}-country`}
                    value={newLawyerForm.country}
                    onChange={(e) =>
                      setNewLawyerForm({ ...newLawyerForm, country: e.target.value as 'CA' | 'US' })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  >
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formIdPrefix}-email`} className="block font-semibold text-slate-700 mb-1">Intake Email</label>
                  <input
                    id={`${formIdPrefix}-email`}
                    type="email"
                    placeholder="e.g. intake@lawfirm.com"
                    value={newLawyerForm.email}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-phone`} className="block font-semibold text-slate-700 mb-1">Intake Phone</label>
                  <input
                    id={`${formIdPrefix}-phone`}
                    type="text"
                    placeholder="e.g. (416) 555-0199"
                    value={newLawyerForm.phone}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={`${formIdPrefix}-status`} className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    id={`${formIdPrefix}-status`}
                    value={newLawyerForm.status}
                    onChange={(e) =>
                      setNewLawyerForm({
                        ...newLawyerForm,
                        status: e.target.value as 'Active' | 'Paused · at monthly max',
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused · at monthly max">Paused · at monthly max</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-agreementDate`} className="block font-semibold text-slate-700 mb-1">Agreement Date</label>
                  <input
                    id={`${formIdPrefix}-agreementDate`}
                    type="text"
                    placeholder="e.g. Signed Oct 2026"
                    value={newLawyerForm.agreementDate}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, agreementDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor={`${formIdPrefix}-agreementType`} className="block font-semibold text-slate-700 mb-1">Fee Model</label>
                  <input
                    id={`${formIdPrefix}-agreementType`}
                    type="text"
                    placeholder="flat ad fee"
                    value={newLawyerForm.agreementType}
                    onChange={(e) => setNewLawyerForm({ ...newLawyerForm, agreementType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${formIdPrefix}-notes`} className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
                <input
                  id={`${formIdPrefix}-notes`}
                  type="text"
                  placeholder="e.g. Prefers email intros, Max 8 a month"
                  value={newLawyerForm.notes}
                  onChange={(e) => setNewLawyerForm({ ...newLawyerForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-[#0EB28D] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAddLawyerModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#062C55] text-white text-xs font-semibold hover:bg-[#041D38] shadow-xs cursor-pointer"
                >
                  Save lawyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard(props: AdminDashboardProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#d8d3c9] flex items-center justify-center p-8 text-slate-600 font-medium">Loading FairExit Operator Dashboard...</div>}>
      <AdminDashboardInner {...props} />
    </Suspense>
  )
}
