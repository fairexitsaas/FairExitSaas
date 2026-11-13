/**
 * Admin API client for operations dashboard
 * Requires an authenticated user with profiles.role = 'ADMIN'
 */
import { createClient } from '@/lib/supabase/client'
import { FAIREXIT_API_URL } from '@/lib/api/fairexit'

export interface AdminKpis {
  freeChecks: number
  freeChecksChangePct: number | null
  reportsBought: number
  conversionPct: number
  revenueCents: Record<string, number>
  refunds: number
  lawyerRequests: number
  lawyerRequestsNotSent: number
  sentToLawyer: number
}

export interface AdminReportStatus {
  completed: number
  processing: number
  failed: number
  pendingPayment: number
}

export interface AdminAttentionItem {
  type: string
  text: string
  ref?: string
}

export interface AdminOverviewResponse {
  month: string
  country: 'CA' | 'US' | 'all'
  kpis: AdminKpis
  reportStatus: AdminReportStatus
  needsAttention: AdminAttentionItem[]
}

export interface AdminUserRecord {
  userId: string
  region: string
  industry: string | null
  freeCheck: string
  report: string
  lawyerRequest: string
  date: string
}

export interface AdminLeadRecord {
  id: string
  request: string
  caseId: string | null
  region: string
  country: 'CA' | 'US'
  jurisdictionCode?: string | null
  name: string | null
  email: string
  phone: string | null
  bestTime: string | null
  enquiryType: string
  sourcePage: string | null
  consent: boolean
  status: 'new' | 'sent' | 'call_happened' | 'retained' | 'closed_no_response'
  lawyerId: string | null
  lawyer: string | null
  dateSent: string | null
  how: string | null
  by: string | null
  whatWeSent: string
  summary: Record<string, unknown>
  notes: string | null
  createdAt: string
}

export interface AdminReportRecord {
  caseId: string
  reportId: string
  user: string
  region: string | null
  status: string
  paidVia: string
  amount: string | null
  date: string | null
}

export interface AdminLawyerRecord {
  id: string
  name: string
  firm: string | null
  address_lines?: string[]
  jurisdiction_code?: string
  country: 'CA' | 'US'
  email: string
  phone: string
  status: 'active' | 'paused'
  agreement_date?: string
  agreement_type?: string
  notes?: string
  sentThisMonth: number
  created_at: string
}

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token: string | undefined
  if (typeof window !== 'undefined') {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token
    } catch (e) {
      console.warn('Failed to get Supabase session for admin request:', e)
    }
  }

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const base = FAIREXIT_API_URL.replace(/\/$/, '')
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  })

  let json: any
  try {
    json = await response.json()
  } catch {
    throw new Error(`Admin endpoint returned invalid response (${response.status})`)
  }

  if (!response.ok || json.success === false) {
    const errorMsg = json.message || `Request failed with status ${response.status}`
    const error = new Error(errorMsg) as Error & { status: number }
    error.status = response.status
    throw error
  }

  return (json.data !== undefined ? json.data : json) as T
}

export const adminApi = {
  async getOverview(country: 'CA' | 'US' | 'all' = 'all', month?: string): Promise<AdminOverviewResponse> {
    const query = new URLSearchParams({ country })
    if (month) query.set('month', month)
    return adminRequest<AdminOverviewResponse>(`/admin/overview?${query.toString()}`)
  },

  async getUsers(country: 'CA' | 'US' | 'all' = 'all', limit = 200, offset = 0): Promise<AdminUserRecord[]> {
    return adminRequest<AdminUserRecord[]>(`/admin/users?country=${country}&limit=${limit}&offset=${offset}`)
  },

  async getLeads(
    country: 'CA' | 'US' | 'all' = 'all',
    filters: {
      status?: string
      enquiryType?: string
      search?: string
      region?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<AdminLeadRecord[]> {
    const query = new URLSearchParams({ country })
    if (filters.status && filters.status !== 'all') query.set('status', filters.status)
    if (filters.enquiryType && filters.enquiryType !== 'all') query.set('enquiryType', filters.enquiryType)
    if (filters.search) query.set('search', filters.search)
    if (filters.region && filters.region !== 'all') query.set('region', filters.region)
    if (filters.limit) query.set('limit', String(filters.limit))
    if (filters.offset) query.set('offset', String(filters.offset))
    return adminRequest<AdminLeadRecord[]>(`/admin/leads?${query.toString()}`)
  },

  async updateLead(
    id: string,
    patch: {
      status?: string
      lawyerId?: string | null
      sentHow?: string
      sentBy?: string
      notes?: string
    }
  ): Promise<any> {
    return adminRequest<any>(`/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  },

  async getReports(country: 'CA' | 'US' | 'all' = 'all'): Promise<AdminReportRecord[]> {
    return adminRequest<AdminReportRecord[]>(`/admin/reports?country=${country}`)
  },

  async getLawyers(): Promise<AdminLawyerRecord[]> {
    return adminRequest<AdminLawyerRecord[]>('/admin/lawyers')
  },

  async createLawyer(data: Record<string, unknown>): Promise<any> {
    return adminRequest<any>('/admin/lawyers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateLawyer(id: string, data: Record<string, unknown>): Promise<any> {
    return adminRequest<any>(`/admin/lawyers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteLawyer(id: string): Promise<any> {
    return adminRequest<any>(`/admin/lawyers/${id}`, {
      method: 'DELETE',
    })
  },
}

