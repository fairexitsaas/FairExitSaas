import cors, { CorsOptions } from 'cors'
import { env } from './env'

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., mobile apps, Postman, curl, server-to-server) where origin is undefined
    if (!origin) {
      return callback(null, true)
    }

    if (env.CORS_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
      return callback(null, true)
    }

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
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 hours
}

export const corsMiddleware = cors(corsOptions)

