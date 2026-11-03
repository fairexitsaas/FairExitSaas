type PollError = { status?: number; retryAfterSeconds?: number }

export interface PollLoopOptions<T> {
  poll: (signal: AbortSignal) => Promise<T>
  onValue: (value: T) => void
  onError?: (error: unknown, retryInMs: number) => void
  isTerminal: (value: T) => boolean
  intervalMs?: number
  maxBackoffMs?: number
}

/** One non-overlapping, abortable poll loop with exponential failure backoff. */
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
      if (!options.isTerminal(value)) schedule(intervalMs)
    } catch (error) {
      if (!active || (error instanceof DOMException && error.name === 'AbortError')) return
      failures += 1
      const retryAfterSeconds = (error as PollError)?.retryAfterSeconds
      const delayMs = retryAfterSeconds && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : Math.min(maxBackoffMs, intervalMs * 2 ** Math.min(failures - 1, 8))
      options.onError?.(error, delayMs)
      schedule(delayMs)
    } finally {
      controller = undefined
    }
  }

  void run()
  return () => {
    active = false
    if (timer) clearTimeout(timer)
    controller?.abort()
  }
}
