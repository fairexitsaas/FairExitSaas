/**
 * FairExit Call A Prompt Module
 *
 * Source of truth: backend/prompts/prompt-a1/prompt-a1.txt
 * Exact SHA-256: 1f7d19cc6fcf4ccdc81e94447d78868c729990e096c635114563026dd93071d6
 *
 * This module exports the exact system prompt for Call A (Read the Documents),
 * ensuring zero unauthorized alterations to its instructions.
 */
import { systemPromptCallA, systemPromptCallA2, promptSha256, PROMPT_VERSION } from '../fairexit/prompts'
import type { Jurisdiction } from '../fairexit/jurisdictions'

export const CALL_A_PROMPT_VERSION = PROMPT_VERSION

/**
 * The full list of keys defined by Call A. Look for all of them; report what is written:
 */
export const CALL_A_KEYS = [
  'offer_amount',
  'notice_weeks',
  'severance_weeks',
  'last_day',
  'sign_by',
  'benefits_end',
  'release_required',
  'min_only_clause',
  'job_title_now',
  'job_title_contract',
  'contract_start',
  'bonus',
  'bonus_amount',
  'vacation_pay',
  'vacation_on_notice',
  'working_notice_weeks',
  'days_to_decide',
  'take_back',
  'attorney_line',
  'age_list',
  'non_compete',
  'advance_notice',
  'final_pay_date',
  'unused_vacation_payout',
  'contract_mentioned',
  'employee_name',
  'employer_name',
  'pay_rate',
  'document_place',
  'other',
] as const

export type CallAKey = typeof CALL_A_KEYS[number]

/**
 * Returns the exact system prompt for Call A tailored to the jurisdiction
 * by replacing {jurisdiction.words.letter} and {jurisdiction.words.contract}.
 */
export function getCallASystemPrompt(j: Jurisdiction): string {
  return systemPromptCallA(j)
}

/**
 * Returns the exact system prompt for Call A2 (Second look).
 */
export function getCallA2SystemPrompt(): string {
  return systemPromptCallA2()
}

/**
 * Returns SHA-256 hash of Prompt A1 to verify integrity.
 */
export function getPromptHash(): string {
  return promptSha256('A1')
}
