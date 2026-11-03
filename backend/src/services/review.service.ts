import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { caseService } from './case.service'
import { documentService } from './document.service'
import { flowService } from './flow.service'
import { extractionService } from './extraction.service'
import { factsRepository } from '../repositories/facts.repository'
import type { CaseRow, CheckRowState } from '../fairexit/types'

async function resolveCase(caseOrDocId: string): Promise<CaseRow> {
  const doc = await documentService.viewDocById(caseOrDocId).catch(() => null)
  const caseId = doc ? doc.caseId : caseOrDocId
  return caseService.get(caseId)
}

export const reviewService = {
  /**
   * Retrieve the complete review information for a case or document.
   * Returns original extracted facts, user-corrected facts, conflicts, and check page model.
   */
  async getReviewData(caseOrDocId: string) {
    const c = await resolveCase(caseOrDocId)
    const { facts: originalFacts, missing } = await extractionService.getExtractedFacts(c.id)
    let correctedFacts = await factsRepository.getCorrectedFacts(c.id)

    // Resilient fallback if table is not yet migrated in remote Supabase instance
    if (!Object.keys(correctedFacts).length && c.check_state?.rows) {
      const fallback: Record<string, any> = {}
      for (const [k, r] of Object.entries(c.check_state.rows)) {
        if (r.status === 'corrected' || r.user_value !== undefined || r.pending) {
          fallback[k] = {
            case_id: c.id,
            fact_key: k,
            user_value: r.pending ? r.pending.value : (r.user_value ?? r.value),
            status: r.status || 'corrected',
            change_ack: r.change_ack,
            change_ack_at: r.change_ack_at,
          }
        }
      }
      if (Object.keys(fallback).length) {
        correctedFacts = fallback
      }
    }

    // Build check page model if Call A has run
    let checkModel = null
    if (c.call_a) {
      checkModel = flowService.checkModel(c)
    }

    return {
      caseId: c.id,
      country: c.country,
      status: c.status,
      originalExtractedFacts: originalFacts,
      missingKeys: missing,
      correctedFacts,
      checkState: c.check_state || { rows: {}, attested: false },
      reviewModel: checkModel,
    }
  },

  /**
   * Save a user correction or review action.
   * NEVER overwrites original extracted facts!
   */
  async saveUserCorrection(
    caseOrDocId: string,
    input: {
      key?: string
      value?: unknown
      action?: string
      agreed?: boolean
      corrections?: Record<string, unknown>
    }
  ) {
    const c = await resolveCase(caseOrDocId)

    logger.info('Saving user correction / review action', {
      caseId: c.id,
      key: input.key,
      action: input.action,
      hasCorrections: !!input.corrections,
    })

    // If batch corrections are provided
    if (input.corrections) {
      for (const [key, val] of Object.entries(input.corrections)) {
        await flowService.rowAction(c, key, { action: 'change', value: val })
        await factsRepository.saveCorrectedFact(c.id, key, {
          userValue: val,
          status: 'corrected',
        })
      }
    }

    // If single row action
    let rowResult: any = null
    if (input.key) {
      const action = input.action || 'change'
      rowResult = await flowService.rowAction(c, input.key, {
        action,
        value: input.value,
        agreed: input.agreed,
      })

      // Persist to corrected_facts table
      const updatedCase = await caseService.get(c.id)
      const rowState: CheckRowState | undefined = updatedCase.check_state?.rows?.[input.key]
      if (rowState) {
        const status = rowState.status || (rowState.pending ? 'corrected' : 'confirmed')
        const val = rowState.pending ? rowState.pending.value : (rowState.user_value ?? rowState.value ?? input.value)
        await factsRepository.saveCorrectedFact(c.id, input.key, {
          userValue: val,
          status,
          changeAck: rowState.change_ack,
          changeAckAt: rowState.change_ack_at,
        })
      }
    }

    // Return the updated review data
    const updatedReview = await this.getReviewData(c.id)

    logger.info('User correction saved successfully', {
      caseId: c.id,
      updatedKey: input.key,
      totalCorrected: Object.keys(updatedReview.correctedFacts).length,
    })

    return {
      success: true,
      rowResult,
      review: updatedReview,
    }
  },
}
