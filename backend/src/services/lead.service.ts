/**
 * "Ask a lawyer to contact me" (phase 1: one lead form, routed by hand by the ops team).
 * Shared with a lawyer: name, email, phone, province/state, and a short summary of answers.
 * Never the uploaded documents or the report.
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
  return { requestId: l.public_id, status: l.status, region: l.region_name, createdAt: l.created_at }
}

export const leadService = {
  async create(input: {
    caseRow: CaseRow | null
    caseId?: string
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
    const isChecklist = enquiryType === '3_point_checklist'

    // If phone is provided, validate length; only require 10 digits when phone is given
    if (input.phone && input.phone.replace(/\D/g, '').length < 10) {
      throw ApiError.unprocessable('Add your name, a valid email and a 10-digit phone number.')
    }

    const c = input.caseRow
    const country: Country = c?.country || (input.country === 'US' ? 'US' : 'CA')
    const code = c?.jurisdiction_code || (input.jurisdictionCode ? normalizeCode(input.jurisdictionCode, country) : null)
    const j = code ? buildJurisdiction(code) : null
    const region = input.regionName || j?.name || (country === 'US' ? 'United States' : 'Canada')

    // Check duplicate by case
    if (c) {
      const open = await db().from('leads').select('*').eq('case_id', c.id).in('status', ['new', 'sent']).maybeSingle()
      if (open.data) return { ...leadView(open.data), duplicate: true }
    }

    // Check duplicate by email & enquiry type
    const openByEmail = await db().from('leads').select('*').eq('email', email).in('status', ['new', 'sent']).maybeSingle()
    if (openByEmail.data) {
      const existingType = openByEmail.data.enquiry_type || openByEmail.data.summary?.enquiry_type || 'ask_lawyer'
      if (existingType === enquiryType) {
        return { ...leadView(openByEmail.data), duplicate: true }
      }
    }

    const consentStatus = input.consent ?? true
    const textConsent = isChecklist ? 'Consent to receive 3-point checklist by email.' : consentText(country, region)
    const baseSummary = leadSummary(c)
    const summary = {
      ...baseSummary,
      enquiry_type: enquiryType,
      source_page: input.sourcePage || null,
      consent: consentStatus,
    }

    const basePayload = {
      case_id: c?.id || input.caseId || null,
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
      source_page: input.sourcePage || null,
      consent: consentStatus,
    }).select('*').single()

    if (insertRes.error && insertRes.error.code === 'PGRST204') {
      // Schema cache missing column: fallback safely to JSONB summary
      insertRes = await db().from('leads').insert(basePayload).select('*').single()
    }

    const lead = check(insertRes, 'lead')
    emailService.opsNewLead(lead.public_id, region).catch((e) => logger.warn('ops email failed', { message: (e as Error).message }))
    return { ...leadView(lead), duplicate: false, contactWithinBusinessDays: 2, lawyerWord: country === 'US' ? 'attorney' : 'lawyer' }
  },

  async forCase(caseId: string) {
    const r = await db().from('leads').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return r.data ? leadView(r.data) : null
  },

  retentionMonths: env.RETENTION_LEADS_MONTHS,
}
