import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import type { RequestHandler } from 'express'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export function createApiLimiter(policy: 'read' | 'write' | 'auth', max: number, windowMs = env.RATE_LIMIT_WINDOW_MS): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const route = req.originalUrl.split('?')[0]
      const resetTime = (req as typeof req & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime
      const retryAfterSeconds = Math.max(1, Math.ceil(((resetTime?.getTime() ?? Date.now() + env.RATE_LIMIT_WINDOW_MS) - Date.now()) / 1000))
      res.setHeader('Retry-After', String(retryAfterSeconds))
      logger.warn('[HTTP][RATE_LIMITED]', {
        requestId: req.id,
        method: req.method,
        route,
        policy,
        retryAfterSeconds,
      })
      res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests, please try again later',
        retryAfterSeconds,
        requestId: req.id,
      })
    },
  })
}

// Polling and ordinary reads have a separate budget from writes and generation actions.
export const apiReadRateLimiter = createApiLimiter('read', env.READ_RATE_LIMIT_MAX)
export const apiWriteRateLimiter = createApiLimiter('write', env.WRITE_RATE_LIMIT_MAX)

export const authRateLimiter = createApiLimiter('auth', env.AUTH_RATE_LIMIT_MAX)

export function apiRateLimitDispatcher(readLimiter: RateLimitRequestHandler, writeLimiter: RateLimitRequestHandler): RequestHandler {
  return (req, res, next) => {
    const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    return (isRead ? readLimiter : writeLimiter)(req, res, next)
  }
}

export const apiRateLimiter = apiRateLimitDispatcher(apiReadRateLimiter, apiWriteRateLimiter)
