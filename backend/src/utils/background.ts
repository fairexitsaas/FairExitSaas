import { logger } from './logger'

/**
 * Runs long AI work (Call A, Call B) after the HTTP response has gone out.
 * Clients poll GET /cases/:id (or the /read and /report status endpoints).
 * Phase 1 runs jobs in the API process; a job that dies with the process is marked failed after
 * 20 minutes (caseService.healStale) and the person can retry. Swap for a queue if volume grows.
 */
const running = new Set<string>()

export function runInBackground(key: string, label: string, fn: () => Promise<void>): boolean {
  if (running.has(key)) return false
  running.add(key)
  setImmediate(() => {
    fn()
      .catch((err) => logger.error(`Background job failed: ${label}`, { key, message: (err as Error).message, stack: (err as Error).stack }))
      .finally(() => running.delete(key))
  })
  return true
}

export function isRunning(key: string) {
  return running.has(key)
}
