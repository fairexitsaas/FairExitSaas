/**
 * "Bring your report in" on a new device or after reinstalling the app:
 * email I paid with (+ optional order number) -> 6-digit code by email -> case tokens.
 * Always answers the same way to /start so it never reveals whether an email has a report.
 */
import crypto from 'crypto'
import { db, check } from '../config/db'
import { ApiError } from '../utils/ApiError'
import { emailService } from './email.service'
import { caseService } from './case.service'
import type { CaseRow } from '../fairexit/types'

const CODE_TTL_MIN = 15
const MAX_ATTEMPTS = 5

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

async function paidCases(email: string, orderNumber?: string): Promise<CaseRow[]> {
  let q = db().from('cases').select('*').eq('email', email.trim().toLowerCase()).not('paid_at', 'is', null).order('created_at', { ascending: false }).limit(20)
  if (orderNumber) {
    const on = orderNumber.trim().toUpperCase()
    q = on.startsWith('RPT-') ? q.eq('report_id', on) : q.eq('public_id', on)
  }
  return check(await q, 'cases') as CaseRow[]
}

export const recoveryService = {
  async start(email: string, orderNumber?: string) {
    const cases = await paidCases(email, orderNumber)
    if (cases.length) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
      await db().from('recovery_codes').insert({ email: email.trim().toLowerCase(), code_hash: hash(code), expires_at: new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString() })
      await emailService.recoveryCode(email, code)
    }
    return { sent: true, message: 'If we have a paid report for that email, we sent a 6-digit code. It works for 15 minutes.' }
  },

  async verify(email: string, code: string, orderNumber?: string) {
    const e = email.trim().toLowerCase()
    const r = await db().from('recovery_codes').select('*').eq('email', e).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const row = r.data
    if (!row) throw ApiError.badRequest('That code has expired. Ask for a new one.')
    if (row.attempts >= MAX_ATTEMPTS) throw ApiError.tooManyRequests('Too many tries. Ask for a new code.')
    if (row.code_hash !== hash(code.trim())) {
      await db().from('recovery_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id)
      throw ApiError.badRequest('That code is not right')
    }
    await db().from('recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id)
    const cases = await paidCases(e, orderNumber)
    const out = []
    for (const c of cases) {
      const token = await caseService.addToken(c)
      out.push({ caseId: c.id, caseToken: token, publicId: c.public_id, reportId: c.report_id, status: c.status, country: c.country, region: c.jurisdiction?.name || null, createdAt: c.created_at })
    }
    return { cases: out }
  },
}
