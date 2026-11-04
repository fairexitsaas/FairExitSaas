import { toast } from 'sonner'

// Deduplication map: key -> timestamp (ms)
const recentToasts = new Map<string, number>()
const DEDUPE_WINDOW_MS = 2500

function isDuplicate(key: string): boolean {
  const now = Date.now()
  const lastTime = recentToasts.get(key)
  if (lastTime && now - lastTime < DEDUPE_WINDOW_MS) {
    return true
  }
  recentToasts.set(key, now)

  // Clean up older keys
  if (recentToasts.size > 50) {
    for (const [k, time] of recentToasts.entries()) {
      if (now - time > DEDUPE_WINDOW_MS * 2) {
        recentToasts.delete(k)
      }
    }
  }
  return false
}

/** Sanitize an error message to prevent leaking stack traces or internal secrets */
export function sanitizeErrorMessage(rawMessage: unknown): string {
  if (!rawMessage) return 'An unexpected error occurred. Please try again.'
  const text = String(rawMessage)

  // Filter out internal traces or database noise
  if (/select\s+\*\s+from|insert\s+into|update\s+\w+\s+set/i.test(text)) {
    return 'A database operation failed. Please try again.'
  }
  if (/at\s+[\w.<>]+\s+\([^)]+:\d+:\d+\)/.test(text)) {
    const firstLine = text.split('\n')[0] || 'An unexpected error occurred.'
    return firstLine.replace(/Error:\s*/, '')
  }
  if (/supabase_url|service_role_key|anthropic_api_key/i.test(text)) {
    return 'A configuration error occurred. Please try again later.'
  }
  return text.trim()
}

export interface ToastOptions {
  id?: string
  description?: string
  duration?: number
}

/** Show a success toast notification with deduplication */
export function notifySuccess(message: string, options?: ToastOptions): string | number | undefined {
  const key = `success:${options?.id || message}`
  if (isDuplicate(key)) return undefined

  return toast.success(message, {
    id: options?.id || key,
    description: options?.description,
    duration: options?.duration ?? 4000,
  })
}

/** Show an error toast notification with deduplication and sanitization */
export function notifyError(message: unknown, options?: ToastOptions): string | number | undefined {
  const cleanMessage = sanitizeErrorMessage(message)
  const key = `error:${options?.id || cleanMessage}`
  if (isDuplicate(key)) return undefined

  return toast.error(cleanMessage, {
    id: options?.id || key,
    description: options?.description,
    duration: options?.duration ?? 6000,
  })
}

export { toast }
