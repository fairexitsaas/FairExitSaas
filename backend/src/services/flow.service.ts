/**
 * The paid flow after upload: AI reads (Call A) -> check page (+ second look, Call A2) ->
 * final agreement -> build (Call B) -> ready.
 */
import crypto from 'crypto'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { runInBackground } from '../utils/background'
import { caseService } from './case.service'
import { aiService, assertDailyLimit } from './ai.service'
import { emailService } from './email.service'
import { storageService } from './storage.service'
import { renderReportPdf } from './pdf.service'
import * as CP from '../fairexit/checkPage'
import { buildJurisdiction } from '../fairexit/jurisdictions'
import { buildCallBInput } from '../fairexit/reportInputs'
import { validateShape, ruleWarnings, allowedAmounts, renderReportHtml, reportNumbers, ReportJson, RenderMeta } from '../fairexit/reportOutput'
import { sourcesFor, latestCheckedDate, regionRulesFor } from '../fairexit/regionData'
import { PROMPT_VERSION, promptSha256 } from '../fairexit/prompts'
import { RULES_VERSION } from '../fairexit/severanceRules'
import type { CaseRow, CheckState, DocKind } from '../fairexit/types'

function ctxOf(c: CaseRow): CP.CheckCtx {
  const check: CheckState = c.check_state && c.check_state.rows ? JSON.parse(JSON.stringify(c.check_state)) : { rows: {}, attested: false, attested_at: null }
  return { country: c.country, answers: JSON.parse(JSON.stringify(c.answers || {})), callA: CP.normalizeCallA(c.call_a), contractStatus: c.contract_status, check }
}

async function saveCtx(c: CaseRow, ctx: CP.CheckCtx, extra: Partial<CaseRow> = {}) {
  return caseService.update(c.id, { check_state: ctx.check, answers: ctx.answers, attested_at: ctx.check.attested_at, ...extra })
}

function jurisdictionOf(c: CaseRow) {
  const j = c.jurisdiction || (c.jurisdiction_code ? buildJurisdiction(c.jurisdiction_code) : null)
  if (!j) throw ApiError.badRequest('jurisdiction_not_covered')
  return j
}

function generateReportId() {
  const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const b = crypto.randomBytes(6)
  return 'RPT-' + Array.from(b, (x) => A[x % 32]).join('')
}

export const flowService = {
  // -------------------------------------------------------------------------
  // AI reads the documents (Call A)
  // -------------------------------------------------------------------------
  async startRead(c: CaseRow) {
    const docs = await caseService.documents(c.id)
    const r = caseService.readiness(c, docs)
    if (!caseService.isPaid(c)) throw new ApiError(402, 'Payment is needed first')
    if (c.status === 'reading') return { started: false, status: c.status }
    if (c.status === 'building') throw ApiError.conflict('Your report is being built')
    if (!r.letterPages) throw ApiError.badRequest('Add your severance letter first — the report needs at least that.')
    if (!r.contractOk) throw ApiError.badRequest('Add your contract, or tell us you never signed one / could not add it.')
    const j = jurisdictionOf(c)
    await assertDailyLimit(c.id, 'A')
    const startedAt = new Date().toISOString()
    await caseService.update(c.id, { status: 'reading', status_detail: null, job_started_at: startedAt })

    runInBackground(`read:${c.id}`, 'Call A', async () => {
      try {
        const out = await aiService.callA(c, j)
        if (out.error === 'jurisdiction_not_covered') {
          await caseService.update(c.id, { status: 'failed', status_detail: 'jurisdiction_not_covered', job_started_at: null })
          return
        }
        // a fresh read keeps the person's answer rows and drops document rows (they come from the new read)
        const fresh = await caseService.get(c.id)
        const keep: CheckState = { rows: {}, attested: false, attested_at: null, dismissed: [] }
        for (const [k, v] of Object.entries(fresh.check_state?.rows || {})) if (v.source === 'answers') keep.rows[k] = v
        await caseService.update(c.id, {
          status: 'checking', status_detail: null, call_a: out, call_a_at: new Date().toISOString(), check_state: keep,
          attested_at: null, job_started_at: null, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256(),
        })
      } catch (err) {
        logger.error('Call A failed', { caseId: c.id, message: (err as Error).message })
        await caseService.update(c.id, { status: 'failed', status_detail: 'read_failed', job_started_at: null })
      }
    })
    return { started: true, status: 'reading' }
  },

  readStatus(c: CaseRow) {
    return {
      status: c.status,
      statusDetail: c.status_detail,
      done: c.status === 'checking' || c.status === 'building' || c.status === 'ready',
      failed: c.status === 'failed' && (c.status_detail === 'read_failed' || c.status_detail === 'jurisdiction_not_covered'),
      readAt: c.call_a_at,
      missing: c.call_a?.missing || [],
      lowConfidenceKeys: (c.call_a?.facts || []).filter((f) => f.confidence === 'low').map((f) => f.key),
    }
  },

  // -------------------------------------------------------------------------
  // Check page
  // -------------------------------------------------------------------------
  assertCheckable(c: CaseRow) {
    if (!c.call_a) throw ApiError.conflict('Your documents have not been read yet')
    if (c.status === 'reading') throw ApiError.conflict('Your documents are being read')
    if (c.status === 'building') throw ApiError.conflict('Your report is being built')
  },

  checkModel(c: CaseRow) {
    if (!c.call_a) throw ApiError.conflict('Your documents have not been read yet')
    return CP.buildModel(ctxOf(c))
  },

  async rowAction(c: CaseRow, key: string, body: { action: string; value?: unknown; agreed?: boolean }) {
    this.assertCheckable(c)
    const ctx = ctxOf(c)
    const d = CP.rowDef(ctx, key)
    if (!d) throw ApiError.notFound(`No check row "${key}" on this page`)
    const o = CP.rec(ctx, key)
    let secondLook: unknown = null
    const coerce = (v: unknown) => {
      try {
        return CP.coerce(ctx, key, v)
      } catch (e) {
        throw ApiError.unprocessable((e as Error).message, [{ field: 'value', message: (e as Error).message }])
      }
    }
    const current = () => (d.source === 'answers' ? (d.fromAnswers ? d.fromAnswers(ctx.answers) : null) : o.doc_value)

    switch (body.action) {
      case 'confirm': {
        const v = current()
        if (v === null || v === undefined || v === '') throw ApiError.unprocessable('There is no value to confirm. Use "change" (or answer the question) instead.')
        CP.setRow(ctx, key, v, 'confirmed')
        break
      }
      case 'answer': // "We need one more number" card
      case 'change': {
        const v = coerce(body.value)
        if (d.source === 'answers') {
          CP.setRow(ctx, key, v, 'confirmed', { user: v })
          CP.writeBackToAnswers(ctx, key, v)
          break
        }
        if (o.doc_value === null || o.doc_value === undefined) {
          CP.setRow(ctx, key, v, 'confirmed', { user: v })
          CP.writeBackToAnswers(ctx, key, v)
          break
        }
        if (CP.sameValue(v, o.doc_value)) {
          CP.setRow(ctx, key, o.doc_value, 'confirmed')
          break
        }
        // a different value than the document: second look (Call A2)
        await assertDailyLimit(c.id, 'A2')
        const kind: DocKind = o.source === 'contract' ? 'contract' : 'letter'
        const a2 = await aiService.callA2(c, jurisdictionOf(c), {
          key, person_value: v, first_reading: { value: o.doc_value, quote: o.quote, where: o.where }, documentKind: kind,
        })
        if (a2.matches_person) {
          // the document does say the person's value; our first reading was wrong
          CP.setRow(ctx, key, v, 'confirmed', { doc: v })
          const r = CP.rec(ctx, key)
          if (a2.quote) r.quote = a2.quote
          if (a2.where) r.where = a2.where
        } else {
          o.pending = { value: v, second_look: a2, at: new Date().toISOString() }
          ctx.check.attested = false
          ctx.check.attested_at = null
        }
        secondLook = { ...a2, documentValue: CP.normalizeFoundValue(ctx, key, a2.found_value) }
        break
      }
      case 'use_document': {
        const found = o.pending?.second_look?.found_value
        const docv = found !== null && found !== undefined ? CP.normalizeFoundValue(ctx, key, found) : o.doc_value
        if (docv === null || docv === undefined) throw ApiError.unprocessable('The document has no value for this item')
        const sl = o.pending?.second_look
        CP.setRow(ctx, key, docv, 'confirmed', { doc: docv })
        const r = CP.rec(ctx, key)
        if (sl?.quote) r.quote = sl.quote
        if (sl?.where) r.where = sl.where
        CP.writeBackToAnswers(ctx, key, docv)
        break
      }
      case 'keep_mine': {
        if (!o.pending) throw ApiError.conflict('Nothing to keep: change the value first')
        const sl = o.pending.second_look
        const docv = sl?.found_value !== null && sl?.found_value !== undefined ? CP.normalizeFoundValue(ctx, key, sl.found_value) : o.doc_value
        const mine = o.pending.value
        CP.setRow(ctx, key, mine, 'corrected', { user: mine, doc: docv })
        CP.writeBackToAnswers(ctx, key, mine)
        break
      }
      case 'ack_change': {
        if (o.status !== 'corrected') throw ApiError.conflict('This row has no change to acknowledge')
        if (body.agreed !== true) throw ApiError.unprocessable('Tick the box to confirm your change')
        o.change_ack = true
        o.change_ack_at = new Date().toISOString()
        ctx.check.attested = false
        ctx.check.attested_at = null
        break
      }
      case 'not_in_docs':
        if (d.source === 'answers') throw ApiError.unprocessable('"Not in my documents" is only for document rows')
        CP.setRow(ctx, key, null, 'not_in_docs')
        break
      case 'not_sure':
        CP.setRow(ctx, key, current() ?? null, 'not_sure')
        break
      case 'reset':
        delete ctx.check.rows[key]
        ctx.check.attested = false
        ctx.check.attested_at = null
        break
      default:
        throw ApiError.unprocessable(`Unknown action "${body.action}"`)
    }
    const saved = await saveCtx(c, ctx)
    return { row: key, secondLook, page: CP.buildModel(ctxOf(saved)) }
  },

  async resolveConflict(c: CaseRow, key: string, body: { choice: 'document' | 'answers' | 'other' | 'not_sure'; value?: unknown }) {
    this.assertCheckable(c)
    const ctx = ctxOf(c)
    const card = CP.conflicts(ctx).find((x) => x.key === key)
    if (!card) throw ApiError.notFound(`No open conflict for "${key}"`)
    ctx.check.dismissed = Array.from(new Set([...(ctx.check.dismissed || []), key]))

    if (key === 'years') {
      // contract start date vs "years on the job" (an answers row)
      const v = body.choice === 'document' ? card.document.value : body.choice === 'answers' ? card.answers.value : body.choice === 'other' ? CP.coerce(ctx, 'years', body.value) : null
      if (body.choice === 'not_sure') CP.setRow(ctx, 'years', card.answers.value, 'not_sure')
      else {
        CP.setRow(ctx, 'years', v, 'confirmed', { user: v })
        CP.writeBackToAnswers(ctx, 'years', v)
      }
    } else if (body.choice === 'document') {
      CP.setRow(ctx, key, card.document.value, 'confirmed')
      CP.writeBackToAnswers(ctx, key, card.document.value)
    } else if (body.choice === 'answers') {
      if (card.answers.value === 'unsure') CP.setRow(ctx, key, null, 'not_sure')
      else {
        const v = key === 'days_to_decide' || key === 'advance_notice' ? card.document.value : card.answers.value
        // US range answers ("21 to 44 days") are not a value; the row keeps the document number but is flagged as not sure
        if ((key === 'days_to_decide' || key === 'advance_notice')) CP.setRow(ctx, key, v, 'not_sure')
        else CP.setRow(ctx, key, card.answers.value, 'corrected', { user: card.answers.value, doc: card.document.value })
      }
    } else if (body.choice === 'other') {
      let v: unknown
      try {
        v = CP.coerce(ctx, key, body.value)
      } catch (e) {
        throw ApiError.unprocessable((e as Error).message)
      }
      if (CP.sameValue(v, card.document.value)) CP.setRow(ctx, key, card.document.value, 'confirmed')
      else CP.setRow(ctx, key, v, 'corrected', { user: v, doc: card.document.value })
      CP.writeBackToAnswers(ctx, key, v)
    } else if (body.choice === 'not_sure') {
      CP.setRow(ctx, key, card.document.value, 'not_sure')
    } else {
      throw ApiError.unprocessable('choice must be document, answers, other or not_sure')
    }
    const saved = await saveCtx(c, ctx)
    return CP.buildModel(ctxOf(saved))
  },

  async attest(c: CaseRow, agreed: boolean) {
    this.assertCheckable(c)
    if (!agreed) throw ApiError.unprocessable('Tick the final agreement to continue')
    const ctx = ctxOf(c)
    const m = CP.buildModel(ctx)
    if (!m.build.allRequiredConfirmed) {
      throw ApiError.unprocessable(m.build.label, [{ field: m.build.firstUnconfirmedKey || 'rows', message: 'Not confirmed yet' }])
    }
    ctx.check.attested = true
    ctx.check.attested_at = new Date().toISOString()
    const saved = await saveCtx(c, ctx)
    return CP.buildModel(ctxOf(saved))
  },

  // -------------------------------------------------------------------------
  // Build the report (Call B)
  // -------------------------------------------------------------------------
  async startBuild(c: CaseRow) {
    this.assertCheckable(c)
    const ctx = ctxOf(c)
    const m = CP.buildModel(ctx)
    if (!m.build.enabled) throw ApiError.unprocessable(m.build.allRequiredConfirmed ? 'Tick the final agreement first' : m.build.label)
    await assertDailyLimit(c.id, 'B')
    const { input, jurisdiction, engine, rulesAsOf } = buildCallBInput(c, ctx)
    const reportId = c.report_id || generateReportId()
    await caseService.update(c.id, {
      status: 'building', status_detail: null, job_started_at: new Date().toISOString(), report_id: reportId,
      jurisdiction, jurisdiction_code: jurisdiction.code,
      report_inputs: { input, engine, rulesAsOf, rules_version: RULES_VERSION, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256() },
    })

    runInBackground(`build:${c.id}`, 'Call B', async () => {
      try {
        const raw = await aiService.callB(c, input)
        const { ok, problems, report } = validateShape(raw)
        if (!ok) throw new Error('Call B output failed the shape check: ' + problems.join('; '))
        const warnings = ruleWarnings(report, (input.sources as Array<{ id: string }>).map((s) => s.id), allowedAmounts(input as Record<string, any>))
        if (warnings.length) logger.warn('Call B rule warnings', { caseId: c.id, reportId, warnings })
        const now = new Date()
        const done = await caseService.update(c.id, {
          status: 'ready', status_detail: null, job_started_at: null,
          report: { ...report, _meta: { warnings, generated_at: now.toISOString(), rules_as_of: rulesAsOf, model: env.AI_MODE === 'mock' ? 'mock' : env.ANTHROPIC_MODEL } },
          report_ready_at: now.toISOString(),
          report_pdf_path: null,
          docs_delete_after: new Date(now.getTime() + env.RETENTION_DOCS_DAYS * 864e5).toISOString(),
          report_delete_after: new Date(new Date(now).setMonth(now.getMonth() + env.RETENTION_REPORT_MONTHS)).toISOString(),
          rules_version: RULES_VERSION, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256(),
        })
        if (done.email) {
          const token = await caseService.addToken(done)
          await emailService.reportReady(done, token).catch((e) => logger.warn('report email failed', { message: (e as Error).message }))
        }
      } catch (err) {
        logger.error('Call B failed', { caseId: c.id, message: (err as Error).message })
        await caseService.update(c.id, { status: 'failed', status_detail: 'build_failed', job_started_at: null })
      }
    })
    return { started: true, status: 'building', reportId }
  },

  reportStatus(c: CaseRow) {
    return {
      status: c.status,
      statusDetail: c.status_detail,
      reportId: c.report_id,
      ready: c.status === 'ready' && !!c.report,
      failed: c.status === 'failed' && c.status_detail === 'build_failed',
      readyAt: c.report_ready_at,
      deleteAfter: c.report_delete_after,
    }
  },

  renderMeta(c: CaseRow): RenderMeta {
    const j = jurisdictionOf(c)
    const sources = sourcesFor(j)
    return {
      reportId: c.report_id || 'RPT-PENDING',
      jurisdiction: j,
      sources,
      rulesAsOf: (c.report as any)?._meta?.rules_as_of || latestCheckedDate(sources),
      attestedAt: c.attested_at,
      generatedAt: c.report_ready_at || new Date().toISOString(),
      numbers: reportNumbers((c.report_inputs as any)?.input),
    }
  },

  report(c: CaseRow) {
    if (c.status !== 'ready' || !c.report) throw ApiError.conflict(c.report_id && !c.report && c.report_ready_at ? 'This report was deleted under the 12-month retention rule' : 'Your report is not ready yet')
    const { _meta, ...report } = c.report as Record<string, any>
    const meta = this.renderMeta(c)
    return {
      reportId: c.report_id,
      readyAt: c.report_ready_at,
      deleteAfter: c.report_delete_after,
      jurisdiction: meta.jurisdiction,
      rulesAsOf: meta.rulesAsOf,
      report,
      /** numbers for native graphs: range gauge (CA), legal-minimum card (US), factor values */
      numbers: meta.numbers || null,
      sources: meta.sources.filter((s) => (report.citations_used || []).includes(s.id)),
    }
  },

  html(c: CaseRow) {
    if (c.status !== 'ready' || !c.report) throw ApiError.conflict('Your report is not ready yet')
    return renderReportHtml(c.report as unknown as ReportJson, this.renderMeta(c))
  },

  async pdf(c: CaseRow): Promise<Buffer> {
    if (c.status !== 'ready' || !c.report) throw ApiError.conflict('Your report is not ready yet')
    if (c.report_pdf_path) {
      try {
        return await storageService.download(env.REPORTS_BUCKET, c.report_pdf_path)
      } catch {
        /* re-render below */
      }
    }
    const buf = await renderReportPdf(c.report as unknown as ReportJson, this.renderMeta(c))
    const path = `${c.id}/${c.report_id}.pdf`
    await storageService.upload(env.REPORTS_BUCKET, path, buf, 'application/pdf').catch((e) => logger.warn('PDF cache upload failed', { message: (e as Error).message }))
    await caseService.update(c.id, { report_pdf_path: path })
    return buf
  },

  /** Deadlines & reminders screen: only dates the person confirmed, plus the region's own deadline facts. */
  deadlines(c: CaseRow) {
    const ctx = ctxOf(c)
    const val = (k: string) => CP.confirmedValue(ctx, k)
    const items: Array<{ key: string; label: string; date?: string | null; days?: number | null; note?: string }> = []
    if (c.country === 'CA') {
      if (val('sign_by')) items.push({ key: 'sign_by', label: 'Decide by', date: String(val('sign_by')) })
      if (val('last_day')) items.push({ key: 'last_day', label: 'Last day of work', date: String(val('last_day')) })
      if (val('benefits_end')) items.push({ key: 'benefits_end', label: 'Benefits end', date: String(val('benefits_end')) })
    } else {
      if (val('days_to_decide') != null) items.push({ key: 'days_to_decide', label: 'Days to decide', days: Number(val('days_to_decide')), note: 'Counted from the day you received the agreement.' })
      if (val('take_back') === 'yes') items.push({ key: 'take_back', label: 'Days to change your mind after signing', days: 7 })
      if (val('last_day')) items.push({ key: 'last_day', label: 'Last day of work', date: String(val('last_day')) })
      if (val('final_pay_date')) items.push({ key: 'final_pay_date', label: 'Final pay date', date: String(val('final_pay_date')) })
    }
    const j = c.jurisdiction
    const regional = j && j.regime !== 'us_federal_only'
      ? regionRulesFor(j).filter((r) => r.topic === 'Deadline' && r.status === 'confirmed').map((r) => ({ id: r.id, text: r.fact, sourceId: r.source_id }))
      : []
    return { remind: c.remind, items, regional }
  },
}
