import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { aiService, assertDailyLimit } from './ai.service'
import { caseService } from './case.service'
import { documentService } from './document.service'
import { factsRepository } from '../repositories/facts.repository'
import { callAOutputSchema, CallAOutputValidated } from '../validators/document.validator'
import { CALL_A_PROMPT_VERSION, getPromptHash } from '../prompts/call-a.prompt'
import { buildJurisdiction } from '../fairexit/jurisdictions'
import type { CaseRow, CallAFact, CallAOutput } from '../fairexit/types'

function jurisdictionOf(c: CaseRow) {
  const code = c.jurisdiction_code || (c.country === 'CA' ? 'CA-ON' : 'US-GA')
  const j = c.jurisdiction || buildJurisdiction(code)
  if (!j) throw ApiError.badRequest('jurisdiction_not_covered')
  return j
}

export const extractionService = {
  /**
   * Run Claude Call A on the uploaded documents for a case.
   * Validates schema, persists raw response and normalized facts separately,
   * logs structured sanitized development output.
   */
  async processCaseDocuments(caseId: string): Promise<CallAOutputValidated> {
    const c = await caseService.get(caseId)
    const docs = await caseService.documents(caseId)
    const uploadedDocs = docs.filter((d) => d.status === 'uploaded')
    const docIds = uploadedDocs.map((d) => d.id)

    if (!uploadedDocs.length) {
      throw ApiError.badRequest('No uploaded documents found to process')
    }

    const j = jurisdictionOf(c)
    await assertDailyLimit(c.id, 'A')

    const startTime = Date.now()
    const runId = await factsRepository.createAnalysisRun({
      case_id: c.id,
      document_ids: docIds,
      call_version: CALL_A_PROMPT_VERSION,
      status: 'processing',
    })

    logger.info('Starting document extraction (Call A)', {
      caseId: c.id,
      analysisRunId: runId,
      documentCount: uploadedDocs.length,
      callVersion: CALL_A_PROMPT_VERSION,
      promptSha256: getPromptHash(),
    })

    try {
      // Execute Call A through AI service
      const rawOutput: CallAOutput = await aiService.callA(c, j)
      const durationMs = Date.now() - startTime

      // Validate output shape against strict Zod schema
      const parseResult = callAOutputSchema.safeParse(rawOutput)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
        throw new Error(`Claude Call A output schema validation failed: ${issues}`)
      }

      const validatedOutput = parseResult.data

      // Normalize facts (preserve quote & where, ensure strings)
      const normalizedFacts: CallAFact[] = validatedOutput.facts.map((f) => ({
        key: f.key,
        value: f.value ?? null,
        document: f.document,
        quote: f.quote ?? null,
        where: f.where ?? null,
        confidence: f.confidence || 'high',
      }))

      // Persist raw response and normalized JSON in analysis_runs
      if (runId) {
        await factsRepository.updateAnalysisRun(runId, {
          status: 'completed',
          duration_ms: durationMs,
          raw_response: rawOutput,
          normalized_json: { facts: normalizedFacts, missing: validatedOutput.missing },
        })
      }

      // Persist original validated extracted facts (IMMUTABLE)
      await factsRepository.saveExtractedFacts(c.id, runId, normalizedFacts)

      // Also sync case state so existing review flow has immediate access
      const keep = { rows: {}, attested: false, attested_at: null, dismissed: [] }
      for (const [k, v] of Object.entries(c.check_state?.rows || {})) {
        if (v.source === 'answers') (keep.rows as any)[k] = v
      }

      await caseService.update(c.id, {
        status: 'checking',
        status_detail: null,
        call_a: { facts: normalizedFacts, missing: validatedOutput.missing },
        call_a_at: new Date().toISOString(),
        check_state: keep,
        attested_at: null,
        job_started_at: null,
        prompt_version: CALL_A_PROMPT_VERSION,
        prompt_sha256: getPromptHash(),
      })

      // Development Logging (Sanitized JSON)
      logger.info('Claude Call A document processing completed', {
        caseId: c.id,
        analysisRunId: runId,
        durationMs,
        status: 'completed',
        extractedFactsCount: normalizedFacts.length,
        missingKeysCount: validatedOutput.missing.length,
        factsSummary: normalizedFacts.map((f) => ({ key: f.key, confidence: f.confidence, where: f.where })),
      })

      return {
        facts: normalizedFacts,
        missing: validatedOutput.missing,
      }
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = (err as Error).message

      if (runId) {
        await factsRepository.updateAnalysisRun(runId, {
          status: 'failed',
          duration_ms: durationMs,
          error_info: errorMessage,
        })
      }

      await caseService.update(c.id, {
        status: 'failed',
        status_detail: 'read_failed',
        call_a: null,
        job_started_at: null,
      })

      logger.error('Claude Call A document processing failed', {
        caseId: c.id,
        analysisRunId: runId,
        durationMs,
        error: errorMessage,
      })

      throw err
    }
  },

  /**
   * Retrieve the original extracted facts for a case or document.
   */
  async getExtractedFacts(caseOrDocId: string): Promise<{ facts: CallAFact[]; missing: string[] }> {
    let caseId = caseOrDocId
    // Check if ID is a document ID
    const doc = await documentService.viewDocById(caseOrDocId).catch(() => null)
    if (doc) {
      caseId = doc.caseId
    }

    // Check repository first
    const repoFacts = await factsRepository.getExtractedFacts(caseId)
    const c = await caseService.get(caseId)

    if (repoFacts && repoFacts.length > 0) {
      return {
        facts: repoFacts,
        missing: c.call_a?.missing || [],
      }
    }

    if (c.call_a?.facts) {
      return {
        facts: c.call_a.facts,
        missing: c.call_a.missing || [],
      }
    }

    return { facts: [], missing: [] }
  },
}
