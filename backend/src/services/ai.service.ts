/**
 * The three Claude calls from prompt v0.6. Inputs are assembled here; the prompt text itself is
 * loaded unchanged from backend/prompts/report-prompt-v0.6.txt (see fairexit/prompts.ts).
 */
import zlib from 'zlib'
import { db } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { callClaudeJson, ContentBlock, type ClaudeLogContext } from './claude.service'
import { documentService } from './document.service'
import { systemPromptCallA, systemPromptCallA2, systemPromptCallB, promptSha256 } from '../fairexit/prompts'
import { mockCallA, mockCallA2, mockCallB } from '../fairexit/mocks'
import type { CaseRow, CallAOutput, CallA2Output, DocKind } from '../fairexit/types'
import type { Jurisdiction } from '../fairexit/jurisdictions'

type CallName = 'A' | 'A2' | 'B'

function extractTextFromDocx(buffer: Buffer): string {
  try {
    let offset = 0
    while (offset < buffer.length - 4) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const compressionMethod = buffer.readUInt16LE(offset + 8)
        const compressedSize = buffer.readUInt32LE(offset + 18)
        const fileNameLen = buffer.readUInt16LE(offset + 26)
        const extraLen = buffer.readUInt16LE(offset + 28)
        const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen)
        const dataStart = offset + 30 + fileNameLen + extraLen

        if (fileName === 'word/document.xml') {
          let xml = ''
          const slice = buffer.subarray(dataStart, dataStart + compressedSize)
          if (compressionMethod === 8) {
            xml = zlib.inflateRawSync(slice).toString('utf8')
          } else if (compressionMethod === 0) {
            xml = slice.toString('utf8')
          }
          if (xml) {
            return xml
              .replace(/<\/w:p>/g, '\n')
              .replace(/<w:br\/>/g, '\n')
              .replace(/<w:tab\/>/g, '\t')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .trim()
          }
        }
        offset = dataStart + compressedSize
      } else {
        offset++
      }
    }
  } catch (err) {
    logger.warn('Error extracting text from docx', { error: (err as Error).message })
  }
  return buffer.toString('utf8').replace(/[^\x20-\x7E\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function record(caseId: string, call: CallName, r: { status: 'ok' | 'error'; model?: string; usage?: { input_tokens: number; output_tokens: number }; durationMs?: number; error?: string; output?: unknown }) {
  await db().from('ai_calls').insert({
    case_id: caseId, call, status: r.status, model: r.model || env.ANTHROPIC_MODEL,
    input_tokens: r.usage?.input_tokens ?? null, output_tokens: r.usage?.output_tokens ?? null,
    duration_ms: r.durationMs ?? null, error: r.error?.slice(0, 2000) ?? null, output: r.output ?? null, prompt_sha256: promptSha256(),
  }).then(({ error }) => { if (error) logger.warn('ai_calls insert failed', { message: error.message }) })
}

/** "Too many scans today": per-case daily limits on AI calls. */
export async function assertDailyLimit(caseId: string, call: CallName) {
  const limit = call === 'A' ? env.READS_PER_CASE_PER_DAY : call === 'A2' ? env.SECOND_LOOKS_PER_CASE_PER_DAY : env.BUILDS_PER_CASE_PER_DAY
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await db().from('ai_calls').select('id', { count: 'exact', head: true }).eq('case_id', caseId).eq('call', call).gte('created_at', since)
  if ((count || 0) >= limit) {
    throw new ApiError(429, call === 'A' ? 'Too many scans today. Try again tomorrow, or contact us.' : 'Daily limit reached for this report. Try again tomorrow.', [{ code: 'daily_limit', call, limit }])
  }
}

function docTitle(j: Jurisdiction, kind: DocKind) {
  return kind === 'letter' ? j.words.letter : j.words.contract
}

async function documentBlocks(c: CaseRow, j: Jurisdiction, kinds: DocKind[]): Promise<ContentBlock[]> {
  const files = await documentService.loadForAi(c, kinds)
  const blocks: ContentBlock[] = []
  for (const f of files) {
    const label = `${f.kind === 'letter' ? 'letter' : 'contract'}: the person's ${docTitle(j, f.kind)}, file ${f.page} of ${f.pages}`
    blocks.push({ type: 'text', text: `Document ${label}` })
    if (f.mime === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data.toString('base64') }, title: label })
    } else if (f.mime === 'text/plain') {
      blocks.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: f.data.toString('utf8') }, title: label })
    } else if (
      f.mime.includes('wordprocessingml') ||
      f.mime.includes('msword') ||
      f.storagePath?.endsWith('.docx') ||
      f.storagePath?.endsWith('.doc')
    ) {
      const text = extractTextFromDocx(f.data)
      blocks.push({ type: 'document', source: { type: 'text', media_type: 'text/plain', data: text }, title: label })
    } else {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: f.mime, data: f.data.toString('base64') } })
    }
  }
  return blocks
}

export const aiService = {
  /** CALL A · READ THE DOCUMENTS */
  async callA(c: CaseRow, j: Jurisdiction): Promise<CallAOutput> {
    const started = Date.now()
    try {
      let out: CallAOutput
      if (env.AI_MODE === 'mock') {
        out = mockCallA(j, c.contract_status === 'added')
        await record(c.id, 'A', { status: 'ok', model: 'mock', durationMs: Date.now() - started })
        return out
      }
      const docs = await documentBlocks(c, j, c.contract_status === 'added' ? ['letter', 'contract'] : ['letter'])
      const content: ContentBlock[] = [
        { type: 'text', text: `INPUT (JSON):\n${JSON.stringify({ jurisdiction: j, contract_given: c.contract_status === 'added' }, null, 2)}` },
        ...docs,
        { type: 'text', text: 'Return the JSON described in CALL A only.' },
      ]
      const r = await callClaudeJson<CallAOutput>({ system: systemPromptCallA(j), content, maxTokens: env.CALL_A_MAX_TOKENS, label: 'Call A' })
      out = r.json
      if (!out || (!Array.isArray(out.facts) && !out.error)) throw new Error('Call A returned an unexpected shape')
      if (!Array.isArray(out.missing)) out.missing = []
      await record(c.id, 'A', { status: 'ok', model: r.model, usage: r.usage, durationMs: r.durationMs })
      logger.info('[CLAUDE][CALL_A_RESPONSE]', { caseId: c.id, model: r.model, durationMs: r.durationMs, factCount: out.facts.length })
      return out
    } catch (err) {
      await record(c.id, 'A', { status: 'error', error: (err as Error).message, durationMs: Date.now() - started })
      throw err
    }
  },

  /** CALL A2 · SECOND LOOK (one item, one document) */
  async callA2(c: CaseRow, j: Jurisdiction, input: { key: string; person_value: unknown; first_reading: { value: unknown; quote: string | null; where: string | null }; documentKind: DocKind }): Promise<CallA2Output> {
    const started = Date.now()
    try {
      let out: CallA2Output
      if (env.AI_MODE === 'mock') {
        out = mockCallA2(input)
      } else {
        const docs = await documentBlocks(c, j, [input.documentKind])
        if (!docs.length) throw ApiError.conflict('That document is no longer stored, so it cannot be read again')
        const payload = { key: input.key, person_value: input.person_value, first_reading: input.first_reading, document: `the ${docTitle(j, input.documentKind)} attached below` }
        const r = await callClaudeJson<CallA2Output>({
          system: systemPromptCallA2(),
          content: [{ type: 'text', text: `INPUT (JSON):\n${JSON.stringify(payload, null, 2)}` }, ...docs, { type: 'text', text: 'Return the JSON described in CALL A2 only.' }],
          maxTokens: env.CALL_A2_MAX_TOKENS,
          label: 'Call A2',
        })
        out = r.json
        await record(c.id, 'A2', { status: 'ok', model: r.model, usage: r.usage, durationMs: r.durationMs, output: { key: input.key, ...out } })
        return sanitizeA2(out)
      }
      await record(c.id, 'A2', { status: 'ok', model: 'mock', durationMs: Date.now() - started, output: { key: input.key, ...out } })
      return sanitizeA2(out)
    } catch (err) {
      await record(c.id, 'A2', { status: 'error', error: (err as Error).message, durationMs: Date.now() - started })
      throw err
    }
  },

  /** CALL B · WRITE THE REPORT */
  async callB(c: CaseRow, input: Record<string, unknown>, context?: ClaudeLogContext): Promise<Record<string, unknown>> {
    const started = Date.now()
    try {
      if (env.AI_MODE === 'mock') {
        const out = mockCallB(input)
        await record(c.id, 'B', { status: 'ok', model: 'mock', durationMs: Date.now() - started })
        logger.info('[CLAUDE][CALL_B_RESPONSE]', { ...context, model: 'mock', durationMs: Date.now() - started })
        return out
      }
      const r = await callClaudeJson<Record<string, unknown>>({
        system: systemPromptCallB(),
        content: [{ type: 'text', text: `INPUT (JSON):\n${JSON.stringify(input, null, 2)}\n\nReturn the JSON described in OUTPUT only.` }],
        maxTokens: env.CALL_B_MAX_TOKENS,
        label: 'Call B',
        context,
      })
      await record(c.id, 'B', { status: 'ok', model: r.model, usage: r.usage, durationMs: r.durationMs })
      return r.json
    } catch (err) {
      await record(c.id, 'B', { status: 'error', error: (err as Error).message, durationMs: Date.now() - started })
      throw err
    }
  },
}

function sanitizeA2(o: Partial<CallA2Output>): CallA2Output {
  return {
    found_value: o.found_value ?? null,
    quote: o.quote ?? null,
    where: o.where ?? null,
    matches_person: !!o.matches_person,
    confidence: o.confidence === 'high' ? 'high' : 'low',
  }
}
