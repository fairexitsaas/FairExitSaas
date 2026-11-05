import express, { Application } from 'express'
import helmet from 'helmet'
import { corsMiddleware } from './config/cors'
import { requestLogger } from './middleware/requestLogger'
import { notFound } from './middleware/notFound'
import { errorHandler } from './middleware/errorHandler'
import { apiRateLimiter } from './middleware/rateLimiter'
import routes from './routes'
import webhookRoutes from './routes/webhook.routes'

const app: Application = express()

// 1. Trust reverse proxy (Vercel, Cloudflare, etc.) for accurate client IP identification and rate-limiting
app.set('trust proxy', 1)

// 2. Enable CORS with secure options first so all preflight and cross-origin calls are handled
app.use(corsMiddleware)
app.options('*', corsMiddleware)

// 3. Security HTTP headers with cross-origin access permitted for web clients
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// 4. Stripe webhooks need the raw body: mount before the JSON parser
app.use('/api/v1/webhooks', webhookRoutes)

// 5. JSON and URL-encoded body parser with sensible limits
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 6. Request correlation and logging
app.use(requestLogger)

// 7. Rate limiting (skips preflight OPTIONS)
app.use('/api', apiRateLimiter)

// Root health & metadata endpoint (also handles Vercel serverless function root routes /api and /api/index)
app.get(['/', '/api', '/api/index'], (_req, res) => {
  res.status(200).json({
    service: 'FairExit Backend API',
    version: '1.0.0',
    documentation: 'backend/docs/API.md',
    health: '/api/v1/health',
    status: 'online',
  })
})

// Main API v1 routing
app.use('/api/v1', routes)

// 404 Catch-all handler
app.use(notFound)

// Centralized error handling
app.use(errorHandler)

export default app
