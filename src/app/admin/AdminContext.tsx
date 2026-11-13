'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  adminApi,
  AdminOverviewResponse,
  AdminUserRecord,
  AdminLeadRecord,
  AdminReportRecord,
  AdminLawyerRecord,
} from '@/lib/api/admin'

export type RegionFilter = 'both' | 'ca' | 'us'

export interface LawyerRequestRecord extends AdminLeadRecord {
  daysAgo: string
}

export type UserRecord = AdminUserRecord
export type ReportRecord = AdminReportRecord
export type LawyerRecord = AdminLawyerRecord

interface AdminContextType {
  regionFilter: RegionFilter
  setRegionFilter: (filter: RegionFilter) => void
  overview: AdminOverviewResponse | null
  users: UserRecord[]
  lawyerRequests: LawyerRequestRecord[]
  reports: ReportRecord[]
  lawyers: LawyerRecord[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  toastMessage: string | null
  showToast: (msg: string) => void
  summaryModalReq: LawyerRequestRecord | null
  setSummaryModalReq: (req: LawyerRequestRecord | null) => void
  addLawyerModalOpen: boolean
  setAddLawyerModalOpen: (open: boolean) => void
  handleStatusChange: (id: string, newStatus: string) => Promise<void>
  handleLawyerChange: (id: string, newLawyer: string) => Promise<void>
  handleNoteChange: (id: string, newNote: string) => Promise<void>
  handleAddLawyer: (newLawyer: Record<string, unknown>) => Promise<void>
  handleExportCSV: (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => void
  handleExportPDF: () => void
}

const AdminContext = createContext<AdminContextType | null>(null)

function formatDaysAgo(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return 'Today'
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  } catch {
    return '—'
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('both')
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [lawyerRequests, setLawyerRequests] = useState<LawyerRequestRecord[]>([])
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [lawyers, setLawyers] = useState<LawyerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [summaryModalReq, setSummaryModalReq] = useState<LawyerRequestRecord | null>(null)
  const [addLawyerModalOpen, setAddLawyerModalOpen] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }, [])

  const countryParam = regionFilter === 'ca' ? 'CA' : regionFilter === 'us' ? 'US' : 'all'

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovData, usersData, leadsData, reportsData, lawyersData] = await Promise.all([
        adminApi.getOverview(countryParam).catch((err) => {
          console.warn('adminApi.getOverview failed:', err.message)
          return null
        }),
        adminApi.getUsers(countryParam).catch((err) => {
          console.warn('adminApi.getUsers failed:', err.message)
          return [] as UserRecord[]
        }),
        adminApi.getLeads(countryParam).catch((err) => {
          console.warn('adminApi.getLeads failed:', err.message)
          return [] as AdminLeadRecord[]
        }),
        adminApi.getReports(countryParam).catch((err) => {
          console.warn('adminApi.getReports failed:', err.message)
          return [] as ReportRecord[]
        }),
        adminApi.getLawyers().catch((err) => {
          console.warn('adminApi.getLawyers failed:', err.message)
          return [] as LawyerRecord[]
        }),
      ])

      setOverview(ovData)
      setUsers(usersData || [])
      setLawyerRequests(
        (leadsData || []).map((l) => ({
          ...l,
          daysAgo: formatDaysAgo(l.createdAt),
        }))
      )
      setReports(reportsData || [])
      setLawyers(lawyersData || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to admin services.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [countryParam])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setLawyerRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: newStatus as any } : req))
      )
      await adminApi.updateLead(id, { status: newStatus })
      showToast(`Updated status for request to "${newStatus}"`)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update status.')
      await fetchData()
    }
  }

  const handleLawyerChange = async (id: string, newLawyer: string) => {
    try {
      const lawyerObj = lawyers.find(
        (l) => l.name === newLawyer || `${l.name} · ${l.firm}` === newLawyer
      )
      const lawyerId = lawyerObj ? lawyerObj.id : null

      setLawyerRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, lawyer: newLawyer, lawyerId } : req))
      )
      await adminApi.updateLead(id, { lawyerId })
      showToast(`Assigned lawyer for request`)
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to assign lawyer.')
      await fetchData()
    }
  }

  const handleNoteChange = async (id: string, newNote: string) => {
    setLawyerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, notes: newNote } : req))
    )
    try {
      await adminApi.updateLead(id, { notes: newNote })
    } catch (err: unknown) {
      console.warn('Failed to save lead note:', err)
    }
  }

  const handleAddLawyer = async (newLawyerData: Record<string, unknown>) => {
    try {
      await adminApi.createLawyer(newLawyerData)
      setAddLawyerModalOpen(false)
      showToast(`Added lawyer to roster`)
      await fetchData()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to add lawyer.')
    }
  }

  const handleExportCSV = (
    filename: string,
    headers: string[],
    rows: (string | number | boolean | null | undefined)[][]
  ) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
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
        overview,
        users,
        lawyerRequests,
        reports,
        lawyers,
        loading,
        error,
        refreshData: fetchData,
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
