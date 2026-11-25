/**
 * "Ask a lawyer to contact me" + "/lawyer-request" submissions.
 * Shared with a lawyer: name, email, phone, province/state, and a short summary of answers.
 * Never the uploaded documents or the report.
 *
 * Persistence guarantee: every submission is persisted to `public.leads` FIRST; confirmation
 * emails are sent only after successful DB persistence, and email delivery failures never discard
 * the saved database record.
 */
import { db, check } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { emailService } from './email.service'
import { buildJurisdiction, normalizeCode, Country } from '../fairexit/jurisdictions'
import type { CaseRow, Platform } from '../fairexit/types'
import { ROLE_OPTIONS } from '../fairexit/checkPage'

export function consentText(country: Country, region: string) {
  const W = country === 'US' ? 'attorney' : 'lawyer'
  const Ws = country === 'US' ? 'Attorneys' : 'Lawyers'
  return `Share my name, email, phone and summary with one ${W} in ${region}, who may contact me. ${Ws} pay FairExit a flat advertising fee, never a share of your case. This is not legal advice.`
}

function ageRange(age: unknown) {
  const a = Number(age)
  if (!Number.isFinite(a) || a <= 0) return null
  const lo = Math.floor(a / 5) * 5
  return `${lo}-${lo + 4}`
}

/** The only case details a lawyer ever sees. */
export function leadSummary(c: CaseRow | null) {
  if (!c) return {}
  const a = c.answers || {}
  const rows = c.check_state?.rows || {}
  const confirmed = (k: string) => (rows[k] && (rows[k].status === 'confirmed' || (rows[k].status === 'corrected' && rows[k].change_ack)) ? rows[k].value : null)
  const role = a.roleLabel || ROLE_OPTIONS.find((r) => r.factor === Number(a.roleFactor))?.label || null
  const fr = c.free_result || {}
  return {
    role_level: role,
    years_with_employer: a.years ?? null,
    age_range: ageRange(a.age),
    how_it_ended: a.reason || a.ended || null,
    amount_offered: confirmed('offer_amount') ?? (a.offer || null),
    deadline_to_sign: confirmed('sign_by') ?? confirmed('days_to_decide') ?? a.deadline ?? null,
    flags: {
      clause: a.clause ?? null, contract: a.contract ?? null, red_flag: a.redflag ?? null, already_signed: a.signed ?? null,
      offer_vs_minimum: fr.offer_vs_minimum ?? null, release: a.release ?? null, others_laid_off: a.others ?? null,
    },
  }
}

function leadView(l: any) {
  return { requestId: l.public_id, id: l.id, status: l.status, region: l.region_name, createdAt: l.created_at }
}

const inFlightEmailSends = new Set<string>()

export interface LawyerEmailDeliveryState {
  status: 'pending' | 'sent' | 'failed' | 'disabled' | 'not_applicable'
  attempts: number
  template?: string
  sent_at?: string | null
  last_attempt_at?: string | null
  last_error?: string | null
  resend_id?: string | null
}

async function persistEmailDeliveryState(leadRow: any, state: LawyerEmailDeliveryState): Promise<any> {
  const nextSummary = {
    ...(leadRow.summary || {}),
    email_delivery: state,
  }
  const upd = await db()
    .from('leads')
    .update({ summary: nextSummary, updated_at: new Date().toISOString() })
    .eq('id', leadRow.id)
    .select('*')
    .maybeSingle()
  if (upd.error || !upd.data) {
    return { ...leadRow, summary: nextSummary }
  }
  return upd.data
}

async function sendAndRecordLawyerConfirmationEmail(
  leadRow: any,
  country: Country,
  region: string,
): Promise<{ lead: any; emailDelivery: LawyerEmailDeliveryState }> {
  const existingState: LawyerEmailDeliveryState | undefined = leadRow.summary?.email_delivery
  const templateName = country === 'US' ? 'lawyer-request-email-US' : 'lawyer-request-email-CA'

  if (existingState?.status === 'sent') {
    return { lead: leadRow, emailDelivery: existingState }
  }

  if (inFlightEmailSends.has(leadRow.id)) {
    return {
      lead: leadRow,
      emailDelivery: existingState || { status: 'pending', attempts: 0, template: templateName },
    }
  }

  if (env.EMAIL_MODE !== 'live') {
    const disabledState: LawyerEmailDeliveryState = {
      status: 'disabled',
      attempts: existingState?.attempts || 0,
      template: templateName,
      last_attempt_at: existingState?.last_attempt_at || null,
      last_error: null,
    }
    const updated = await persistEmailDeliveryState(leadRow, disabledState)
    return { lead: updated, emailDelivery: disabledState }
  }

  inFlightEmailSends.add(leadRow.id)
  const attempts = (existingState?.attempts || 0) + 1
  const nowIso = new Date().toISOString()
  try {
    const res = await emailService.lawyerRequestConfirmation({
      to: leadRow.email,
      name: leadRow.name || '',
      country,
      region,
      requestId: leadRow.public_id,
    })

    if (res.sent) {
      const sentState: LawyerEmailDeliveryState = {
        status: 'sent',
        attempts,
        template: templateName,
        sent_at: nowIso,
        last_attempt_at: nowIso,
        last_error: null,
        resend_id: res.id || null,
      }
      const updated = await persistEmailDeliveryState(leadRow, sentState)
      return { lead: updated, emailDelivery: sentState }
    }

    const failedState: LawyerEmailDeliveryState = {
      status: 'failed',
      attempts,
      template: templateName,
      sent_at: null,
      last_attempt_at: nowIso,
      last_error: res.error || res.reason || 'Email delivery failed',
      resend_id: null,
    }
    logger.warn('[LAWYER_REQUEST][EMAIL_FAILED]', {
      requestId: leadRow.public_id,
      leadId: leadRow.id,
      country,
      attempts,
      error: failedState.last_error,
    })
    const updated = await persistEmailDeliveryState(leadRow, failedState)
    return { lead: updated, emailDelivery: failedState }
  } catch (err: any) {
    const failedState: LawyerEmailDeliveryState = {
      status: 'failed',
      attempts,
      template: templateName,
      sent_at: null,
      last_attempt_at: nowIso,
      last_error: err?.message || 'Unexpected email delivery error',
      resend_id: null,
    }
    logger.warn('[LAWYER_REQUEST][EMAIL_EXCEPTION]', {
      requestId: leadRow.public_id,
      leadId: leadRow.id,
      country,
      attempts,
      error: failedState.last_error,
    })
    const updated = await persistEmailDeliveryState(leadRow, failedState)
    return { lead: updated, emailDelivery: failedState }
  } finally {
    inFlightEmailSends.delete(leadRow.id)
  }
}

export const leadService = {
  async create(input: {
    caseRow: CaseRow | null
    caseId?: string
    reportId?: string
    country?: Country
    jurisdictionCode?: string
    regionName?: string
    name?: string
    email: string
    phone?: string
    bestTime?: string
    enquiryType?: string
    sourcePage?: string
    consent?: boolean
    platform: Platform
  }) {
    if (input.consent === false) throw ApiError.unprocessable('Consent is required to submit your enquiry.')
    const email = input.email.trim().toLowerCase()
    if (!email || !email.includes('@')) throw ApiError.unprocessable('Please enter a valid email address.')

    const enquiryType = input.enquiryType?.trim() || 'ask_lawyer'
    const isLawyerRequestPage = enquiryType === 'lawyer_request_page' || input.sourcePage === '/lawyer-request'
    const isChecklist = enquiryType === '3_point_checklist'

    // Validation for lawyer-request page submissions
    if (isLawyerRequestPage) {
      if (!input.name || !input.name.trim()) {
        throw ApiError.unprocessable('Please enter your full name.')
      }
      if (!input.phone || input.phone.replace(/\D/g, '').length < 10) {
        throw ApiError.unprocessable('Please enter a valid 10-digit phone number.')
      }
      // If a caseId was explicitly provided without an authorized caseRow, reject
      if (input.caseId && !input.caseRow) {
        throw ApiError.forbidden('Invalid or unauthorized case context.')
      }
    } else if (input.phone && input.phone.replace(/\D/g, '').length < 10) {
      // General leads: only require 10 digits when phone is given
      throw ApiError.unprocessable('Add your name, a valid email and a 10-digit phone number.')
    }

    // Server-side-only report reference linking (never exposed back to unauthenticated clients)
    let reportCaseRow: CaseRow | null = null
    if (!input.caseRow && input.reportId) {
      const cleanRpt = input.reportId.trim()
      if (/^[A-Za-z0-9_-]{3,64}$/.test(cleanRpt)) {
        const rptRes = await db().from('cases').select('*').eq('report_id', cleanRpt).maybeSingle()
        if (!rptRes.error && rptRes.data) {
          const row = rptRes.data as CaseRow
          if (!row.report_delete_after || new Date(row.report_delete_after).getTime() > Date.now()) {
            reportCaseRow = row
          }
        }
      }
    }

    const c = input.caseRow
    const linkedCase = c || reportCaseRow
    const country: Country = c?.country || reportCaseRow?.country || (input.country === 'US' ? 'US' : 'CA')
    const code = c?.jurisdiction_code || reportCaseRow?.jurisdiction_code || (input.jurisdictionCode ? normalizeCode(input.jurisdictionCode, country) : null)
    const j = code ? buildJurisdiction(code) : null
    const region = input.regionName || j?.name || (country === 'US' ? 'United States' : 'Canada')
    const lawyerWord = country === 'US' ? 'attorney' : 'lawyer'

    // ─────────────────────────────────────────────────────────────
    // PERSIST TO DATABASE FIRST (NEVER send email prior to DB save)
    // Every valid submission creates a new independent DB record.
    // ─────────────────────────────────────────────────────────────
    const consentStatus = input.consent ?? true
    const textConsent = isChecklist ? 'Consent to receive 3-point checklist by email.' : consentText(country, region)
    const baseSummary = leadSummary(linkedCase)
    const templateName = country === 'US' ? 'lawyer-request-email-US' : 'lawyer-request-email-CA'
    const initialDelivery: LawyerEmailDeliveryState = isLawyerRequestPage
      ? { status: env.EMAIL_MODE === 'live' ? 'pending' : 'disabled', attempts: 0, template: templateName }
      : { status: 'not_applicable', attempts: 0 }

    const summary = {
      ...baseSummary,
      ...(input.reportId ? { report_id: input.reportId.trim() } : {}),
      enquiry_type: enquiryType,
      source_page: input.sourcePage || (isLawyerRequestPage ? '/lawyer-request' : null),
      consent: consentStatus,
      ...(isLawyerRequestPage ? { email_delivery: initialDelivery } : {}),
    }

    const basePayload = {
      case_id: linkedCase?.id || input.caseId || null,
      name: input.name ? input.name.trim() : null,
      email,
      phone: input.phone ? input.phone.trim() : null,
      best_time: input.bestTime || null,
      country,
      jurisdiction_code: code,
      region_name: region,
      summary,
      consent_text: textConsent,
      platform: input.platform || 'web',
    }

    let insertRes = await db().from('leads').insert({
      ...basePayload,
      enquiry_type: enquiryType,
      source_page: input.sourcePage || (isLawyerRequestPage ? '/lawyer-request' : null),
      consent: consentStatus,
    }).select('*').single()

    if (insertRes.error && insertRes.error.code === 'PGRST204') {
      // Schema cache missing column: fallback safely to JSONB summary
      insertRes = await db().from('leads').insert(basePayload).select('*').single()
    }

    let lead = check(insertRes, 'lead')

    // ─────────────────────────────────────────────────────────────
    // SEND BRANDED COUNTRY-SPECIFIC EMAIL AFTER DB PERSISTENCE
    // ─────────────────────────────────────────────────────────────
    let emailDelivery: LawyerEmailDeliveryState = initialDelivery
    if (isLawyerRequestPage) {
      logger.info('[LAWYER_REQUEST][SUBMITTED]', {
        requestId: lead.public_id,
        leadId: lead.id,
        country,
        region,
        jurisdictionCode: code,
        caseId: linkedCase ? linkedCase.id : null,
        reportId: input.reportId || null,
        sourcePage: input.sourcePage || '/lawyer-request',
        submittedAt: lead.created_at || new Date().toISOString(),
      })

      const deliveryResult = await sendAndRecordLawyerConfirmationEmail(lead, country, region)
      lead = deliveryResult.lead
      emailDelivery = deliveryResult.emailDelivery
    }

    if (env.EMAIL_MODE === 'live') {
      emailService.opsNewLead(lead.public_id, region).catch((e) => logger.warn('ops email failed', { message: (e as Error).message }))
    }

    return {
      ...leadView(lead),
      duplicate: false,
      ...(isLawyerRequestPage ? { emailDelivery } : {}),
      contactWithinBusinessDays: 2,
      lawyerWord,
    }
  },

  /** Safe retry mechanism for failed lawyer-request confirmation emails (never creates duplicate DB rows or re-sends once sent). */
  async retryConfirmationEmail(idOrPublicId: string) {
    const clean = String(idOrPublicId || '').trim()
    if (!clean) throw ApiError.badRequest('Lead ID is required')

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
    const lookup = isUuid
      ? await db().from('leads').select('*').eq('id', clean).maybeSingle()
      : await db().from('leads').select('*').eq('public_id', clean).maybeSingle()

    if (lookup.error || !lookup.data) throw ApiError.notFound('Lawyer request not found')
    const leadRow = lookup.data
    const prior: LawyerEmailDeliveryState | undefined = leadRow.summary?.email_delivery
    if (prior?.status === 'sent') {
      return { ...leadView(leadRow), alreadySent: true, emailDelivery: prior }
    }

    const country: Country = leadRow.country === 'US' ? 'US' : 'CA'
    const region = leadRow.region_name || (country === 'US' ? 'United States' : 'Canada')
    const res = await sendAndRecordLawyerConfirmationEmail(leadRow, country, region)
    return {
      ...leadView(res.lead),
      alreadySent: false,
      emailDelivery: res.emailDelivery,
    }
  },

  async forCase(caseId: string) {
    const r = await db().from('leads').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return r.data ? leadView(r.data) : null
  },

  retentionMonths: env.RETENTION_LEADS_MONTHS,
}
