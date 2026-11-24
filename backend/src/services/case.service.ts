import crypto from 'crypto'
import { logger } from '../utils/logger'
import { db, check } from '../config/db'
import { ApiError } from '../utils/ApiError'
import { computeFreeResult } from '../fairexit/freeCheck'
import { buildJurisdiction, codeFromAnswers, Country } from '../fairexit/jurisdictions'
import { RULES_VERSION } from '../fairexit/severanceRules'
import type { CaseRow, CaseDocumentRow, Platform, CaseStatus } from '../fairexit/types'
import { PAID_STATUSES } from '../fairexit/types'
import { env } from '../config/env'
import { emailService } from './email.service'
import { flowService } from './flow.service'


// Must be longer than a real Call B (Opus, 2-5 min) plus the PDF, or live jobs get marked failed.
const STALE_JOB_MS = (Number(process.env.JOB_STALE_MINUTES) || 12) * 60 * 1000

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
export function newToken(): string {
  return 'fxc_' + crypto.randomBytes(24).toString('base64url')
}
export function newLawyerToken(): string {
  return 'fxl_' + crypto.randomBytes(24).toString('base64url')
}

export function getAuthoritativeDelivery(c: CaseRow): Record<string, any> | null {
  const ans = (c.answers as any)?.report_delivery || null
  const con = (c.consent as any)?.report_delivery || null
  if (!ans && !con) return null
  if (!ans) return con
  if (!con) return ans

  // If one is 'sent', 'sent' always takes precedence over 'pending' or 'failed'
  if (ans.status === 'sent' && con.status !== 'sent') return ans
  if (con.status === 'sent' && ans.status !== 'sent') return con

  // If one is 'failed', 'failed' takes precedence over 'pending'
  if (ans.status === 'failed' && con.status === 'pending') return ans
  if (con.status === 'failed' && ans.status === 'pending') return con

  // Compare timestamps if both have sentAt / failedAt
  const ansTime = new Date(ans.sentAt || ans.failedAt || 0).getTime()
  const conTime = new Date(con.sentAt || con.failedAt || 0).getTime()
  return ansTime >= conTime ? ans : con
}

export function hasCompletedPostPaymentCollection(c: CaseRow | any): boolean {
  if (!c) return false
  const answers = (c.answers as Record<string, any>) || {}
  const consent = (c.consent as Record<string, any>) || {}
  const hasName = Boolean(
    c.customerName ||
    answers.customer_name ||
    answers.name ||
    consent.name
  )
  const hasEmail = Boolean(c.email || consent.email)
  const isPostPaySource = consent.source === 'post-payment-collection'
  const hasSubmittedAt = Boolean(consent.submitted_at)

  return Boolean(hasName && hasEmail && isPostPaySource && hasSubmittedAt)
}

export const caseService = {
  async create(input: { country: Country; answers: Record<string, any>; platform: Platform; industry?: string | null; userId?: string | null }) {
    const token = newToken()
    const code = codeFromAnswers(input.country, input.answers)
    const jurisdiction = code ? buildJurisdiction(code) : null
    const freeResult = computeFreeResult(input.country, input.answers)
    logger.info('[CASE][FREE_CHECK_ANSWERS]', {
      country: input.country,
      answers: input.answers,
      freeResult,
    })
    const row = check(
      await db()
        .from('cases')
        .insert({
          country: input.country,
          platform: input.platform,
          answers: input.answers,
          industry: input.industry || null,
          user_id: input.userId || null,
          token_hashes: [hashToken(token)],
          jurisdiction_code: code,
          jurisdiction,
          covered: !!jurisdiction,
          free_result: freeResult,
          rules_version: RULES_VERSION,
        })
        .select('*')
        .single(),
      'case',
    ) as CaseRow
    return { row, token }
  },

  async get(id: string): Promise<CaseRow> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw ApiError.notFound('Case not found')
    const row = check(await db().from('cases').select('*').eq('id', id).single(), 'Case') as CaseRow
    return this.healStale(row)
  },

  /** A job that died with the server or timed out (> 3.5 min) becomes "failed" so the person can retry. */
  async healStale(row: CaseRow): Promise<CaseRow> {
    if ((row.status === 'reading' || row.status === 'building') && row.job_started_at && Date.now() - new Date(row.job_started_at).getTime() > STALE_JOB_MS) {
      logger.warn('[JOB][MARKED_STALE] Job ran longer than JOB_STALE_MINUTES with no result: it was most likely killed by the platform (check [CLAUDE][STREAM_PROGRESS] / [JOB][END] for this case)', {
        caseId: row.id, status: row.status, stage: row.status_detail, startedAt: row.job_started_at,
        elapsedS: Math.round((Date.now() - new Date(row.job_started_at).getTime()) / 1000), thresholdS: STALE_JOB_MS / 1000,
        reportJsonSaved: !!row.report,
      })
      // Once Call B JSON is saved, a stale job only needs its PDF/storage step resumed.
      if (
        row.status === 'building' && row.report &&
        (row.report as any)?._meta?.generation_id &&
        (row.report as any)._meta.generation_id === (row.report_inputs as any)?.generationId
      ) {
        return this.update(row.id, { status: 'ready', status_detail: 'pdf_pending', job_started_at: null })
      }
      const detail = row.status === 'reading' ? 'read_failed' : 'build_failed'
      const lastError = row.status === 'reading'
        ? 'Document analysis timed out. Please try again.'
        : 'Report generation timed out. Please try again.'
      return this.update(row.id, {
        status: 'failed',
        status_detail: detail,
        job_started_at: null,
        report_inputs: {
          ...(row.report_inputs || {}),
          lastError,
          failedStage: row.status === 'reading' ? 'read' : 'claude',
        },
      })
    }
    return row
  },

  async update(id: string, patch: Partial<CaseRow>): Promise<CaseRow> {
    return check(await db().from('cases').update(patch).eq('id', id).select('*').single(), 'Case') as CaseRow
  },

  /** Atomically claim a report build so concurrent requests cannot launch Call B twice. */
  async claimBuild(id: string, patch: Partial<CaseRow>): Promise<CaseRow | null> {
    const { data, error } = await db()
      .from('cases')
      .update(patch)
      .eq('id', id)
      .in('status', ['checking', 'failed'])
      .select('*')
      .maybeSingle()
    if (error) throw new ApiError(500, `Database error (claim report build): ${error.message}`, undefined, false)
    return data as CaseRow | null
  },

  /** Adds another valid token (email links, recovery on a new device). Keeps the last 10. */
  async addToken(row: CaseRow): Promise<string> {
    const token = newToken()
    const hashes = [...(row.token_hashes || []), hashToken(token)].slice(-10)
    await this.update(row.id, { token_hashes: hashes } as Partial<CaseRow>)
    return token
  },

  hasToken(row: CaseRow, token: string | undefined | null): boolean {
    if (!token) return false
    const h = hashToken(token)
    return (row.token_hashes || []).some((x) => x.length === h.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(h)))
  },

  /** Dedicated short-lived token for lawyer-request context (default 7 days). Stores only SHA-256 hash. */
  async createLawyerToken(row: CaseRow, ttlHours = 168): Promise<string> {
    const token = newLawyerToken()
    const hash = hashToken(token)
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
    const existing = Array.isArray((row.answers as any)?.lawyer_tokens) ? (row.answers as any).lawyer_tokens : []
    const now = new Date()
    const valid = existing.filter((item: any) => item && item.hash && new Date(item.expires_at) > now)
    const updated = [...valid, { hash, expires_at: expiresAt, created_at: now.toISOString() }].slice(-5)

    await this.update(row.id, {
      answers: { ...(row.answers || {}), lawyer_tokens: updated },
    } as Partial<CaseRow>)

    return token
  },

  /** Validates whether a token is a valid, unexpired dedicated lawyer-request token. */
  hasLawyerToken(row: CaseRow, token: string | undefined | null): boolean {
    if (!token || !token.startsWith('fxl_')) return false
    const h = hashToken(token)
    const list = Array.isArray((row.answers as any)?.lawyer_tokens) ? (row.answers as any).lawyer_tokens : []
    const now = new Date()
    return list.some((item: any) => {
      if (!item || !item.hash || !item.expires_at) return false
      if (new Date(item.expires_at) <= now) return false
      return item.hash.length === h.length && crypto.timingSafeEqual(Buffer.from(item.hash), Buffer.from(h))
    })
  },

  async documents(caseId: string): Promise<CaseDocumentRow[]> {
    return check(
      await db().from('case_documents').select('*').eq('case_id', caseId).is('deleted_at', null).order('kind').order('page'),
      'documents',
    ) as CaseDocumentRow[]
  },

  isPaid(row: CaseRow): boolean {
    return Boolean(row.paid_at && row.payment_provider) || PAID_STATUSES.includes(row.status)
  },

  nextStep(row: CaseRow, docs: CaseDocumentRow[]): string {
    if (!row.covered) return 'not_covered'
    const s: CaseStatus = row.status
    if (s === 'reading') return 'reading'
    if (s === 'checking') return 'check'
    if (s === 'building') return 'building'
    if (s === 'ready') return 'ready'
    if (s === 'failed') return row.status_detail === 'build_failed' ? 'check' : 'upload'

    const r = this.readiness(row, docs)
    const docsSatisfied = r.letterPages > 0 && r.contractOk
    if (!docsSatisfied) return 'upload'
    if (!this.isPaid(row)) return 'pay'
    if (!hasCompletedPostPaymentCollection(row)) return 'pay'
    return 'reading'
  },

  readiness(row: CaseRow, docs: CaseDocumentRow[]) {
    const uploaded = docs.filter((d) => d.status === 'uploaded')
    const letterPages = uploaded.filter((d) => d.kind === 'letter').length
    const contractPages = uploaded.filter((d) => d.kind === 'contract').length
    const contractOk = contractPages > 0 || row.contract_status === 'never' || row.contract_status === 'missing'
    return {
      letterPages,
      contractPages,
      contractOk,
      canPay: letterPages > 0 && contractOk,
      canRead: this.isPaid(row) && hasCompletedPostPaymentCollection(row) && letterPages > 0 && contractOk,
    }
  },

  async submitCustomerInfo(caseId: string, input: { name: string; email: string; consentNews?: boolean }, requestId?: string) {
    const c = await this.get(caseId)
    if (!this.isPaid(c)) {
      throw ApiError.badRequest('Payment required before submitting customer details')
    }

    const docs = await this.documents(caseId)
    const r = this.readiness(c, docs)
    if (!r.letterPages || !r.contractOk) {
      throw ApiError.badRequest('Both required documents must exist before processing can begin')
    }

    const cleanName = (input.name || '').trim()
    const cleanEmail = (input.email || '').trim().toLowerCase()
    if (!cleanName) {
      throw ApiError.badRequest('Name is required')
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw ApiError.badRequest('Valid email is required')
    }

    const answers = {
      ...(c.answers || {}),
      customer_name: cleanName,
      name: cleanName,
      ...(c.answers?.employee_name ? {} : { employee_name: cleanName }),
    }

    const consent = {
      ...(c.consent || {}),
      name: cleanName,
      email: cleanEmail,
      remind: !!input.consentNews,
      submitted_at: new Date().toISOString(),
      source: 'post-payment-collection',
    }

    const token = await this.addToken(c)
    const updated = await this.update(caseId, {
      email: cleanEmail,
      answers,
      consent,
      remind: !!input.consentNews,
    })

    // Initiate document processing workflow ONLY on successful save and if not already started
    const alreadyProcessing = ['reading', 'checking', 'building', 'ready'].includes(c.status) || c.call_a !== null
    let processingStarted = false
    if (!alreadyProcessing) {
      const readResult = await flowService.startRead(updated, requestId)
      processingStarted = readResult.started
    }

    const latest = await this.get(caseId)
    const base = env.APP_WEB_URL.replace(/\/$/, '')
    const privateLink = `${base}/report?case=${c.id}&t=${encodeURIComponent(token)}`
    const pdfDownloadUrl = `${base}/cases/${c.id}/report/pdf?t=${encodeURIComponent(token)}`

    let emailDelivery: { status: 'sent' | 'pending' | 'failed' | 'disabled'; sentAt?: string; error?: string; message?: string } = {
      status: env.EMAIL_MODE === 'mock' ? 'disabled' : 'pending',
      ...(env.EMAIL_MODE === 'mock' ? { message: 'Email delivery is disabled in demo mode. You can access your report here.' } : {}),
    }

    if (env.EMAIL_MODE === 'live' && latest.status === 'ready' && latest.report_ready_at && latest.report_pdf_path) {
      emailDelivery = await this.deliverReportEmail(latest, token, false)
    }

    return {
      success: true,
      case: this.view(latest, docs),
      customer: { name: cleanName, email: cleanEmail },
      privateLink,
      pdfDownloadUrl,
      emailDelivery,
      processingStarted,
    }
  },

  async deliverReportEmail(c: CaseRow, token?: string, forceRetry = false) {
    if (!this.isPaid(c)) {
      throw ApiError.badRequest('Payment required before report delivery')
    }
    if (!c.email) {
      throw ApiError.unprocessable('Customer email is required for report delivery')
    }
    if (c.status !== 'ready' || !c.report_ready_at) {
      return { status: 'pending' as const, message: 'Report is still being compiled' }
    }
    if (!c.report_pdf_path) {
      return { status: 'pending' as const, message: 'PDF report is still being generated' }
    }

    if (env.EMAIL_MODE === 'mock') {
      return {
        status: 'disabled' as const,
        message: 'Email delivery is disabled in demo mode. You can access your report here.',
        to: c.email,
        mocked: true,
      }
    }

    const deliveryRecord = getAuthoritativeDelivery(c)
    if (deliveryRecord?.status === 'sent' && deliveryRecord?.to === c.email && !forceRetry) {
      return {
        status: 'sent' as const,
        sentAt: deliveryRecord.sentAt,
        alreadySent: true,
        to: deliveryRecord.to,
      }
    }

    const activeToken = typeof token === 'string' && token.trim() ? token : (await this.addToken(c))
    const lawyerToken = await this.createLawyerToken(c)
    try {
      const res = await emailService.reportReady(c, activeToken, undefined, lawyerToken)
      const now = new Date().toISOString()
      if (res.sent) {
        const reportDelivery = {
          status: 'sent',
          sentAt: now,
          resendId: res.id || null,
          to: c.email,
          mocked: false,
          attempts: (deliveryRecord?.attempts || 0) + 1,
        }
        const fresh = await this.get(c.id).catch(() => c)
        await this.update(fresh.id, {
          answers: { ...(fresh.answers || {}), report_delivery: reportDelivery },
          consent: { ...(fresh.consent || {}), report_delivery: reportDelivery },
        })
        return { status: 'sent' as const, sentAt: now, to: c.email, resendId: res.id }
      } else {
        const reportDelivery = {
          status: 'failed',
          failedAt: now,
          error: (res as any).error || (res as any).reason || 'Email provider could not send',
          to: c.email,
          attempts: (deliveryRecord?.attempts || 0) + 1,
        }
        const fresh = await this.get(c.id).catch(() => c)
        await this.update(fresh.id, {
          answers: { ...(fresh.answers || {}), report_delivery: reportDelivery },
          consent: { ...(fresh.consent || {}), report_delivery: reportDelivery },
        })
        return { status: 'failed' as const, error: reportDelivery.error, to: c.email }
      }
    } catch (err: any) {
      const now = new Date().toISOString()
      const reportDelivery = {
        status: 'failed',
        failedAt: now,
        error: err.message || 'Email delivery failed',
        to: c.email,
        attempts: (deliveryRecord?.attempts || 0) + 1,
      }
      const fresh = await this.get(c.id).catch(() => c)
      await this.update(fresh.id, {
        answers: { ...(fresh.answers || {}), report_delivery: reportDelivery },
        consent: { ...(fresh.consent || {}), report_delivery: reportDelivery },
      })
      return { status: 'failed' as const, error: reportDelivery.error, to: c.email }
    }
  },

  async getDeliveryStatus(caseId: string) {
    const c = await this.get(caseId)
    const delivery = getAuthoritativeDelivery(c)
    return {
      paid: this.isPaid(c),
      reportReady: c.status === 'ready' && !!c.report_ready_at,
      customer: {
        name: c.answers?.customer_name || c.answers?.name || null,
        email: c.email || null,
      },
      delivery: delivery ? {
        status: delivery.status,
        sentAt: delivery.sentAt || null,
        failedAt: delivery.failedAt || null,
        error: delivery.error || null,
        to: delivery.to || c.email,
        alreadySent: delivery.status === 'sent',
      } : {
        status: env.EMAIL_MODE === 'mock' ? 'disabled' : (c.email ? 'pending' : 'no_email'),
        message: env.EMAIL_MODE === 'mock' ? 'Email delivery is disabled in demo mode. You can access your report here.' : undefined,
        sentAt: null,
        failedAt: null,
        error: null,
        to: c.email || null,
        alreadySent: false,
      },
      emailMode: env.EMAIL_MODE,
    }
  },

  view(row: CaseRow, docs: CaseDocumentRow[] = []) {
    const r = this.readiness(row, docs)
    return {
      id: row.id,
      publicId: row.public_id,
      platform: row.platform,
      country: row.country,
      jurisdiction: row.jurisdiction,
      covered: row.covered,
      status: row.status,
      statusDetail: row.status_detail,
      nextStep: this.nextStep(row, docs),
      answers: row.answers,
      freeResult: row.free_result,
      paid: this.isPaid(row),
      paidAt: row.paid_at,
      payment: row.paid_at ? { provider: row.payment_provider, amountCents: row.amount_cents, currency: row.currency } : null,
      email: row.email,
      customerName: row.answers?.customer_name || row.answers?.name || null,
      hasCompletedCustomerInfo: hasCompletedPostPaymentCollection(row),
      consent: row.consent,
      reportDelivery: getAuthoritativeDelivery(row),
      remind: row.remind,
      contractStatus: row.contract_status,
      documents: {
        letterPages: r.letterPages,
        contractPages: r.contractPages,
        canRead: r.canRead && !['reading', 'building'].includes(row.status),
        deletedAt: row.docs_deleted_at,
        deleteAfter: row.docs_delete_after,
      },
      report: row.report_id
        ? { reportId: row.report_id, readyAt: row.report_ready_at, deleteAfter: row.report_delete_after, available: !!row.report }
        : null,
      report_pdf_path: row.report_pdf_path,
      hasExtractedDocs: Boolean(row.call_a?.facts && row.call_a.facts.length > 0),
      extractedFacts: row.call_a?.facts || null,
      attestedAt: row.attested_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },
}
