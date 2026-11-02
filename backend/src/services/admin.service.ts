/**
 * Ops dashboard phase 1 (command-center/dashboard-phase1.html): Overview, Users, Lawyer requests,
 * Reports, Lawyers. Users are an ID, a region and an industry only: no names, emails or documents.
 */
import { db, check } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { leadSummary } from './lead.service'

type CountryFilter = 'CA' | 'US' | 'all'

function monthBounds(month?: string) {
  const now = new Date()
  const [y, m] = month && /^\d{4}-\d{2}$/.test(month) ? month.split('-').map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1]
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 1))
  const prevStart = new Date(Date.UTC(y, m - 2, 1))
  return { start: start.toISOString(), end: end.toISOString(), prevStart: prevStart.toISOString() }
}

function businessDaysSince(iso: string) {
  let d = new Date(iso)
  const now = new Date()
  let n = 0
  while (d < now) {
    d = new Date(d.getTime() + 864e5)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6 && d <= now) n++
  }
  return n
}

function filterCountry<T extends { eq: (c: string, v: string) => T }>(q: T, country: CountryFilter): T {
  return country === 'all' ? q : q.eq('country', country)
}

const PAID_VIA: Record<string, string> = { stripe: 'Web · Stripe', apple: 'App · Apple', google: 'App · Google', mock: 'Test · mock' }
const REPORT_STATUS: Record<string, string> = { ready: 'Completed', building: 'Processing', reading: 'Processing', checking: 'Processing', paid: 'Processing', failed: 'Failed', pending_payment: 'Pending payment' }
const FAIL_REASON: Record<string, string> = { read_failed: 'scan unreadable', build_failed: 'report build failed', jurisdiction_not_covered: 'region not covered' }

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
}

export const adminService = {
  async overview(country: CountryFilter, month?: string) {
    const { start, end, prevStart } = monthBounds(month)
    const count = async (build: (q: any) => any) => {
      const r = await build(filterCountry(db().from('cases').select('id', { count: 'exact', head: true }) as any, country))
      return r.count || 0
    }
    const freeChecks = await count((q) => q.gte('created_at', start).lt('created_at', end))
    const freeChecksPrev = await count((q) => q.gte('created_at', prevStart).lt('created_at', start))
    const paid = check(await filterCountry(db().from('cases').select('id,amount_cents,currency,status,status_detail,report_id,jurisdiction') as any, country).gte('paid_at', start).lt('paid_at', end), 'cases') as any[]
    const caseIds = paid.map((p) => p.id)
    const refunds = caseIds.length ? ((await db().from('payments').select('id', { count: 'exact', head: true }).eq('status', 'refunded').in('case_id', caseIds)).count || 0) : 0
    const revenue: Record<string, number> = {}
    for (const p of paid) if (p.amount_cents) revenue[p.currency || 'CAD'] = (revenue[p.currency || 'CAD'] || 0) + p.amount_cents
    const statusCount = (s: string) => paid.filter((p) => (REPORT_STATUS[p.status] || p.status) === s).length
    const pending = await count((q) => q.eq('status', 'pending_payment').gte('updated_at', start).lt('updated_at', end))

    const leads = check(await filterCountry(db().from('leads').select('id,public_id,status,created_at,region_name,jurisdiction_code') as any, country).gte('created_at', start).lt('created_at', end), 'leads') as any[]
    const openNew = check(await filterCountry(db().from('leads').select('public_id,created_at,region_name,jurisdiction_code') as any, country).eq('status', 'new'), 'leads') as any[]
    const lawyers = check(await db().from('lawyers').select('jurisdiction_code,status').eq('status', 'active'), 'lawyers') as any[]
    const covered = new Set(lawyers.map((l) => l.jurisdiction_code))

    const attention: Array<{ type: string; text: string; ref?: string }> = []
    for (const l of openNew) {
      const days = businessDaysSince(l.created_at)
      if (days >= 2) attention.push({ type: 'lead_not_sent', ref: l.public_id, text: `${l.public_id} not sent yet · ${days} business days old. Promise is 3 business days.` })
    }
    for (const p of paid.filter((x) => x.status === 'failed')) attention.push({ type: 'report_failed', ref: p.report_id || p.id, text: `${p.report_id || 'Report'} failed · ${FAIL_REASON[p.status_detail] || p.status_detail}. Email the person.` })
    for (const region of Array.from(new Set(openNew.map((l) => l.jurisdiction_code).filter(Boolean)))) {
      if (!covered.has(region)) attention.push({ type: 'no_lawyer', ref: region, text: `No lawyer listed for ${openNew.find((l) => l.jurisdiction_code === region)?.region_name || region} yet. Requests from there wait until you add one.` })
    }

    return {
      month: start.slice(0, 7),
      country,
      kpis: {
        freeChecks, freeChecksChangePct: freeChecksPrev ? Math.round(((freeChecks - freeChecksPrev) / freeChecksPrev) * 100) : null,
        reportsBought: paid.length, conversionPct: freeChecks ? Math.round((paid.length / freeChecks) * 100) : 0,
        revenueCents: revenue, refunds,
        lawyerRequests: leads.length, lawyerRequestsNotSent: leads.filter((l) => l.status === 'new').length,
        sentToLawyer: leads.filter((l) => l.status !== 'new').length,
      },
      reportStatus: { completed: statusCount('Completed'), processing: statusCount('Processing'), failed: statusCount('Failed'), pendingPayment: pending },
      needsAttention: attention,
    }
  },

  async users(country: CountryFilter, limit = 200, offset = 0) {
    const rows = check(await filterCountry(db().from('cases').select('id,public_id,jurisdiction,country,industry,free_result,paid_at,created_at') as any, country).order('created_at', { ascending: false }).range(offset, offset + limit - 1), 'cases') as any[]
    const ids = rows.map((r) => r.id)
    const leadCases = new Set(ids.length ? ((await db().from('leads').select('case_id').in('case_id', ids)).data || []).map((l: any) => l.case_id) : [])
    return rows.map((r) => ({
      userId: r.public_id, region: r.jurisdiction?.name || r.country, industry: r.industry || null,
      freeCheck: r.free_result ? 'Done' : '—', report: r.paid_at ? 'Bought' : '—', lawyerRequest: leadCases.has(r.id) ? 'Yes' : '—', date: r.created_at,
    }))
  },

  async leads(country: CountryFilter, status?: string) {
    let q = filterCountry(db().from('leads').select('*, lawyers(name, firm)') as any, country).order('created_at', { ascending: false }).limit(500)
    if (status) q = q.eq('status', status)
    const rows = check(await q, 'leads') as any[]
    return rows.map((l) => ({
      id: l.id, request: l.public_id, region: l.region_name, country: l.country, name: l.name, email: l.email, phone: l.phone, bestTime: l.best_time,
      status: l.status, lawyerId: l.lawyer_id, lawyer: l.lawyers ? `${l.lawyers.name}${l.lawyers.firm ? ' · ' + l.lawyers.firm : ''}` : null,
      dateSent: l.sent_at, how: l.sent_how, by: l.sent_by, whatWeSent: 'Summary · no documents', summary: l.summary, notes: l.notes, createdAt: l.created_at,
    }))
  },

  async updateLead(id: string, patch: { status?: string; lawyerId?: string | null; sentHow?: string; sentBy?: string; notes?: string }) {
    const cur = check(await db().from('leads').select('*').eq('id', id).single(), 'Lead') as any
    const upd: Record<string, unknown> = {}
    if (patch.status) {
      upd.status = patch.status
      if (patch.status === 'sent' && !cur.sent_at) upd.sent_at = new Date().toISOString()
      if (['retained', 'closed_no_response'].includes(patch.status)) {
        const closed = new Date()
        upd.closed_at = closed.toISOString()
        upd.delete_after = new Date(new Date(closed).setMonth(closed.getMonth() + env.RETENTION_LEADS_MONTHS)).toISOString()
      }
    }
    if (patch.lawyerId !== undefined) upd.lawyer_id = patch.lawyerId
    if (patch.sentHow !== undefined) upd.sent_how = patch.sentHow
    if (patch.sentBy !== undefined) upd.sent_by = patch.sentBy
    if (patch.notes !== undefined) upd.notes = patch.notes
    return check(await db().from('leads').update(upd).eq('id', id).select('*').single(), 'Lead')
  },

  async reports(country: CountryFilter) {
    const rows = check(await filterCountry(db().from('cases').select('id,public_id,report_id,jurisdiction,status,status_detail,payment_provider,amount_cents,currency,paid_at') as any, country).not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(500), 'cases') as any[]
    return rows.map((r) => ({
      caseId: r.id, reportId: r.report_id || '—', user: r.public_id, region: r.jurisdiction?.name || null,
      status: (REPORT_STATUS[r.status] || r.status) + (r.status === 'failed' && r.status_detail ? ` · ${FAIL_REASON[r.status_detail] || r.status_detail}` : ''),
      paidVia: PAID_VIA[r.payment_provider] || r.payment_provider, amount: r.amount_cents != null ? `$${(r.amount_cents / 100).toFixed(0)} ${r.currency || ''}`.trim() : null, date: r.paid_at,
    }))
  },

  async caseDetail(id: string) {
    const c = check(await db().from('cases').select('*').eq('id', id).single(), 'Case') as any
    const calls = check(await db().from('ai_calls').select('call,model,status,input_tokens,output_tokens,duration_ms,error,created_at').eq('case_id', id).order('created_at', { ascending: false }).limit(50), 'ai_calls')
    const payments = check(await db().from('payments').select('provider,provider_ref,status,amount_cents,currency,created_at').eq('case_id', id), 'payments')
    const { token_hashes, email, consent, ...safe } = c
    void token_hashes; void consent
    return { case: { ...safe, email_on_file: !!email }, aiCalls: calls, payments, leadSummary: leadSummary(c) }
  },

  // ---- lawyers
  async lawyers() {
    const rows = check(await db().from('lawyers').select('*').order('created_at', { ascending: true }), 'lawyers') as any[]
    const sent = check(await db().from('leads').select('lawyer_id,sent_at').not('lawyer_id', 'is', null).gte('sent_at', monthBounds().start), 'leads') as any[]
    return rows.map((l) => ({ ...l, sentThisMonth: sent.filter((s) => s.lawyer_id === l.id).length }))
  },
  async createLawyer(input: Record<string, unknown>) {
    return check(await db().from('lawyers').insert(input).select('*').single(), 'lawyer')
  },
  async updateLawyer(id: string, input: Record<string, unknown>) {
    return check(await db().from('lawyers').update(input).eq('id', id).select('*').single(), 'Lawyer')
  },
  async deleteLawyer(id: string) {
    const r = await db().from('lawyers').delete().eq('id', id)
    if (r.error) throw new ApiError(500, r.error.message)
  },
}
