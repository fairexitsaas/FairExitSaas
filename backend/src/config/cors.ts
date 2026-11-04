import cors, { CorsOptions } from 'cors'
import { env } from './env'
import { logger } from '../utils/logger'

function normalizeOrigin(value: string): string | undefined {
  try {
    return new URL(value.trim()).origin
  } catch {
    return undefined
  }
}

export function getAllowedOrigins(corsOrigins: string[], frontendUrl: string): string[] {
  return [...new Set([...corsOrigins, frontendUrl]
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin)))]
}

export function createCorsOptions(allowedOrigins: string[], nodeEnv: string): CorsOptions {
  const normalizedAllowedOrigins = getAllowedOrigins(allowedOrigins, '')

  return {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g., mobile apps, Postman, curl, server-to-server) where origin is undefined
      if (!origin) return callback(null, true)

      const normalizedOrigin = normalizeOrigin(origin)
      const allowed = Boolean(normalizedOrigin && normalizedAllowedOrigins.includes(normalizedOrigin)) || nodeEnv === 'development'
      logger.info('[CORS][ORIGIN_CHECK]', {
        origin,
        normalizedAllowedOrigins,
        allowed,
      })

      if (allowed) return callback(null, true)
      return callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-Id',
      'X-Case-Token',
      'X-Platform',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  }
}

export const corsOptions = createCorsOptions(
  getAllowedOrigins(env.CORS_ORIGINS, env.FRONTEND_URL),
  env.NODE_ENV,
)

export const corsMiddleware = cors(corsOptions)

