import crypto from 'crypto'
import { db, check } from '../config/db'
import { ApiError } from '../utils/ApiError'
import { computeFreeResult } from '../fairexit/freeCheck'
import { buildJurisdiction, codeFromAnswers, Country } from '../fairexit/jurisdictions'
import { RULES_VERSION } from '../fairexit/severanceRules'
import type { CaseRow, CaseDocumentRow, Platform, CaseStatus } from '../fairexit/types'
import { PAID_STATUSES } from '../fairexit/types'

const STALE_JOB_MS = 20 * 60 * 1000

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
export function newToken(): string {
  return 'fxc_' + crypto.randomBytes(24).toString('base64url')
}

export const caseService = {
  async create(input: { country: Country; answers: Record<string, any>; platform: Platform; industry?: string | null; userId?: string | null }) {
    const token = newToken()
    const code = codeFromAnswers(input.country, input.answers)
    const jurisdiction = code ? buildJurisdiction(code) : null
    const freeResult = computeFreeResult(input.country, input.answers)
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

  /** A job that died with the server (reading/building for > 20 min) becomes "failed" so the person can retry. */
  async healStale(row: CaseRow): Promise<CaseRow> {
    if ((row.status === 'reading' || row.status === 'building') && row.job_started_at && Date.now() - new Date(row.job_started_at).getTime() > STALE_JOB_MS) {
      const detail = row.status === 'reading' ? 'read_failed' : 'build_failed'
      return this.update(row.id, { status: 'failed', status_detail: detail })
    }
    return row
  },

  async update(id: string, patch: Partial<CaseRow>): Promise<CaseRow> {
    return check(await db().from('cases').update(patch).eq('id', id).select('*').single(), 'Case') as CaseRow
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

  async documents(caseId: string): Promise<CaseDocumentRow[]> {
    return check(
      await db().from('case_documents').select('*').eq('case_id', caseId).is('deleted_at', null).order('kind').order('page'),
      'documents',
    ) as CaseDocumentRow[]
  },

  isPaid(row: CaseRow) {
    return PAID_STATUSES.includes(row.status) || (row.status === 'failed' && !!row.paid_at)
  },

  nextStep(row: CaseRow, docs: CaseDocumentRow[]): string {
    if (!row.covered) return 'not_covered'
    const s: CaseStatus = row.status
    if (s === 'free_check' || s === 'pending_payment') return 'pay'
    if (s === 'paid') return 'upload'
    if (s === 'reading') return 'reading'
    if (s === 'checking') return 'check'
    if (s === 'building') return 'building'
    if (s === 'ready') return 'ready'
    if (s === 'failed') return row.status_detail === 'build_failed' ? 'check' : 'upload'
    return docs.length ? 'upload' : 'pay'
  },

  readiness(row: CaseRow, docs: CaseDocumentRow[]) {
    const uploaded = docs.filter((d) => d.status === 'uploaded')
    const letterPages = uploaded.filter((d) => d.kind === 'letter').length
    const contractPages = uploaded.filter((d) => d.kind === 'contract').length
    const contractOk = contractPages > 0 || row.contract_status === 'never' || row.contract_status === 'missing'
    return { letterPages, contractPages, contractOk, canRead: this.isPaid(row) && letterPages > 0 && contractOk }
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
      attestedAt: row.attested_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },
}
