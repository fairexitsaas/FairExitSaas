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
import { storageService } from './storage.service'

export interface EmailAttachment {
  filename: string
  content: string // Base64-encoded file content
  content_type?: string
}

let mockTransport: ((to: string, subject: string, text: string, attachments?: EmailAttachment[]) => Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }>) | null = null

function link(c: CaseRow, token: string, path = '') {
  return `${env.APP_WEB_URL.replace(/\/$/, '')}/report${path}?case=${c.id}&t=${encodeURIComponent(token)}`
}

async function send(
  to: string,
  subject: string,
  text: string,
  attachments?: EmailAttachment[]
): Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }> {
  if (mockTransport) {
    return mockTransport(to, subject, text, attachments)
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
    const payload: Record<string, any> = {
      from: env.EMAIL_FROM,
      to: [to.trim()],
      subject,
      text,
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      let errorMsg = `Resend delivery failed with status ${res.status}`
      try {
        const errJson = (await res.json()) as Record<string, any>
        errorMsg = errJson?.message || errJson?.error || errorMsg
      } catch {
        const rawText = await res.text().catch(() => '')
        if (rawText) errorMsg = `${errorMsg}: ${rawText.slice(0, 200)}`
      }
      logger.error('[email:resend_error]', { to, subject, status: res.status, error: errorMsg })
      return { sent: false, error: errorMsg, reason: 'resend_rejected' }
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, any>
    if (!data?.id || typeof data.id !== 'string' || !data.id.trim()) {
      logger.error('[email:invalid_response]', { to, subject, data })
      return { sent: false, error: 'Resend response did not contain a valid email ID', reason: 'invalid_response' }
    }
    logger.info('[email:sent]', { to, subject, id: data.id })
    return { sent: true, id: data.id }
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

  async reportReady(
    c: CaseRow,
    tokenOrPdf?: string | Buffer,
    explicitPdfBuffer?: Buffer
  ): Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }> {
    if (!c.email) return { sent: false, reason: 'no_email' }

    let pdfBytes: Buffer | null = null
    if (Buffer.isBuffer(tokenOrPdf)) {
      pdfBytes = tokenOrPdf
    } else if (Buffer.isBuffer(explicitPdfBuffer)) {
      pdfBytes = explicitPdfBuffer
    } else if (c.report_pdf_path) {
      try {
        pdfBytes = await storageService.download(env.REPORTS_BUCKET, c.report_pdf_path)
      } catch (err: any) {
        if (mockTransport) {
          pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF')
        } else {
          logger.error('[email:pdf_download_error]', { caseId: c.id, path: c.report_pdf_path, error: err.message })
          return { sent: false, reason: 'missing_pdf', error: `Could not retrieve PDF report from storage: ${err.message}` }
        }
      }
    }

    if (!pdfBytes || pdfBytes.byteLength === 0) {
      return { sent: false, reason: 'missing_pdf', error: 'PDF report attachment is required but was not found or is empty' }
    }

    const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25 MB raw buffer limit
    if (pdfBytes.byteLength > MAX_ATTACHMENT_SIZE) {
      logger.error('[email:attachment_too_large]', { caseId: c.id, size: pdfBytes.byteLength })
      return {
        sent: false,
        reason: 'attachment_too_large',
        error: `PDF report size (${(pdfBytes.byteLength / (1024 * 1024)).toFixed(1)}MB) exceeds maximum email attachment limit of 25MB`,
      }
    }

    const attachment: EmailAttachment = {
      filename: 'FairExit-Report.pdf',
      content_type: 'application/pdf',
      content: pdfBytes.toString('base64'),
    }

    return send(
      c.email,
      'Your FairExit Report Is Ready',
      'Your FairExit report is ready. Please find your PDF report attached to this email.',
      [attachment]
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
