import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'
import { logger } from '../utils/logger'
import { env } from '../config/env'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const requestId = req.id || (req.headers['x-request-id'] as string) || 'unknown'
  const timestamp = new Date().toISOString()

  let statusCode = 500
  let message = 'Internal Server Error'
  let errors: unknown[] | undefined = undefined

  // 1. ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
    errors = err.errors
  }
  // 2. Zod validation error
  else if (err instanceof ZodError) {
    statusCode = 422
    message = 'Validation failed'
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  }
  // 3. Syntax error (e.g. invalid JSON payload)
  else if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    statusCode = 400
    message = 'Malformed JSON in request payload'
  }
  // 4. Supabase Auth or Postgrest error
  else if (typeof err === 'object' && err !== null && '__isAuthError' in err) {
    statusCode = (err as { status?: number }).status || 400
    message = (err as { message?: string }).message || 'Authentication error'
  }
  // 5. General Error
  else if (err instanceof Error) {
    if (message.includes('fetch failed')) {
      statusCode = 503
      message =
        'Authentication service is unreachable. Please verify your SUPABASE_URL and network connection in backend/.env'
    } else if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      message = err.message
    }
  }

  // Log error safely without leaking sensitive information
  logger.error(`Error processing request [${req.method} ${req.originalUrl}]`, {
    requestId,
    statusCode,
    message,
    errors,
    stack: err instanceof Error ? err.stack : undefined,
  })

  // Prevent duplicate responses if headers already sent
  if (res.headersSent) {
    return
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors && errors.length > 0 ? { errors } : {}),
    requestId,
    timestamp,
  })
}
