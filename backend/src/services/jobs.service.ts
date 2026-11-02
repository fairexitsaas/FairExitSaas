/**
 * Scheduled jobs (Notes for Phase 1, item 4):
 *  - documents deleted 30 days after the report is ready (or 30 days after upload if no report)
 *  - report deleted 12 months after it is ready
 *  - lawyer-request contact details deleted 12 months after the request closes
 *  - expired recovery codes removed
 *  - deadline reminder emails for people who ticked "remind me"
 * Run by POST /api/v1/internal/jobs/run (with X-Cron-Secret) from any scheduler, and/or in-process
 * every 6 hours when RUN_JOBS_IN_PROCESS=true.
 */
import { db, check } from '../config/db'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { documentService } from './document.service'
import { storageService } from './storage.service'
import { caseService } from './case.service'
import { emailService } from './email.service'
import type { CaseRow } from '../fairexit/types'
import { addDays } from '../fairexit/values'

export const jobsService = {
  async retention() {
    const now = new Date().toISOString()
    const out = { docsPurged: 0, reportsDeleted: 0, leadsAnonymised: 0, codesRemoved: 0 }

    const dueDocs = check(await db().from('cases').select('id').lt('docs_delete_after', now).is('docs_deleted_at', null).not('status', 'in', '(reading,building)').limit(500), 'cases') as Array<{ id: string }>
    for (const c of dueDocs) {
      await documentService.purge(c.id)
      await caseService.update(c.id, { docs_deleted_at: now })
      out.docsPurged++
    }

    const dueReports = check(await db().from('cases').select('id,report_pdf_path').lt('report_delete_after', now).not('report', 'is', null).limit(500), 'cases') as Array<{ id: string; report_pdf_path: string | null }>
    for (const c of dueReports) {
      if (c.report_pdf_path) await storageService.remove(env.REPORTS_BUCKET, [c.report_pdf_path]).catch(() => undefined)
      await caseService.update(c.id, { report: null, report_inputs: null, call_a: null, report_pdf_path: null, check_state: { rows: {}, attested: false, attested_at: null } })
      out.reportsDeleted++
    }

    const dueLeads = await db().from('leads').update({ name: null, email: null, phone: null, notes: null }).lt('delete_after', now).not('email', 'is', null).select('id')
    out.leadsAnonymised = dueLeads.data?.length || 0

    const codes = await db().from('recovery_codes').delete().lt('expires_at', new Date(Date.now() - 864e5).toISOString()).select('id')
    out.codesRemoved = codes.data?.length || 0
    return out
  },

  /** Emails 3 days and 1 day before a confirmed "Decide by" date (Canada) for people who asked. */
  async reminders() {
    const rows = check(await db().from('cases').select('*').eq('remind', true).not('email', 'is', null).in('status', ['checking', 'building', 'ready']).limit(1000), 'cases') as CaseRow[]
    const today = new Date().toISOString().slice(0, 10)
    let sent = 0
    for (const c of rows) {
      const r = c.check_state?.rows?.sign_by
      const date = r && (r.status === 'confirmed' || (r.status === 'corrected' && r.change_ack)) ? String(r.value) : null
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      if (addDays(today, 3) === date || addDays(today, 1) === date) {
        const token = await caseService.addToken(c)
        await emailService.deadlineReminder(c, token, 'Your decide-by date', date).catch(() => undefined)
        sent++
      }
    }
    return { remindersSent: sent }
  },

  async runAll() {
    const retention = await this.retention()
    const reminders = await this.reminders()
    logger.info('Jobs run', { ...retention, ...reminders })
    return { ...retention, ...reminders }
  },

  startInProcess() {
    if (!env.RUN_JOBS_IN_PROCESS || env.NODE_ENV === 'test' || !env.SUPABASE_SERVICE_ROLE_KEY) return
    const tick = () => this.runAll().catch((e) => logger.error('Jobs failed', { message: (e as Error).message }))
    setTimeout(tick, 60_000).unref()
    setInterval(tick, 6 * 3600_000).unref()
  },
}
