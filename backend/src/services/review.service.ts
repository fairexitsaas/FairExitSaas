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

function isPlaceholderValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return (
    s === '' ||
    s === '—' ||
    s === '-' ||
    s === 'not answered' ||
    s === 'not in your documents yet' ||
    s === 'not in your documents' ||
    s === 'not in your agreement' ||
    s === 'not in your contract' ||
    s === 'not mentioned' ||
    s === 'not specified' ||
    s === 'not added' ||
    s === 'null' ||
    s === 'undefined'
  );
}

function normalizeReviewKey(key: string, country?: string): string {
  const map: Record<string, string> = {
    salary: 'pay',
    pay: 'pay',
    howEnded: 'ended',
    ended: 'ended',
    offerMoney: 'offer_amount',
    offer_amount: 'offer_amount',
    offerNotice: 'notice_weeks',
    notice_weeks: 'notice_weeks',
    offerVacation: 'vacation_on_notice',
    vacation_on_notice: 'vacation_on_notice',
    offerLastDay: 'last_day',
    last_day: 'last_day',
    offerNoticeWorked: 'working_notice_weeks',
    working_notice_weeks: 'working_notice_weeks',
    offerDecideBy: country === 'US' ? 'days_to_decide' : 'sign_by',
    sign_by: 'sign_by',
    days_to_decide: 'days_to_decide',
    offerRelease: 'release_required',
    release_required: 'release_required',
    offerBenefitsEnd: 'benefits_end',
    benefits_end: 'benefits_end',
    contractLimit: 'min_only_clause',
    min_only_clause: 'min_only_clause',
    contractStartDate: 'contract_start',
    contract_start: 'contract_start',
    contractJobTitle: 'job_title_contract',
    job_title_contract: 'job_title_contract',
    employee_name: 'employee_name',
    employeeName: 'employee_name',
    clientName: 'employee_name',
    employer_name: 'employer_name',
    employerName: 'employer_name',
    company: 'employer_name',
    pay_rate: 'pay_rate',
    payRate: 'pay_rate',
    document_place: 'document_place',
    documentPlace: 'document_place',
    location: 'document_place',
  }
  return map[key] || key
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
      answers: c.answers,
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

    // If confirm_all action
    if (input.action === 'confirm_all') {
      const updatedCase = await caseService.get(c.id)
      const res = await flowService.attest(updatedCase, true)
      return { success: true, checkState: res }
    }

    // If batch corrections are provided
    if (input.corrections) {
      for (const [rawK, val] of Object.entries(input.corrections)) {
        const key = normalizeReviewKey(rawK, c.country)
        try {
          await flowService.rowAction(c, key, { action: 'change', value: val })
          await factsRepository.saveCorrectedFact(c.id, key, {
            userValue: val,
            status: 'corrected',
          })
        } catch (err) {
          logger.warn('Batch correction rowAction warning', { key, message: (err as Error).message })
        }
      }
    }

    // If single row action
    let rowResult: any = null
    if (input.key) {
      const targetKey = normalizeReviewKey(input.key, c.country)
      const action = input.action || 'change'

      // When state or province is changed via review key, trigger changeJurisdiction to ensure
      // recalculation of jurisdiction, location mismatch and invalidation of stale report outputs
      if ((targetKey === 'state' || targetKey === 'province') && action === 'change' && typeof input.value === 'string' && input.value.trim()) {
        try {
          const newCountry = targetKey === 'province' ? 'CA' : 'US';
          const jResult = await flowService.changeJurisdiction(c, newCountry, input.value.trim());
          return { success: true, case: jResult.case, page: jResult.page, checkState: (jResult.case as any)?.checkState || (jResult.page as any) };
        } catch (jErr: any) {
          logger.warn('Could not change jurisdiction via review key', { targetKey, value: input.value, error: jErr?.message });
        }
      }

      try {
        rowResult = await flowService.rowAction(c, targetKey, {
          action,
          value: input.value,
          agreed: input.agreed,
        })
      } catch (err: any) {
        // If user attempted 'confirm' on a row where the document didn't have a value:
        if (action === 'confirm' && (err?.message?.includes('no value to confirm') || err?.statusCode === 422)) {
          const isPlaceholder = isPlaceholderValue(input.value);
          if (!isPlaceholder) {
            try {
              rowResult = await flowService.rowAction(c, targetKey, {
                action: 'change',
                value: input.value,
                agreed: input.agreed,
              });
            } catch (fallbackErr: any) {
              logger.info('Could not apply fallback change for unextracted row', {
                targetKey,
                value: input.value,
                reason: fallbackErr?.message,
              });
            }
          } else {
            logger.info('Skipping confirm for empty document row', { targetKey });
          }
        } else {
          logger.warn('rowAction warning', { targetKey, action, error: err?.message });
        }
      }

      // Persist to corrected_facts table
      try {
        const updatedCase = await caseService.get(c.id)
        const rowState: CheckRowState | undefined = updatedCase.check_state?.rows?.[targetKey]
        if (rowState) {
          const status = rowState.status || (rowState.pending ? 'corrected' : 'confirmed')
          const val = rowState.pending ? rowState.pending.value : (rowState.user_value ?? rowState.value ?? input.value)
          if (!isPlaceholderValue(val)) {
            await factsRepository.saveCorrectedFact(c.id, targetKey, {
              userValue: val,
              status,
              changeAck: rowState.change_ack,
              changeAckAt: rowState.change_ack_at,
            })
          }
        }
      } catch (repoErr) {
        logger.warn('factsRepository.saveCorrectedFact failed', { message: (repoErr as Error).message })
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
