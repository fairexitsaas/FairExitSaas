import { afterEach, describe, expect, it, vi } from 'vitest'
import { startPollLoop } from '../../../src/lib/reportPolling'

describe('report polling loop', () => {
  afterEach(() => vi.useRealTimers())

  it('does not overlap requests and stops on a terminal status', async () => {
    vi.useFakeTimers()
    let release!: (value: { status: string }) => void
    let active = 0
    let maxActive = 0
    const poll = vi.fn(() => {
      active += 1
      maxActive = Math.max(maxActive, active)
      return new Promise<{ status: string }>((resolve) => {
        release = (value) => { active -= 1; resolve(value) }
      })
    })
    const values: string[] = []
    const stop = startPollLoop({
      poll,
      onValue: (value) => values.push(value.status),
      isTerminal: (value) => value.status !== 'building',
      intervalMs: 4000,
    })

    expect(poll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(12000)
    expect(poll).toHaveBeenCalledTimes(1)
    release({ status: 'ready' })
    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(12000)

    expect(values).toEqual(['ready'])
    expect(poll).toHaveBeenCalledTimes(1)
    expect(maxActive).toBe(1)
    stop()
  })

  it('backs off a 429 by Retry-After and aborts on cleanup', async () => {
    vi.useFakeTimers()
    const abortSignals: AbortSignal[] = []
    const poll = vi.fn((signal: AbortSignal) => {
      abortSignals.push(signal)
      if (poll.mock.calls.length === 1) return Promise.reject({ status: 429, retryAfterSeconds: 7 })
      return Promise.resolve({ status: 'ready' })
    })
    const onValue = vi.fn()
    const onError = vi.fn()
    const stop = startPollLoop({ poll, onValue, onError, isTerminal: (value) => value.status !== 'building' })

    await vi.runAllTicks()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 429 }), 7000)
    await vi.advanceTimersByTimeAsync(6999)
    expect(poll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(poll).toHaveBeenCalledTimes(2)
    expect(onValue).toHaveBeenCalledWith({ status: 'ready' })

    let pendingSignal!: AbortSignal
    const pendingStop = startPollLoop({
      poll: (signal) => { pendingSignal = signal; return new Promise(() => {}) },
      onValue: vi.fn(),
      isTerminal: () => false,
    })
    pendingStop()
    expect(pendingSignal.aborted).toBe(true)
    stop()
  })
})
