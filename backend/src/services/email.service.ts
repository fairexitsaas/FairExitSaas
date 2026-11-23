/**
 * Transactional email through the Resend HTTP API (no SDK).
 * Governed by EMAIL_MODE:
 *   - 'mock': All email dispatches and Resend HTTP calls are strictly skipped.
 *   - 'live': Real email delivery via Resend HTTP API using RESEND_API_KEY.
 * EMAIL_MODE operates independently of PAYMENTS_MODE.
 */
import fs from 'fs'
import path from 'path'
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

let mockTransport: ((to: string, subject: string, text: string, attachments?: EmailAttachment[], html?: string) => Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }>) | null = null

function link(c: CaseRow, token: string, path = '') {
  return `${env.APP_WEB_URL.replace(/\/$/, '')}/report${path}?case=${c.id}&t=${encodeURIComponent(token)}`
}

const INLINE_REPORT_EMAIL_CA = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Your Severance Report is ready</title>
<style>@media (max-width:620px){.wrap{width:100%!important}.pad{padding:24px 20px!important}h1{font-size:26px!important}}</style></head>
<body style="margin:0;padding:0;background:#F6F4EF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Severance Report is attached as a PDF.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F4EF" style="background:#F6F4EF;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td style="padding:0 4px 18px 4px;"><img src="https://www.fairexit.io/email/fairexit-logo@2x.png" width="160" height="39" alt="FairExit" style="display:block;border:0;width:160px;height:auto;"></td></tr>
<tr><td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E4E0D6;border-radius:14px;padding:36px 40px;">
<h1 style="margin:0 0 14px 0;font-family:Newsreader,Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:600;color:#0D2B23;">Your Severance Report is ready</h1>
<p style="margin:0 0 20px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#17242F;">Hi [First name], your Severance Report is attached as a PDF. Save it somewhere safe.</p><p style="margin:0 0 20px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#17242F;">It puts your offer, the rules that may apply where you work, and the questions to ask HR in one place.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;width:100%"><tr><td align="center" bgcolor="#FFFFFF" style="border:2px solid #0D2B23;border-radius:10px;">
<a href="https://fairexit.io/legal-help" style="display:block;padding:14px 22px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#0D2B23;text-decoration:none;border-radius:10px;">See if a lawyer can help (free)</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid #E4E0D6;"><tr><td style="padding-top:22px;font-family:Newsreader,Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;color:#0D2B23;">What to do next</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0EB28D;width:22px;">1</td>
<td style="padding:0 0 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Start with the "At a glance" page near the front.</td></tr><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0EB28D;width:22px;">2</td>
<td style="padding:0 0 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Use the HR questions before you sign anything.</td></tr><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Check your sign-by date and give yourself time.</td></tr></table>
<p style="margin:10px 0 0 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5B6670;">Can't find the attachment, or have a question? Just reply to this email.</p>
</td></tr>
<tr><td style="padding:22px 8px 0 8px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:#5B6670;" align="center">
<span style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0EB28D;">Challenge your severance offer</span><br>
General information, not legal advice. FairExit is not a law firm, and only a licensed lawyer can tell you what applies to you.<br>
<a href="mailto:support@fairexit.io" style="color:#0D2B23;">support@fairexit.io</a> · <a href="https://fairexit.io" style="color:#0D2B23;">fairexit.io</a></td></tr>
</table></td></tr></table></body></html>`

const INLINE_REPORT_EMAIL_US = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Your Severance Report is ready</title>
<style>@media (max-width:620px){.wrap{width:100%!important}.pad{padding:24px 20px!important}h1{font-size:26px!important}}</style></head>
<body style="margin:0;padding:0;background:#F6F4EF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Severance Report is attached as a PDF.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F4EF" style="background:#F6F4EF;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
<tr><td style="padding:0 4px 18px 4px;"><img src="https://www.fairexit.io/email/fairexit-logo@2x.png" width="160" height="39" alt="FairExit" style="display:block;border:0;width:160px;height:auto;"></td></tr>
<tr><td class="pad" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid #E4E0D6;border-radius:14px;padding:36px 40px;">
<h1 style="margin:0 0 14px 0;font-family:Newsreader,Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;font-weight:600;color:#0D2B23;">Your Severance Report is ready</h1>
<p style="margin:0 0 20px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#17242F;">Hi [First name], your Severance Report is attached as a PDF. Save it somewhere safe.</p><p style="margin:0 0 20px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#17242F;">It puts your offer, the rules that may apply where you work, and the questions to ask HR in one place.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;width:100%"><tr><td align="center" bgcolor="#FFFFFF" style="border:2px solid #0D2B23;border-radius:10px;">
<a href="https://fairexit.io/legal-help" style="display:block;padding:14px 22px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#0D2B23;text-decoration:none;border-radius:10px;">See if an attorney can help (free)</a></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid #E4E0D6;"><tr><td style="padding-top:22px;font-family:Newsreader,Georgia,'Times New Roman',serif;font-size:19px;font-weight:600;color:#0D2B23;">What to do next</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0EB28D;width:22px;">1</td>
<td style="padding:0 0 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Start with the "At a glance" page near the front.</td></tr><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0EB28D;width:22px;">2</td>
<td style="padding:0 0 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Use the HR questions before you sign anything.</td></tr><tr><td valign="top" style="padding:0 12px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0EB28D;width:22px;">3</td>
<td style="padding:0 0 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17242F;">Check your sign-by date and give yourself time.</td></tr></table>
<p style="margin:10px 0 0 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#5B6670;">Can't find the attachment, or have a question? Just reply to this email.</p>
</td></tr>
<tr><td style="padding:22px 8px 0 8px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:#5B6670;" align="center">
<span style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0EB28D;">Challenge your severance offer</span><br>
General information, not legal advice. FairExit is not a law firm, and only a licensed attorney can tell you what applies to you.<br>
<a href="mailto:support@fairexit.io" style="color:#0D2B23;">support@fairexit.io</a> · <a href="https://fairexit.io" style="color:#0D2B23;">fairexit.io</a></td></tr>
</table></td></tr></table></body></html>`

function getReportEmailTemplate(country: string): string {
  const isCanada = country === 'CA'
  const filename = isCanada ? 'report-email-CA.html' : 'report-email-US.html'
  const candidates = [
    path.resolve(process.cwd(), 'codebase', '2026-11-16 Site changes', 'Emails', filename),
    path.resolve(process.cwd(), '..', 'codebase', '2026-11-16 Site changes', 'Emails', filename),
    path.resolve(__dirname, '..', '..', '..', 'codebase', '2026-11-16 Site changes', 'Emails', filename),
  ]

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8')
      }
    } catch {}
  }
  return isCanada ? INLINE_REPORT_EMAIL_CA : INLINE_REPORT_EMAIL_US
}

async function send(
  to: string,
  subject: string,
  text: string,
  attachments?: EmailAttachment[],
  html?: string
): Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }> {
  if (mockTransport) {
    return mockTransport(to, subject, text, attachments, html)
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

    if (html) {
      payload.html = html
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
    explicitPdfBuffer?: Buffer,
    dedicatedLawyerToken?: string
  ): Promise<{ sent: boolean; error?: string; mocked?: boolean; reason?: string; id?: string }> {
    if (!c.email) return { sent: false, reason: 'no_email' }

    let token = ''
    let pdfBytes: Buffer | null = null

    if (typeof tokenOrPdf === 'string') {
      token = tokenOrPdf
      if (Buffer.isBuffer(explicitPdfBuffer)) {
        pdfBytes = explicitPdfBuffer
      }
    } else if (Buffer.isBuffer(tokenOrPdf)) {
      pdfBytes = tokenOrPdf
      if (typeof explicitPdfBuffer === 'string') {
        token = explicitPdfBuffer
      }
    } else if (Buffer.isBuffer(explicitPdfBuffer)) {
      pdfBytes = explicitPdfBuffer
    }

    if (!pdfBytes && c.report_pdf_path) {
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

    const isCanada = c.country === 'CA'
    const countryCode = isCanada ? 'CA' : 'US'
    const lawyerWord = isCanada ? 'lawyer' : 'attorney'

    // Extract recipient first name dynamically from case data
    const rawName = (c as any).customerName || c.answers?.customer_name || c.answers?.name || ''
    const firstName = rawName.trim().split(/\s+/)[0] || 'there'

    // Dedicated lawyer-request token (prefers dedicated fxl_ token, with safe fallback)
    const lawyerToken = dedicatedLawyerToken || (token && token.startsWith('fxl_') ? token : '') || token

    // Secure case-specific CTA link to /lawyer-request using URL fragment (#t=...) to prevent URL leakage
    const appUrl = (env.APP_WEB_URL || 'https://fairexit.io').replace(/\/$/, '')
    const ctaUrl = lawyerToken
      ? `${appUrl}/lawyer-request?case=${c.id}#t=${encodeURIComponent(lawyerToken)}`
      : `${appUrl}/lawyer-request?case=${c.id}`

    // Country-specific HTML email template
    let htmlContent = getReportEmailTemplate(countryCode)
    htmlContent = htmlContent.replace(/\[First name\]/g, firstName)
    htmlContent = htmlContent.replace(/https:\/\/fairexit\.io\/legal-help/g, ctaUrl)

    const textContent = `Hi ${firstName},\n\nYour Severance Report is attached as a PDF. Save it somewhere safe.\n\nIt puts your offer, the rules that may apply where you work, and the questions to ask HR in one place.\n\nSee if a ${lawyerWord} can help (free):\n${ctaUrl}\n\nWhat to do next:\n1. Start with the "At a glance" page near the front.\n2. Use the HR questions before you sign anything.\n3. Check your sign-by date and give yourself time.\n\nCan't find the attachment, or have a question? Just reply to this email.\n\n--\nChallenge your severance offer\nGeneral information, not legal advice. FairExit is not a law firm, and only a licensed ${lawyerWord} can tell you what applies to you.\nsupport@fairexit.io · fairexit.io`

    const attachmentFilename = `FairExit-Severance-Report-${countryCode}.pdf`
    const attachment: EmailAttachment = {
      filename: attachmentFilename,
      content_type: 'application/pdf',
      content: pdfBytes.toString('base64'),
    }

    return send(
      c.email,
      'Your FairExit Severance Report is ready',
      textContent,
      [attachment],
      htmlContent
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
    const toEmail = env.OPS_EMAIL || 'support@fairexit.io'
    if (env.EMAIL_MODE !== 'live' || !toEmail) return Promise.resolve({ sent: false, reason: env.EMAIL_MODE !== 'live' ? 'email_mode_mock' : 'no_ops_email' })
    return send(toEmail, `New lawyer request ${publicId} (${region})`, `A new lawyer request ${publicId} for ${region} is waiting in the ops dashboard.`)
  },
}
