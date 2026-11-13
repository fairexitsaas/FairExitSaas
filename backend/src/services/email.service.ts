/**
 * Transactional email through the Resend HTTP API (no SDK).
 * Governed by EMAIL_MODE:
 *   - 'mock': All email dispatches and Resend HTTP calls are strictly skipped.
 *   - 'live': Real email delivery via Resend HTTP API using RESEND_API_KEY.
 * EMAIL_MODE operates independently of PAYMENTS_MODE.
 */
import { env } from '../config/env'
import { logger } from '../utils/logger'
import type { CaseRow } from '../fairexit/types'
import { fmtLongDate } from '../fairexit/values'

let mockTransport: ((to: string, subject: string, text: string) => Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string }>) | null = null

function link(c: CaseRow, token: string, path = '') {
  return `${env.APP_WEB_URL.replace(/\/$/, '')}/report${path}?case=${c.id}&t=${encodeURIComponent(token)}`
}

async function send(to: string, subject: string, text: string): Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }> {
  if (mockTransport) {
    return mockTransport(to, subject, text)
  }

  // 1. Mock mode: Skip all Resend API calls and email dispatches
  if (env.EMAIL_MODE === 'mock') {
    logger.info('[email:mock] delivery skipped (EMAIL_MODE=mock)', { to, subject })
    return { sent: false, reason: 'email_mode_mock', mocked: true }
  }

  // 2. Live mode: Validate Resend credentials and sender/recipient configuration
  if (!env.RESEND_API_KEY || !env.RESEND_API_KEY.trim()) {
    logger.error('[email:error] live email delivery failed: missing RESEND_API_KEY', { to, subject })
    return { sent: false, reason: 'missing_api_key', error: 'RESEND_API_KEY is not configured for live email mode' }
  }

  if (!env.EMAIL_FROM || !env.EMAIL_FROM.trim()) {
    logger.error('[email:error] live email delivery failed: missing EMAIL_FROM', { to, subject })
    return { sent: false, reason: 'invalid_sender', error: 'EMAIL_FROM sender address is not configured' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!to || !emailRegex.test(to.trim())) {
    logger.error('[email:error] invalid recipient address', { to, subject })
    return { sent: false, reason: 'invalid_recipient', error: `Invalid recipient email address: ${to}` }
  }

  // 3. Live mode: Call Resend HTTP API
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to.trim()],
        subject,
        text,
      }),
    })

    if (!res.ok) {
      let errorMsg = `Resend delivery failed with status ${res.status}`
      try {
        const errJson = await res.json()
        errorMsg = errJson?.message || errJson?.error || errorMsg
      } catch {
        const rawText = await res.text().catch(() => '')
        if (rawText) errorMsg = `${errorMsg}: ${rawText.slice(0, 200)}`
      }
      logger.error('[email:resend_error]', { to, subject, status: res.status, error: errorMsg })
      return { sent: false, error: errorMsg, reason: 'resend_rejected' }
    }

    const data = await res.json().catch(() => ({}))
    logger.info('[email:sent]', { to, subject, id: data?.id })
    return { sent: true, id: data?.id }
  } catch (err: any) {
    logger.error('[email:network_error]', { to, subject, error: err.message })
    return { sent: false, error: err.message || 'Network error communicating with Resend', reason: 'network_error' }
  }
}

export const emailService = {
  send,
  setMockTransport(fn: typeof mockTransport) {
    mockTransport = fn
  },

  link,

  paymentReceived(c: CaseRow, token: string) {
    if (env.EMAIL_MODE !== 'live' || !c.email) return Promise.resolve({ sent: false, reason: env.EMAIL_MODE !== 'live' ? 'email_mode_mock' : 'no_email' })
    const w = c.country === 'US' ? 'separation agreement' : 'severance letter and contract'
    return send(c.email, 'Payment received: add your documents to build your Severance Report',
      `Thanks. Your $59 Severance Report is paid.\n\nNext: add your ${w} so we can build your report.\n\nYour private link (no account needed):\n${link(c, token)}\n\nFairExit gives information, not legal advice.`)
  },

  reportReady(c: CaseRow, token: string) {
    if (!c.email) return Promise.resolve({ sent: false, reason: 'no_email' })
    const privateReportUrl = link(c, token)
    return send(
      c.email,
      'Your FairExit Report Is Ready',
      `Your FairExit report is ready.\n\nAccess your report here:\n\n${privateReportUrl}`,
    )
  },

  recoveryCode(email: string, code: string) {
    if (env.EMAIL_MODE !== 'live') return Promise.resolve({ sent: false, reason: 'email_mode_mock' })
    return send(email, 'Your FairExit code', `Your code is ${code}. It works for 15 minutes.\n\nIf you didn't ask for this, you can ignore this email.`)
  },

  deadlineReminder(c: CaseRow, token: string, label: string, isoDate: string) {
    if (env.EMAIL_MODE !== 'live' || !c.email) return Promise.resolve({ sent: false, reason: env.EMAIL_MODE !== 'live' ? 'email_mode_mock' : 'no_email' })
    return send(c.email, `Reminder: ${label} ${fmtLongDate(isoDate)}`,
      `A reminder you asked for: ${label.toLowerCase()} is ${fmtLongDate(isoDate)}.\n\nYour report: ${link(c, token)}\n\nAn offer's own signing deadline is the employer's deadline; you can ask for more time in writing.`)
  },

  opsNewLead(publicId: string, region: string) {
    if (env.EMAIL_MODE !== 'live' || !env.OPS_EMAIL) return Promise.resolve({ sent: false, reason: env.EMAIL_MODE !== 'live' ? 'email_mode_mock' : 'no_ops_email' })
    return send(env.OPS_EMAIL, `New lawyer request ${publicId} (${region})`, `A new lawyer request ${publicId} for ${region} is waiting in the ops dashboard.`)
  },
}
