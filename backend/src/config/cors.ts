import cors, { CorsOptions } from 'cors'
import { env } from './env'
import { logger } from '../utils/logger'

export function normalizeOrigin(value: string): string | undefined {
  try {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).origin
    }
    return new URL(`https://${trimmed}`).origin
  } catch {
    return undefined
  }
}

export function getAllowedOrigins(corsOrigins: string[], frontendUrl: string): string[] {
  const combined = [
    ...corsOrigins,
    frontendUrl,
    env.FRONTEND_URL,
    env.APP_WEB_URL,
    'https://fair-exit-saas.vercel.app',
  ]
  return [...new Set(combined
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin)))]
}

export function isOriginAllowed(
  origin: string,
  normalizedAllowedOrigins: string[],
  nodeEnv: string,
): boolean {
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return true
  }

  const normalizedOrigin = normalizeOrigin(origin)
  if (!normalizedOrigin) {
    return false
  }

  // 1. Explicit allowed origins (from env CORS_ORIGINS, FRONTEND_URL, APP_WEB_URL)
  if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
    return true
  }

  // 2. Official FairExit production frontend and Vercel preview environments
  if (/^https:\/\/(fair-exit-saas.*\.vercel\.app|.*\.fairexit\.io|fairexit\.io)$/.test(normalizedOrigin)) {
    return true
  }

  // 3. Local development origins
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
    return true
  }

  return false
}

export function createCorsOptions(allowedOrigins: string[], nodeEnv: string): CorsOptions {
  const normalizedAllowedOrigins = getAllowedOrigins(allowedOrigins, '')

  return {
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, Postman, curl, server-to-server) where origin is undefined
      if (!origin) {
        return callback(null, true)
      }

      const allowed = isOriginAllowed(origin, normalizedAllowedOrigins, nodeEnv)
      
      logger.info('[CORS][ORIGIN_CHECK]', {
        origin,
        normalizedOrigin: normalizeOrigin(origin),
        normalizedAllowedOrigins,
        allowed,
        nodeEnv,
      })

      if (allowed) {
        return callback(null, true)
      }

      logger.warn('[CORS][BLOCKED]', {
        origin,
        normalizedAllowedOrigins,
        stage: 'preflight_or_request',
      })

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
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['X-Request-Id'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  }
}

export const corsOptions = createCorsOptions(
  getAllowedOrigins(env.CORS_ORIGINS, env.FRONTEND_URL),
  env.NODE_ENV,
)

export const corsMiddleware = cors(corsOptions)
