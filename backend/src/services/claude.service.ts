/**
 * Thin Claude Messages API client (no SDK dependency).
 * - Streams the response (Call B can run for minutes with max_tokens 32,000).
 * - Retries 429 / 5xx / 529 with backoff.
 * - Parses the JSON the prompt asks for ("Output is JSON only").
 */
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } | { type: 'text'; media_type: 'text/plain'; data: string }; title?: string }

export interface ClaudeResult<T = unknown> {
  json: T
  rawText: string
  model: string
  stopReason: string | null
  usage: { input_tokens: number; output_tokens: number }
  durationMs: number
}

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504, 529])

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Pull the first complete JSON object out of the model text (tolerates ```json fences). */
export function parseJsonOutput<T = unknown>(text: string): T {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T
    throw new Error('Model output was not valid JSON')
  }
}

async function streamOnce(body: Record<string, unknown>) {
  const res = await fetch(`${env.ANTHROPIC_BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ ...body, stream: true }),
  })
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '')
    const e = new Error(`Claude API ${res.status}: ${errText.slice(0, 500)}`) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let text = ''
  let model = String(body.model)
  let stopReason: string | null = null
  const usage = { input_tokens: 0, output_tokens: 0 }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      let evt: Record<string, any>
      try {
        evt = JSON.parse(dataLine.slice(5).trim())
      } catch {
        continue
      }
      switch (evt.type) {
        case 'message_start':
          model = evt.message?.model || model
          usage.input_tokens = evt.message?.usage?.input_tokens || 0
          break
        case 'content_block_delta':
          if (evt.delta?.type === 'text_delta') text += evt.delta.text
          break
        case 'message_delta':
          stopReason = evt.delta?.stop_reason ?? stopReason
          if (evt.usage?.output_tokens) usage.output_tokens = evt.usage.output_tokens
          break
        case 'error': {
          const e = new Error(`Claude stream error: ${evt.error?.type}: ${evt.error?.message}`) as Error & { status?: number }
          e.status = evt.error?.type === 'overloaded_error' ? 529 : 500
          throw e
        }
      }
    }
  }
  return { text, model, stopReason, usage }
}

export async function callClaudeJson<T = unknown>(opts: {
  system: string
  content: ContentBlock[]
  maxTokens: number
  label: string
}): Promise<ClaudeResult<T>> {
  if (!env.ANTHROPIC_API_KEY) {
    throw ApiError.internal('ANTHROPIC_API_KEY is not set. Set it, or use AI_MODE=mock for local development.')
  }
  const body = {
    model: env.ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: 'user', content: opts.content }],
  }
  const started = Date.now()
  let lastErr: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const out = await streamOnce(body)
      if (out.stopReason === 'max_tokens') {
        throw new Error(`${opts.label}: output hit max_tokens (${opts.maxTokens}); JSON is incomplete`)
      }
      const json = parseJsonOutput<T>(out.text)
      return { json, rawText: out.text, model: out.model, stopReason: out.stopReason, usage: out.usage, durationMs: Date.now() - started }
    } catch (err) {
      lastErr = err
      const status = (err as { status?: number }).status
      const retry = status ? RETRYABLE.has(status) : /fetch failed|ECONNRESET|socket/i.test(String((err as Error).message))
      logger.warn(`Claude ${opts.label} attempt ${attempt} failed`, { status, message: (err as Error).message })
      if (!retry || attempt === 4) break
      await sleep(Math.min(30000, 2000 * 2 ** (attempt - 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}
