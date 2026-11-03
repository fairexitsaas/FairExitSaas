import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../utils/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID()
  req.id = requestId
  res.setHeader('X-Request-Id', requestId)

  // Capture before mounted routers trim req.url; omit query strings (which may contain case tokens).
  const route = req.originalUrl.split('?')[0]
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info(`[HTTP][REQUEST] ${req.method} ${route} - ${res.statusCode} [${duration}ms]`, {
      requestId,
      method: req.method,
      path: route,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })

  next()
}

