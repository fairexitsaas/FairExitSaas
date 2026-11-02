import app from './app'
import { env } from './config/env'
import { logger } from './utils/logger'
import { jobsService } from './services/jobs.service'

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 FairExit Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`)
  logger.info(`📡 API endpoint: http://localhost:${env.PORT}/api/v1`)
  logger.info(`🩺 Health check: http://localhost:${env.PORT}/api/v1/health`)
  jobsService.startInProcess()
})
// Call B can stream for several minutes; keep slow clients' sockets open long enough
server.requestTimeout = 0
server.headersTimeout = 65_000

// Graceful shutdown handling
function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`)
  server.close(() => {
    logger.info('HTTP server closed.')
    process.exit(0)
  })

  // Force close if lingering connections take too long
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  })
})

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown', {
    message: error.message,
    stack: error.stack,
  })
  process.exit(1)
})

