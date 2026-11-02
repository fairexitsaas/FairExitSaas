import type { Jurisdiction, Country } from './jurisdictions'

export type CaseStatus = 'free_check' | 'pending_payment' | 'paid' | 'reading' | 'checking' | 'building' | 'ready' | 'failed'
export type ContractStatus = 'added' | 'never' | 'missing'
export type Platform = 'web' | 'ios' | 'android'
export type DocKind = 'letter' | 'contract'

/** Call A output, unedited (prompt v0.6). */
export interface CallAFact {
  key: string
  value: string | null
  document: 'letter' | 'contract' | 'agreement'
  quote?: string | null
  where?: string | null
  confidence?: 'high' | 'low'
}
export interface CallAOutput {
  facts: CallAFact[]
  missing: string[]
  error?: string
}

export interface CallA2Output {
  found_value: string | null
  quote: string | null
  where: string | null
  matches_person: boolean
  confidence: 'high' | 'low'
}

export type RowStatus = 'confirmed' | 'corrected' | 'not_in_docs' | 'not_sure'
export type RowSource = 'answers' | 'letter' | 'contract' | 'agreement'

/** One row of state.check (check-page-spec-v2 section 4), plus server-only bookkeeping. */
export interface CheckRowState {
  value: unknown
  source: RowSource
  status: RowStatus | null
  doc_value: unknown
  user_value: unknown
  quote: string | null
  where: string | null
  change_ack?: boolean
  change_ack_at?: string | null
  /** Server-only: a pending "Change" that is waiting on the second-look decision. */
  pending?: { value: unknown; second_look: CallA2Output | null; at: string } | null
}

export interface CheckState {
  rows: Record<string, CheckRowState>
  attested: boolean
  attested_at: string | null
  dismissed?: string[]
}

export interface CaseRow {
  id: string
  public_id: string
  user_id: string | null
  token_hashes: string[]
  platform: Platform
  country: Country
  jurisdiction_code: string | null
  jurisdiction: Jurisdiction | null
  covered: boolean
  industry: string | null
  answers: Record<string, any>
  free_result: Record<string, any> | null
  status: CaseStatus
  status_detail: string | null
  job_started_at: string | null
  email: string | null
  consent: Record<string, any> | null
  remind: boolean
  paid_at: string | null
  payment_provider: string | null
  amount_cents: number | null
  currency: string | null
  contract_status: ContractStatus | null
  call_a: CallAOutput | null
  call_a_at: string | null
  check_state: CheckState
  attested_at: string | null
  report_id: string | null
  report: Record<string, any> | null
  report_inputs: Record<string, any> | null
  report_ready_at: string | null
  report_pdf_path: string | null
  docs_delete_after: string | null
  docs_deleted_at: string | null
  report_delete_after: string | null
  rules_version: string | null
  prompt_version: string | null
  prompt_sha256: string | null
  created_at: string
  updated_at: string
}

export interface CaseDocumentRow {
  id: string
  case_id: string
  kind: DocKind
  page: number
  storage_path: string
  mime_type: string
  size_bytes: number | null
  original_name: string | null
  status: 'pending' | 'uploaded'
  created_at: string
  deleted_at: string | null
}

export const PAID_STATUSES: CaseStatus[] = ['paid', 'reading', 'checking', 'building', 'ready']
