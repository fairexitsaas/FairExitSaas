/**
 * Loads the client's prompt file (backend/prompts/report-prompt-v0.6.txt) WITHOUT changing it.
 *
 * The file is split on its own "=== ... ===" headings and each call gets:
 *   Call A  : SHARED INPUT + CALL A   (the two {jurisdiction.words.*} placeholders are filled in)
 *   Call A2 : CALL A2
 *   Call B  : SHARED INPUT + CALL B
 * "NOTES FOR PHASE 1" and "CHANGES" are for engineers and are not sent to the model.
 * The file's SHA-256 is stored with every AI call so a report can be traced to the exact prompt.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { Jurisdiction } from './jurisdictions'

export const PROMPT_VERSION = 'v0.6'
const PROMPT_FILE = 'report-prompt-v0.6.txt'

function resolvePromptPath(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'prompts', PROMPT_FILE), // src/fairexit -> backend/prompts, dist/fairexit -> backend/prompts
    path.resolve(process.cwd(), 'prompts', PROMPT_FILE),
    path.resolve(process.cwd(), 'backend', 'prompts', PROMPT_FILE),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) throw new Error(`Prompt file ${PROMPT_FILE} not found (looked in ${candidates.join(', ')})`)
  return found
}

let cache: { text: string; sha256: string; sections: Record<string, string> } | null = null

function load() {
  if (cache) return cache
  const text = fs.readFileSync(resolvePromptPath(), 'utf8')
  const sections: Record<string, string> = {}
  const re = /^=== (.+?) ===\s*$/gm
  const marks: Array<{ title: string; start: number; bodyStart: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) marks.push({ title: m[1], start: m.index, bodyStart: m.index })
  marks.forEach((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length
    sections[mk.title] = text.slice(mk.start, end).trimEnd()
  })
  cache = { text, sha256: crypto.createHash('sha256').update(text).digest('hex'), sections }
  return cache
}

function section(prefix: string): string {
  const { sections } = load()
  const key = Object.keys(sections).find((k) => k.startsWith(prefix))
  if (!key) throw new Error(`Prompt section "${prefix}" missing from ${PROMPT_FILE}`)
  return sections[key]
}

export function promptSha256(): string {
  return load().sha256
}

export function systemPromptCallA(j: Jurisdiction): string {
  const body = section('CALL A ·')
    .split('{jurisdiction.words.letter}').join(j.words.letter)
    .split('{jurisdiction.words.contract}').join(j.words.contract)
  return `${section('SHARED INPUT')}\n\n${body}`
}

export function systemPromptCallA2(): string {
  return section('CALL A2')
}

export function systemPromptCallB(): string {
  return `${section('SHARED INPUT')}\n\n${section('CALL B')}`
}

/** Exposed for the docs/admin endpoint so the team can confirm which prompt is live. */
export function promptInfo() {
  const { sha256, sections } = load()
  return { version: PROMPT_VERSION, file: PROMPT_FILE, sha256, sections: Object.keys(sections) }
}
