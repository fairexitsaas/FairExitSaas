import { db, check } from '../config/db'
import { logger } from '../utils/logger'
import type { CallAFact, CallAOutput, CheckRowState, CheckState, CaseRow, CaseDocumentRow } from '../fairexit/types'

export interface AnalysisRunRow {
  id?: string
  case_id: string
  document_ids?: string[]
  call_version: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  duration_ms?: number | null
  raw_response?: unknown
  normalized_json?: unknown
  error_info?: string | null
  created_at?: string
  updated_at?: string
}

export interface ExtractedFactRow {
  id?: string
  case_id: string
  analysis_run_id?: string | null
  fact_key: string
  value: string | null
  document_kind: 'letter' | 'contract' | 'agreement'
  quote?: string | null
  where_location?: string | null
  confidence?: 'high' | 'low' | null
  created_at?: string
}

export interface CorrectedFactRow {
  id?: string
  case_id: string
  fact_key: string
  user_value: unknown
  status: 'confirmed' | 'corrected' | 'not_in_docs' | 'not_sure'
  change_ack?: boolean
  change_ack_at?: string | null
  created_at?: string
  updated_at?: string
}

export const factsRepository = {
  /**
   * Save an analysis run record (starts as processing, ends as completed or failed).
   */
  async createAnalysisRun(data: AnalysisRunRow): Promise<string | null> {
    try {
      const res = await db().from('analysis_runs').insert({
        case_id: data.case_id,
        document_ids: data.document_ids || [],
        call_version: data.call_version,
        status: data.status,
        duration_ms: data.duration_ms || null,
        raw_response: data.raw_response || null,
        normalized_json: data.normalized_json || null,
        error_info: data.error_info || null,
      }).select('id').single()

      if (res.data?.id) return res.data.id
    } catch (err) {
      logger.warn('analysis_runs table insert skipped/fallback', { error: (err as Error).message })
    }
    return null
  },

  /**
   * Update an existing analysis run.
   */
  async updateAnalysisRun(id: string, patch: Partial<AnalysisRunRow>): Promise<void> {
    try {
      await db().from('analysis_runs').update({
        ...patch,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    } catch (err) {
      logger.warn('analysis_runs table update skipped/fallback', { error: (err as Error).message })
    }
  },

  /**
   * Save the validated original extracted facts from Call A.
   * Note: These are IMMUTABLE. They are never overwritten by user corrections.
   */
  async saveExtractedFacts(caseId: string, analysisRunId: string | null, facts: CallAFact[]): Promise<void> {
    try {
      if (!facts.length) return
      // Safe cleanup of any previous extracted facts for this case before inserting fresh run
      await db().from('extracted_facts').delete().eq('case_id', caseId)

      const rows: ExtractedFactRow[] = facts.map((f) => ({
        case_id: caseId,
        analysis_run_id: analysisRunId,
        fact_key: f.key,
        value: f.value ?? null,
        document_kind: f.document,
        quote: f.quote ?? null,
        where_location: f.where ?? null,
        confidence: f.confidence ?? null,
      }))

      await db().from('extracted_facts').insert(rows)
    } catch (err) {
      logger.warn('extracted_facts table insert skipped/fallback', { error: (err as Error).message })
    }
  },

  /**
   * Retrieve original extracted facts for a case.
   */
  async getExtractedFacts(caseId: string): Promise<CallAFact[] | null> {
    try {
      const res = await db().from('extracted_facts').select('*').eq('case_id', caseId)
      if (res.data && res.data.length > 0) {
        return res.data.map((r: any) => ({
          key: r.fact_key,
          value: r.value,
          document: r.document_kind,
          quote: r.quote,
          where: r.where_location,
          confidence: r.confidence,
        }))
      }
    } catch (err) {
      logger.warn('extracted_facts table read skipped/fallback', { error: (err as Error).message })
    }
    return null
  },

  /**
   * Save or update a user-corrected fact. Stored separately from extracted facts!
   */
  async saveCorrectedFact(caseId: string, factKey: string, data: {
    userValue: unknown
    status: 'confirmed' | 'corrected' | 'not_in_docs' | 'not_sure'
    changeAck?: boolean
    changeAckAt?: string | null
  }): Promise<void> {
    try {
      const row = {
        case_id: caseId,
        fact_key: factKey,
        user_value: data.userValue,
        status: data.status,
        change_ack: !!data.changeAck,
        change_ack_at: data.changeAckAt || null,
        updated_at: new Date().toISOString(),
      }
      await db().from('corrected_facts').upsert(row, { onConflict: 'case_id,fact_key' })
    } catch (err) {
      logger.warn('corrected_facts table upsert skipped/fallback', { error: (err as Error).message })
    }
  },

  /**
   * Retrieve user-corrected facts for a case.
   */
  async getCorrectedFacts(caseId: string): Promise<Record<string, CorrectedFactRow>> {
    try {
      const res = await db().from('corrected_facts').select('*').eq('case_id', caseId)
      if (res.data && res.data.length > 0) {
        const map: Record<string, CorrectedFactRow> = {}
        for (const r of res.data) {
          map[r.fact_key] = {
            id: r.id,
            case_id: r.case_id,
            fact_key: r.fact_key,
            user_value: r.user_value,
            status: r.status,
            change_ack: r.change_ack,
            change_ack_at: r.change_ack_at,
          }
        }
        return map
      }
    } catch (err) {
      logger.warn('corrected_facts table read skipped/fallback', { error: (err as Error).message })
    }
    return {}
  },
}

