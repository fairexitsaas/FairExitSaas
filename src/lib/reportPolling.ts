type PollError = { status?: number; retryAfterSeconds?: number }

export interface PollLoopOptions<T> {
  poll: (signal: AbortSignal) => Promise<T>
  onValue: (value: T) => void
  onError?: (error: unknown, retryInMs?: number) => void
  isTerminal: (value: T) => boolean
  intervalMs?: number
  maxBackoffMs?: number
  maxRetries?: number
}

/**
 * Robust, non-overlapping, abortable polling loop with terminal state detection,
 * Retry-After backoff, and terminal error handling.
 */
export function startPollLoop<T>(options: PollLoopOptions<T>): () => void {
  const intervalMs = options.intervalMs ?? 4000
  const maxBackoffMs = options.maxBackoffMs ?? 30000
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let failures = 0

  const schedule = (delayMs: number) => {
    if (active) timer = setTimeout(run, delayMs)
  }

  const run = async () => {
    if (!active) return
    controller = new AbortController()
    try {
      const value = await options.poll(controller.signal)
      if (!active) return
      failures = 0
      options.onValue(value)
      if (!options.isTerminal(value)) {
        schedule(intervalMs)
      } else {
        active = false
      }
    } catch (error: unknown) {
      if (!active || (error instanceof DOMException && error.name === 'AbortError') || (error instanceof Error && error.name === 'AbortError')) {
        return
      }
      failures += 1
      const pollErr = error as PollError
      const retryAfterSeconds = pollErr?.retryAfterSeconds

      if (pollErr?.status === 429 && retryAfterSeconds && retryAfterSeconds > 0) {
        const delayMs = retryAfterSeconds * 1000
        options.onError?.(error, delayMs)
        schedule(delayMs)
        return
      }

      // If a non-429 terminal error (e.g. 401, 403, 404, 500) occurs or repeated failures:
      const delayMs = Math.min(maxBackoffMs, intervalMs * 2 ** Math.min(failures - 1, 8))
      options.onError?.(error, delayMs)

      // Only continue polling if error is not marked terminal
      if (failures <= (options.maxRetries ?? 2)) {
        schedule(delayMs)
      } else {
        active = false
      }
    } finally {
      controller = undefined
    }
  }

  void run()
  return () => {
    active = false
    if (timer) clearTimeout(timer)
    if (controller) {
      controller.abort()
      controller = undefined
    }
  }
}
