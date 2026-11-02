/**
 * Transactional email through the Resend HTTP API (no SDK). Without RESEND_API_KEY the email is
 * logged instead, so local development works. Marketing email is out of phase 1 (spec v2, round 2).
 */
import { env } from '../config/env'
import { logger } from '../utils/logger'
import type { CaseRow } from '../fairexit/types'
import { fmtLongDate } from '../fairexit/values'

function link(c: CaseRow, token: string, path = '') {
  return `${env.APP_WEB_URL.replace(/\/$/, '')}/report${path}?case=${c.id}&t=${encodeURIComponent(token)}`
}

async function send(to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY) {
    logger.info('[email:dev] not sent (no RESEND_API_KEY)', { to, subject, text })
    return { sent: false }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
  })
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 300)}`)
  return { sent: true }
}

export const emailService = {
  send,

  paymentReceived(c: CaseRow, token: string) {
    if (!c.email) return Promise.resolve({ sent: false })
    const w = c.country === 'US' ? 'separation agreement' : 'severance letter and contract'
    return send(c.email, 'Payment received: add your documents to build your Severance Report',
      `Thanks. Your $59 Severance Report is paid.\n\nNext: add your ${w} so we can build your report.\n\nYour private link (no account needed):\n${link(c, token)}\n\nFairExit gives information, not legal advice.`)
  },

  reportReady(c: CaseRow, token: string) {
    if (!c.email) return Promise.resolve({ sent: false })
    return send(c.email, `Your FairExit Severance Report is ready (${c.report_id})`,
      `Your Severance Report is ready.\n\nOpen it or download the PDF any time with your private link:\n${link(c, token)}\n\nYour documents are deleted 30 days after the report is ready. The report is kept for 12 months.\n\nFairExit gives information, not legal advice.`)
  },

  recoveryCode(email: string, code: string) {
    return send(email, 'Your FairExit code', `Your code is ${code}. It works for 15 minutes.\n\nIf you didn't ask for this, you can ignore this email.`)
  },

  deadlineReminder(c: CaseRow, token: string, label: string, isoDate: string) {
    if (!c.email) return Promise.resolve({ sent: false })
    return send(c.email, `Reminder: ${label} ${fmtLongDate(isoDate)}`,
      `A reminder you asked for: ${label.toLowerCase()} is ${fmtLongDate(isoDate)}.\n\nYour report: ${link(c, token)}\n\nAn offer's own signing deadline is the employer's deadline; you can ask for more time in writing.`)
  },

  opsNewLead(publicId: string, region: string) {
    if (!env.OPS_EMAIL) return Promise.resolve({ sent: false })
    return send(env.OPS_EMAIL, `New lawyer request ${publicId} (${region})`, `A new lawyer request ${publicId} for ${region} is waiting in the ops dashboard.`)
  },
}
