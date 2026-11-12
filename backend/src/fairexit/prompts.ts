/**
 * FairExit Prompts Loader
 *
 * Organizes and loads the prompt files for FairExit:
 *   - Prompt A1 (backend/prompts/prompt-a1/prompt-a1.txt): Call A · Read the Documents (Fact Extraction)
 *   - Prompt A2 (backend/prompts/prompt-a2/prompt-a2.txt): Call A2 · Second Look
 *   - Prompt B  (backend/prompts/prompt-b/prompt-b.txt)  : Call B · Write the Report
 *
 * Each prompt file is individually identifiable and separated by responsibility.
 * SHA-256 hashes are tracked to verify prompt integrity and stored with AI execution logs.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { Jurisdiction } from './jurisdictions'

export const PROMPT_VERSION = 'v0.7'

export type PromptKey = 'A1' | 'A2' | 'B'

export const PROMPT_FILES = {
  A1: path.join('prompt-a1', 'prompt-a1.txt'),
  A2: path.join('prompt-a2', 'prompt-a2.txt'),
  B: path.join('prompt-b', 'prompt-b.txt'),
} as const

interface CachedPrompt {
  raw: string
  sha256: string
  body: string
}

const promptCache: Partial<Record<PromptKey, CachedPrompt>> = {}

export function resolvePromptPath(key: PromptKey): string {
  const relativePath = PROMPT_FILES[key]
  const candidates = [
    path.resolve(__dirname, '..', '..', 'prompts', relativePath), // src/fairexit -> backend/prompts
    path.resolve(process.cwd(), 'prompts', relativePath),
    path.resolve(process.cwd(), 'backend', 'prompts', relativePath),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) {
    throw new Error(`Prompt file for ${key} (${relativePath}) not found (looked in ${candidates.join(', ')})`)
  }
  return found
}

function loadPrompt(key: PromptKey): CachedPrompt {
  if (promptCache[key]) {
    return promptCache[key]!
  }
  const filePath = resolvePromptPath(key)
  const raw = fs.readFileSync(filePath, 'utf8')
  const sha256 = crypto.createHash('sha256').update(raw).digest('hex')

  // Extract the system prompt body, excluding trailing engineer NOTES or CHANGES
  let body = raw
  const notesIdx = body.search(/^=== NOTES FOR PHASE 1/m)
  if (notesIdx !== -1) {
    body = body.slice(0, notesIdx).trimEnd()
  }

  // Strip leading file header if present before the first section
  const firstSectionIdx = body.search(/^=== /m)
  if (firstSectionIdx !== -1) {
    body = body.slice(firstSectionIdx)
  }

  const cached: CachedPrompt = { raw, sha256, body: body.trim() }
  promptCache[key] = cached
  return cached
}

/**
 * Returns SHA-256 hash of the specified prompt (defaults to Prompt A1).
 */
export function promptSha256(which?: 'A1' | 'A' | 'A2' | 'B'): string {
  const key: PromptKey = which === 'B' ? 'B' : which === 'A2' ? 'A2' : 'A1'
  return loadPrompt(key).sha256
}

/**
 * Call A (Prompt A1 · Read the Documents):
 * Extracts facts from the severance letter and/or contract.
 * Replaces jurisdiction placeholders with actual word choices.
 */
export function systemPromptCallA(j: Jurisdiction): string {
  const { body } = loadPrompt('A1')
  return body
    .split('{jurisdiction.words.letter}').join(j.words.letter)
    .split('{jurisdiction.words.contract}').join(j.words.contract)
}

/**
 * Call A2 (Prompt A2 · Second Look):
 * Re-reads a specific single item/document when user questions a reading.
 */
export function systemPromptCallA2(): string {
  return loadPrompt('A2').body
}

/**
 * Call B (Prompt B · Write the Report):
 * Generates the complete report JSON.
 */
export function systemPromptCallB(): string {
  return loadPrompt('B').body
}

/**
 * Exposed for diagnostics and admin endpoints.
 */
export function promptInfo() {
  return {
    version: PROMPT_VERSION,
    prompts: {
      A1: { file: PROMPT_FILES.A1, sha256: promptSha256('A1') },
      A2: { file: PROMPT_FILES.A2, sha256: promptSha256('A2') },
      B: { file: PROMPT_FILES.B, sha256: promptSha256('B') },
    },
  }
}
