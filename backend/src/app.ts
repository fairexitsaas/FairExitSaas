import express, { Application } from 'express'
import helmet from 'helmet'
import { corsMiddleware } from './config/cors'
import { requestLogger } from './middleware/requestLogger'
import { notFound } from './middleware/notFound'
import { errorHandler } from './middleware/errorHandler'
import { apiRateLimiter } from './middleware/rateLimiter'
import routes from './routes'

const app: Application = express()

// Security HTTP headers
app.use(helmet())

// Enable CORS with secure options
app.use(corsMiddleware)

// JSON and URL-encoded body parser with sensible limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request correlation and logging
app.use(requestLogger)

// Global rate limiting for API routes
app.use('/api', apiRateLimiter)

// Root health & metadata endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    service: 'FairExit Backend API',
    version: '1.0.0',
    documentation: '/api/v1/health',
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

