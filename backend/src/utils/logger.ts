type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'service_role_key',
  'anon_key',
  'cookie',
  'supabase_service_role_key',
])

function maskSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data

  if (typeof data === 'string') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData)
  }

  if (typeof data === 'object') {
    const masked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        masked[key] = '***REDACTED***'
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value)
      } else {
        masked[key] = value
      }
    }
    return masked
  }

  return data
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString()
    const maskedMeta = meta ? maskSensitiveData(meta) : undefined
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(maskedMeta ? { details: maskedMeta } : {}),
    }
  }

  info(message: string, meta?: unknown) {
    console.log(JSON.stringify(this.formatMessage('info', message, meta)))
  }

  warn(message: string, meta?: unknown) {
    console.warn(JSON.stringify(this.formatMessage('warn', message, meta)))
  }

  error(message: string, meta?: unknown) {
    console.error(JSON.stringify(this.formatMessage('error', message, meta)))
  }

  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify(this.formatMessage('debug', message, meta)))
    }
  }
}

export const logger = new Logger()

