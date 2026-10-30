import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../utils/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID()
  req.id = requestId
  res.setHeader('X-Request-Id', requestId)

  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })

  next()
}

