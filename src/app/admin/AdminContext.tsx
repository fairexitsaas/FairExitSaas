'use client'

import React, { createContext, useContext, useState } from 'react'

export interface UserRecord {
  id: string
  region: string
  industry: string
  freeCheck: string
  report: string
  lawyerRequest: string
  date: string
  country: 'CA' | 'US'
}

export interface LawyerRequestRecord {
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

export interface ReportRecord {
  id: string
  user: string
  region: string
  status: 'Completed' | 'Processing' | 'Failed · scan unreadable' | 'Pending payment'
  paidVia: string
  amount: string
  date: string
  country: 'CA' | 'US'
}

export interface LawyerRecord {
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

export type RegionFilter = 'both' | 'ca' | 'us'

interface AdminContextType {
  regionFilter: RegionFilter
  setRegionFilter: (filter: RegionFilter) => void
  users: UserRecord[]
  lawyerRequests: LawyerRequestRecord[]
  reports: ReportRecord[]
  lawyers: LawyerRecord[]
  toastMessage: string | null
  showToast: (msg: string) => void
  summaryModalReq: LawyerRequestRecord | null
  setSummaryModalReq: (req: LawyerRequestRecord | null) => void
  addLawyerModalOpen: boolean
  setAddLawyerModalOpen: (open: boolean) => void
  handleStatusChange: (id: string, newStatus: LawyerRequestRecord['status']) => void
  handleLawyerChange: (id: string, newLawyer: string) => void
  handleNoteChange: (id: string, newNote: string) => void
  handleAddLawyer: (newLawyer: Omit<LawyerRecord, 'id' | 'sentMonth'>) => void
  handleExportCSV: (filename: string, headers: string[], rows: (string | number)[][]) => void
  handleExportPDF: () => void
}

const INITIAL_USERS: UserRecord[] = [
  { id: 'FX-0420', region: 'California', industry: 'Tech', freeCheck: 'Done', report: 'Bought', lawyerRequest: 'Yes', date: 'Today', country: 'US' },
  { id: 'FX-0419', region: 'British Columbia', industry: 'Construction', freeCheck: 'Done', report: '—', lawyerRequest: 'Yes', date: 'Today', country: 'CA' },
  { id: 'FX-0418', region: 'Ontario', industry: 'Logistics', freeCheck: 'Done', report: 'Bought', lawyerRequest: '—', date: 'Yesterday', country: 'CA' },
  { id: 'FX-0417', region: 'British Columbia', industry: 'Software', freeCheck: 'Done', report: '—', lawyerRequest: '—', date: 'Yesterday', country: 'CA' },
  { id: 'FX-0409', region: 'Alberta', industry: 'Energy', freeCheck: 'Done', report: 'Bought', lawyerRequest: '—', date: '2 days', country: 'CA' },
]

const INITIAL_LAWYER_REQUESTS: LawyerRequestRecord[] = [
  {
    id: 'REQ-0029',
    daysAgo: '2 days ago',
    region: 'Ontario',
    name: 'A. Patel',
    email: 'a.patel@…',
    phone: '(647) 555-…',
    status: 'New',
    lawyer: 'Choose…',
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
    email: 't.nguyen@…',
    phone: '(415) 555-…',
    status: 'New',
    lawyer: 'Choose…',
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
    email: 'k.singh@…',
    phone: '(604) 555-…',
    status: 'Sent to lawyer',
    lawyer: 'Coastline Work Law',
    dateSent: 'Oct 3',
    howBy: { method: 'Email', agent: 'Sundeep' },
    whatWeSent: { type: 'Summary', details: 'no documents' },
    notes: "Emailed firm, CC'd client",
    country: 'CA',
  },
  {
    id: 'REQ-0024',
    daysAgo: '8 days ago',
    region: 'Ontario',
    name: 'M. Bell',
    email: 'm.bell@…',
    phone: '(416) 555-…',
    status: 'Call happened',
    lawyer: 'Jordan Ellis · Ellis Employment Law',
    dateSent: 'Sep 29',
    howBy: { method: 'Email', agent: 'Riaz' },
    whatWeSent: { type: 'Summary', details: 'no documents' },
    notes: 'Lawyer confirmed call Oct 1',
    country: 'CA',
  },
]

const INITIAL_REPORTS: ReportRecord[] = [
  { id: 'RPT-7Q4K2M', user: 'FX-0418', region: 'Ontario', status: 'Completed', paidVia: 'Web · Stripe', amount: '$59 CAD', date: 'Today', country: 'CA' },
  { id: 'RPT-5M8N1C', user: 'FX-0420', region: 'California', status: 'Processing', paidVia: 'App · Apple', amount: '$59 USD', date: 'Today', country: 'US' },
  { id: 'RPT-8K2L4Q', user: 'FX-0411', region: 'Ontario', status: 'Failed · scan unreadable', paidVia: 'Web · Stripe', amount: '$59 CAD', date: '2 days', country: 'CA' },
  { id: 'RPT-2H6T9P', user: 'FX-0409', region: 'Alberta', status: 'Completed', paidVia: 'App · Google', amount: '$59 CAD', date: '2 days', country: 'CA' },
]

const INITIAL_LAWYERS: LawyerRecord[] = [
  {
    id: 'LAW-001',
    name: 'Jordan Ellis',
    firm: 'Ellis Employment Law',
    addressLines: ['120 Adelaide St W, Suite 2200', 'Toronto ON M5H 1T1'],
    regionCountry: 'Ontario · Canada',
    email: 'intake@…',
    phone: '(416) 555-…',
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
    firm: 'firm · contact: Sam Osei',
    addressLines: ['800 W Pender St, 5th floor', 'Vancouver BC V6C 2V6'],
    regionCountry: 'British Columbia · Canada',
    email: 'hello@…',
    phone: '(604) 555-…',
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
    addressLines: ['355 S Grand Ave, Suite 1800', 'Los Angeles CA 90071'],
    regionCountry: 'California · US',
    email: 'office@…',
    phone: '(213) 555-…',
    status: 'Active',
    agreementDate: 'Signed Sep 2026',
    agreementType: 'flat ad fee',
    sentMonth: 6,
    notes: '—',
    country: 'US',
  },
]

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('both')
  const [users] = useState<UserRecord[]>(INITIAL_USERS)
  const [lawyerRequests, setLawyerRequests] = useState<LawyerRequestRecord[]>(INITIAL_LAWYER_REQUESTS)
  const [reports] = useState<ReportRecord[]>(INITIAL_REPORTS)
  const [lawyers, setLawyers] = useState<LawyerRecord[]>(INITIAL_LAWYERS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [summaryModalReq, setSummaryModalReq] = useState<LawyerRequestRecord | null>(null)
  const [addLawyerModalOpen, setAddLawyerModalOpen] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }

  const handleStatusChange = (id: string, newStatus: LawyerRequestRecord['status']) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    )
    showToast(`Updated status for ${id} to "${newStatus}"`)
  }

  const handleLawyerChange = (id: string, newLawyer: string) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, lawyer: newLawyer } : req))
    )
    showToast(`Assigned lawyer for ${id}`)
  }

  const handleNoteChange = (id: string, newNote: string) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, notes: newNote } : req))
    )
  }

  const handleAddLawyer = (data: Omit<LawyerRecord, 'id' | 'sentMonth'>) => {
    const newEntry: LawyerRecord = {
      ...data,
      id: `LAW-${String(lawyers.length + 1).padStart(3, '0')}`,
      sentMonth: 0,
    }
    setLawyers((prev) => [newEntry, ...prev])
    setAddLawyerModalOpen(false)
    showToast(`Added ${newEntry.name} to lawyer roster`)
  }

  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${filename}.csv`)
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <AdminContext.Provider
      value={{
        regionFilter,
        setRegionFilter,
        users,
        lawyerRequests,
        reports,
        lawyers,
        toastMessage,
        showToast,
        summaryModalReq,
        setSummaryModalReq,
        addLawyerModalOpen,
        setAddLawyerModalOpen,
        handleStatusChange,
        handleLawyerChange,
        handleNoteChange,
        handleAddLawyer,
        handleExportCSV,
        handleExportPDF,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
