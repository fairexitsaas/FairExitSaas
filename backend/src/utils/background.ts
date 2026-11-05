import { logger } from './logger'
import { instanceAgeS } from './diagnostics'

/**
 * Runs long AI work (Call A, Call B) after the HTTP response has gone out.
 * Clients poll GET /cases/:id (or the /read and /report status endpoints).
 * Phase 1 runs jobs in the API process; a job that dies with the process is marked failed after
 * 20 minutes (caseService.healStale) and the person can retry. Swap for a queue if volume grows.
 */
const running = new Set<string>()

/**
 * On Vercel the function is frozen as soon as the response is sent, which killed Call B halfway
 * ("Report generation timed out"). waitUntil() from @vercel/functions keeps the invocation alive
 * until the job finishes (up to maxDuration in vercel.json). On a normal server this is a no-op.
 */
/** Returns true when the job is protected by waitUntil. checkOnly: just report, don't register. */
function keepAlive(job: Promise<void> | null, label: string, checkOnly = false): boolean {
  if (!process.env.VERCEL) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { waitUntil } = require('@vercel/functions') as { waitUntil: (p: Promise<unknown>) => void }
    if (!checkOnly && job) waitUntil(job)
    return true
  } catch {
    if (!checkOnly) logger.error('[JOB][NO_WAIT_UNTIL] Install @vercel/functions, or Vercel will stop this job early', { label })
    return false
  }
}

export function reserveBackground(key: string): boolean {
  if (running.has(key)) return false
  running.add(key)
  return true
}

export function releaseBackground(key: string) {
  running.delete(key)
}

/** Schedule a task whose key was reserved synchronously before asynchronous DB work. */
export function runReservedBackground(key: string, label: string, fn: () => Promise<void>): boolean {
  if (!running.has(key)) return false
  const startedAt = Date.now()
  const kept = keepAlive(null, label, true)
  logger.info('[JOB][START]', { key, label, platform: process.env.VERCEL ? 'vercel' : 'server', waitUntil: kept, instanceAgeS: instanceAgeS() })
  const job = new Promise<void>((resolve) => {
    setImmediate(() => {
      fn()
        .then(() => logger.info('[JOB][END]', { key, label, ok: true, durationMs: Date.now() - startedAt }))
        .catch((err) => logger.error('[JOB][END]', { key, label, ok: false, durationMs: Date.now() - startedAt, message: (err as Error).message, stack: (err as Error).stack }))
        .finally(() => {
          running.delete(key)
          resolve()
        })
    })
  })
  keepAlive(job, label)
  return true
}

export function runInBackground(key: string, label: string, fn: () => Promise<void>): boolean {
  if (!reserveBackground(key)) return false
  return runReservedBackground(key, label, fn)
}

export function isRunning(key: string) {
  return running.has(key)
}
