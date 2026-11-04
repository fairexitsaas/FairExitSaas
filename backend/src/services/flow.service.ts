/**
 * The paid flow after upload: AI reads (Call A) -> check page (+ second look, Call A2) ->
 * final agreement -> build (Call B) -> ready.
 */
import crypto from 'crypto'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { reserveBackground, releaseBackground, runInBackground } from '../utils/background'
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

const pdfArtifactCache = new Map<string, Buffer>()
const pdfArtifactJobs = new Map<string, Promise<{ buffer: Buffer; stored: boolean }>>()
const PDF_ARTIFACT_CACHE_LIMIT = 3

function rememberPdfArtifact(key: string, buffer: Buffer) {
  if (pdfArtifactCache.size >= PDF_ARTIFACT_CACHE_LIMIT && !pdfArtifactCache.has(key)) {
    const oldest = pdfArtifactCache.keys().next().value
    if (oldest) pdfArtifactCache.delete(oldest)
  }
  pdfArtifactCache.set(key, buffer)
}

async function renderAndStorePdf(c: CaseRow, report: ReportJson, meta: RenderMeta, generationId: string, requestId?: string) {
  const key = `${c.id}:${c.report_id}`
  const existingJob = pdfArtifactJobs.get(key)
  if (existingJob) return existingJob

  const job = (async () => {
    const buffer = pdfArtifactCache.get(key) || await renderReportPdf(report, meta, { requestId, caseId: c.id, reportId: c.report_id || undefined, generationId })
    rememberPdfArtifact(key, buffer)
    const path = `${c.id}/${c.report_id}.pdf`
    const uploadStartedAt = Date.now()
    try {
      await storageService.upload(env.REPORTS_BUCKET, path, buffer, 'application/pdf')
      logger.info('[STORAGE][UPLOAD_COMPLETE]', { requestId, caseId: c.id, reportId: c.report_id, generationId, durationMs: Date.now() - uploadStartedAt, path })
    } catch (error) {
      logger.error('[STORAGE][UPLOAD_ERROR]', { requestId, caseId: c.id, reportId: c.report_id, generationId, durationMs: Date.now() - uploadStartedAt, message: (error as Error).message })
      await caseService.update(c.id, { status: 'ready', status_detail: 'pdf_pending', job_started_at: null })
      return { buffer, stored: false }
    }
    try {
      await caseService.update(c.id, { status: 'ready', status_detail: null, job_started_at: null, report_pdf_path: path })
      pdfArtifactCache.delete(key)
      return { buffer, stored: true }
    } catch (error) {
      logger.error('[REPORT][STATUS_PERSIST_ERROR]', { requestId, caseId: c.id, reportId: c.report_id, generationId, stage: 'pdf_saved', message: (error as Error).message })
      return { buffer, stored: false }
    }
  })()

  pdfArtifactJobs.set(key, job)
  try {
    return await job
  } finally {
    pdfArtifactJobs.delete(key)
  }
}

async function executeReportBuildJob(
  c: CaseRow,
  claimed: CaseRow,
  input: Record<string, unknown>,
  rulesAsOf: string | null,
  generationId: string,
  reportId: string,
  requestedAt: number,
  requestId?: string,
): Promise<{ status: 'ready'; reportId: string; readyAt: string; pdfReady: boolean }> {
  let stage = 'claude'
  let savedReport: ReportJson | undefined
  let done: CaseRow | undefined

  try {
    await caseService.update(c.id, { status_detail: 'claude' })
    const raw = await aiService.callB(c, input, { requestId, caseId: c.id, reportId, generationId })

    stage = 'validation'
    const validationStartedAt = Date.now()
    const { ok, problems, report } = validateShape(raw)
    logger.info('[CLAUDE][JSON_VALIDATION]', { requestId, caseId: c.id, reportId, generationId, ok, durationMs: Date.now() - validationStartedAt, problemCount: problems.length })
    if (!ok) throw new Error('Call B output failed the shape check: ' + problems.join('; '))
    savedReport = report

    const warnings = ruleWarnings(report, (input.sources as Array<{ id: string }>).map((s) => s.id), allowedAmounts(input as Record<string, any>))
    if (warnings.length) logger.warn('[REPORT][RULE_WARNINGS]', { requestId, caseId: c.id, reportId, generationId, warnings })

    stage = 'json_persistence'
    const persistenceStartedAt = Date.now()
    const now = new Date()
    done = await caseService.update(c.id, {
      status: 'building', status_detail: 'pdf', job_started_at: claimed.job_started_at,
      report: { ...report, _meta: { warnings, generated_at: now.toISOString(), rules_as_of: rulesAsOf, model: env.AI_MODE === 'mock' ? 'mock' : env.ANTHROPIC_MODEL, generation_id: generationId } },
      report_ready_at: now.toISOString(),
      report_pdf_path: null,
      docs_delete_after: new Date(now.getTime() + env.RETENTION_DOCS_DAYS * 864e5).toISOString(),
      report_delete_after: new Date(new Date(now).setMonth(now.getMonth() + env.RETENTION_REPORT_MONTHS)).toISOString(),
      rules_version: RULES_VERSION, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256(),
    })
    logger.info('[REPORT][JSON_SAVED]', { requestId, caseId: c.id, reportId, generationId, durationMs: Date.now() - persistenceStartedAt })

    stage = 'pdf'
    const pdfResult = await renderAndStorePdf(done, report, flowService.renderMeta(done), generationId, requestId)
    if (pdfResult.stored) {
      logger.info('[REPORT][COMPLETE]', { requestId, caseId: c.id, reportId, generationId, durationMs: Date.now() - requestedAt, pdfReady: true })
    } else {
      logger.warn('[REPORT][JSON_READY]', { requestId, caseId: c.id, reportId, generationId, durationMs: Date.now() - requestedAt, pdfReady: false, stage: 'pdf_pending' })
    }

    if (done?.email) {
      try {
        const token = await caseService.addToken(done)
        await emailService.reportReady(done, token)
      } catch (error) {
        logger.warn('[REPORT][EMAIL_ERROR]', { requestId, caseId: c.id, reportId, generationId, message: (error as Error).message })
      }
    }

    return {
      status: 'ready',
      reportId,
      readyAt: now.toISOString(),
      pdfReady: pdfResult.stored,
    }
  } catch (error) {
    if (savedReport && (stage === 'json_persistence' || stage === 'pdf')) {
      const latest = done || await caseService.get(c.id).catch(() => null)
      const persistedForThisGeneration = latest?.report && latest.report_ready_at && (latest.report as any)?._meta?.generation_id === generationId
      if (persistedForThisGeneration && latest) {
        await caseService.update(c.id, { status: 'ready', status_detail: 'pdf_pending', job_started_at: null })
        logger.error('[PDF][ERROR]', { requestId, caseId: c.id, reportId, generationId, stage, message: (error as Error).message })
        return {
          status: 'ready',
          reportId,
          readyAt: latest.report_ready_at || new Date().toISOString(),
          pdfReady: false,
        }
      }
    }

    const lastError = (error as Error).message || 'Report generation failed'
    const failedStage = stage
    logger.error('[REPORT][FAILED]', { requestId, caseId: c.id, reportId, generationId, stage, durationMs: Date.now() - requestedAt, message: lastError })
    await caseService.update(c.id, {
      status: 'failed',
      status_detail: stage === 'claude' ? 'claude_failed' : stage === 'validation' ? 'validation_failed' : 'build_failed',
      job_started_at: null,
      report_inputs: {
        ...(claimed?.report_inputs || {}),
        lastError,
        failedStage,
        errorAt: new Date().toISOString(),
      },
    })
    throw error
  }
}

export const flowService = {
  // -------------------------------------------------------------------------
  // AI reads the documents (Call A)
  // -------------------------------------------------------------------------
  async startRead(c: CaseRow, requestId?: string) {
    const docs = await caseService.documents(c.id)
    const r = caseService.readiness(c, docs)

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
        const fresh = await caseService.get(c.id)
        const keep: CheckState = { rows: {}, attested: false, attested_at: null, dismissed: [] }
        for (const [k, v] of Object.entries(fresh.check_state?.rows || {})) if (v.source === 'answers') keep.rows[k] = v
        await caseService.update(c.id, {
          status: 'checking', status_detail: null, call_a: out, call_a_at: new Date().toISOString(), check_state: keep,
          attested_at: null, job_started_at: null, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256(),
        })
      } catch (err) {
        logger.error('Call A failed', { requestId, caseId: c.id, message: (err as Error).message })
        await caseService.update(c.id, {
          status: 'failed',
          status_detail: 'read_failed',
          job_started_at: null,
          report_inputs: {
            ...(c.report_inputs || {}),
            lastError: (err as Error).message || 'Scanner could not read documents',
            failedStage: 'read',
          },
        })
      }
    })
    return { started: true, status: 'reading' }
  },

  readStatus(c: CaseRow) {
    const isFailed = c.status === 'failed'
    return {
      status: c.status,
      statusDetail: c.status_detail,
      done: c.status === 'checking' || c.status === 'building' || c.status === 'ready',
      failed: isFailed,
      error: isFailed ? ((c.report_inputs as any)?.lastError || c.status_detail || 'Document reading failed') : null,
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
    CP.autoConfirmAll(ctx)
    ctx.check.attested = true
    ctx.check.attested_at = new Date().toISOString()
    const saved = await saveCtx(c, ctx)
    return CP.buildModel(ctxOf(saved))
  },

  // -------------------------------------------------------------------------
  // Build the report (Call B)
  // -------------------------------------------------------------------------
  async startBuild(c: CaseRow, requestId?: string) {
    const requestedAt = Date.now()
    const generationKey = `build:${c.id}`
    logger.info('[REPORT][REQUESTED]', { requestId, caseId: c.id, reportId: c.report_id, status: c.status })

    if (c.status === 'building') {
      logger.info('[REPORT][ALREADY_PROCESSING]', { requestId, caseId: c.id, reportId: c.report_id, generationId: (c.report_inputs as any)?.generationId, stage: c.status_detail })
      return { started: false, status: 'building', reportId: c.report_id, generationId: (c.report_inputs as any)?.generationId }
    }

    // Idempotency: If valid report JSON is already saved, NEVER invoke Claude Call B again.
    // Recover only the PDF/storage stage directly.
    if (c.report) {
      if (!c.report_pdf_path) {
        logger.info('[REPORT][RECOVERING_PDF_FROM_SAVED_JSON]', { requestId, caseId: c.id, reportId: c.report_id, generationId: (c.report_inputs as any)?.generationId })
        const pdfResult = await renderAndStorePdf(
          c,
          c.report as unknown as ReportJson,
          this.renderMeta(c),
          (c.report_inputs as any)?.generationId || 'recovery',
          requestId,
        )
        return { started: false, status: 'ready', reportId: c.report_id, readyAt: c.report_ready_at, pdfReady: pdfResult.stored }
      }
      logger.info('[REPORT][ALREADY_COMPLETE]', { requestId, caseId: c.id, reportId: c.report_id, pdfReady: true })
      return { started: false, status: 'ready', reportId: c.report_id, readyAt: c.report_ready_at, pdfReady: true }
    }

    this.assertCheckable(c)
    const ctx = ctxOf(c)
    const model = CP.buildModel(ctx)
    if (!ctx.check.attested) throw ApiError.unprocessable('Tick the final agreement before building your report')
    if (!model.build.allRequiredConfirmed) throw ApiError.unprocessable(model.build.label)

    const preparationStartedAt = Date.now()
    const { input, jurisdiction, engine, rulesAsOf } = buildCallBInput(c, ctx)
    const preparationDurationMs = Date.now() - preparationStartedAt
    const reportId = c.report_id || generateReportId()
    const generationId = crypto.randomUUID()
    logger.info('[REPORT][INPUT_PREPARED]', { requestId, caseId: c.id, reportId, generationId, durationMs: preparationDurationMs })

    if (!reserveBackground(generationKey)) {
      const existingGenerationId = (c.report_inputs as any)?.generationId
      logger.info('[REPORT][ALREADY_PROCESSING]', { requestId, caseId: c.id, reportId: c.report_id, generationId: existingGenerationId, stage: c.report ? 'pdf' : 'claude' })
      return { started: false, status: 'building', reportId: c.report_id, generationId: existingGenerationId }
    }

    let claimed: CaseRow | null
    try {
      claimed = await caseService.claimBuild(c.id, {
        status: 'building', status_detail: 'preparing', job_started_at: new Date().toISOString(), report_id: reportId,
        jurisdiction, jurisdiction_code: jurisdiction.code,
        report_inputs: { input, engine, rulesAsOf, generationId, rules_version: RULES_VERSION, prompt_version: PROMPT_VERSION, prompt_sha256: promptSha256() },
      })
    } catch (error) {
      releaseBackground(generationKey)
      throw error
    }

    if (!claimed) {
      releaseBackground(generationKey)
      const latest = await caseService.get(c.id)
      if (latest.status === 'building' || (latest.status === 'ready' && latest.report)) {
        logger.info(latest.status === 'building' ? '[REPORT][ALREADY_PROCESSING]' : '[REPORT][ALREADY_COMPLETE]', {
          requestId, caseId: c.id, reportId: latest.report_id, generationId: (latest.report_inputs as any)?.generationId, stage: latest.status_detail,
        })
        return { started: false, status: latest.status, reportId: latest.report_id, generationId: (latest.report_inputs as any)?.generationId }
      }
      throw ApiError.conflict('The report cannot be started from the current case status')
    }

    try {
      await assertDailyLimit(c.id, 'B')
    } catch (error) {
      releaseBackground(generationKey)
      await caseService.update(c.id, { status: 'checking', status_detail: null, job_started_at: null })
      throw error
    }

    try {
      const result = await executeReportBuildJob(
        c,
        claimed,
        input,
        rulesAsOf,
        generationId,
        reportId,
        requestedAt,
        requestId,
      )
      releaseBackground(generationKey)
      return {
        started: true,
        status: result.status,
        reportId,
        generationId,
        readyAt: result.readyAt,
        pdfReady: result.pdfReady,
      }
    } catch (err) {
      releaseBackground(generationKey)
      throw err
    }
  },

  reportStatus(c: CaseRow) {
    const isReady = c.status === 'ready' && !!c.report
    const isFailed = c.status === 'failed'
    const lastError = (c.report_inputs as any)?.lastError || null
    const failedStage = (c.report_inputs as any)?.failedStage || null
    return {
      status: c.status,
      statusDetail: c.status_detail,
      reportId: c.report_id,
      generationId: (c.report_inputs as any)?.generationId || null,
      stage: c.status === 'building' ? (c.status_detail || 'building') : isReady && !c.report_pdf_path ? 'pdf_pending' : c.status,
      ready: isReady,
      pdfReady: isReady && !!c.report_pdf_path,
      failed: isFailed,
      error: isFailed ? (lastError || (c.status_detail === 'build_failed' ? 'The AI analysis could not be completed for these documents. Please try again.' : c.status_detail || 'Report generation failed.')) : null,
      failedStage: isFailed ? failedStage : null,
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
      answers: (c.answers || {}) as Record<string, any>,
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
      numbers: meta.numbers || null,
      sources: meta.sources.filter((s) => (report.citations_used || []).includes(s.id)),
    }
  },

  html(c: CaseRow) {
    if (c.status !== 'ready' || !c.report) throw ApiError.conflict('Your report is not ready yet')
    return renderReportHtml(c.report as unknown as ReportJson, this.renderMeta(c))
  },

  async pdf(c: CaseRow, requestId?: string): Promise<Buffer> {
    if (c.status !== 'ready' || !c.report) throw ApiError.conflict('Your report is not ready yet')
    if (c.report_pdf_path) {
      try {
        return await storageService.download(env.REPORTS_BUCKET, c.report_pdf_path)
      } catch {
        /* re-render below */
      }
    }
    try {
      const result = await renderAndStorePdf(
        c,
        c.report as unknown as ReportJson,
        this.renderMeta(c),
        (c.report_inputs as any)?.generationId || 'recovery',
        requestId,
      )
      if (result.stored) {
        logger.info('[REPORT][PDF_RECOVERED]', { requestId, caseId: c.id, reportId: c.report_id, generationId: (c.report_inputs as any)?.generationId })
      }
      return result.buffer
    } catch (e) {
      await caseService.update(c.id, { status: 'ready', status_detail: 'pdf_pending', job_started_at: null })
      logger.error('[PDF][RETRY_ERROR]', { requestId, caseId: c.id, reportId: c.report_id, generationId: (c.report_inputs as any)?.generationId, message: (e as Error).message })
      throw e
    }
  },

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
