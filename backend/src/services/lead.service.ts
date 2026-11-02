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
  async create(input: { caseRow: CaseRow | null; country?: Country; jurisdictionCode?: string; name: string; email: string; phone: string; bestTime?: string; consent: boolean; platform: Platform }) {
    if (!input.consent) throw ApiError.unprocessable('Tick the box so we can share your details.')
    if (input.phone.replace(/\D/g, '').length < 10) throw ApiError.unprocessable('Add your name, a valid email and a 10-digit phone number.')
    const c = input.caseRow
    const country: Country = c?.country || input.country || 'CA'
    const code = c?.jurisdiction_code || (input.jurisdictionCode ? normalizeCode(input.jurisdictionCode, country) : null)
    const j = code ? buildJurisdiction(code) : null
    const region = j?.name || (country === 'US' ? 'your state' : 'your province')
    if (c) {
      const open = await db().from('leads').select('*').eq('case_id', c.id).in('status', ['new', 'sent']).maybeSingle()
      if (open.data) return { ...leadView(open.data), duplicate: true }
    }
    const lead = check(
      await db().from('leads').insert({
        case_id: c?.id || null, name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(),
        best_time: input.bestTime || null, country, jurisdiction_code: code, region_name: region,
        summary: leadSummary(c), consent_text: consentText(country, region), platform: input.platform,
      }).select('*').single(),
      'lead',
    )
    emailService.opsNewLead(lead.public_id, region).catch((e) => logger.warn('ops email failed', { message: (e as Error).message }))
    return { ...leadView(lead), duplicate: false, contactWithinBusinessDays: 2, lawyerWord: country === 'US' ? 'attorney' : 'lawyer' }
  },

  async forCase(caseId: string) {
    const r = await db().from('leads').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return r.data ? leadView(r.data) : null
  },

  retentionMonths: env.RETENTION_LEADS_MONTHS,
}
