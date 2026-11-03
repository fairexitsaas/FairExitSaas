import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { apiRateLimitDispatcher, createApiLimiter } from '../../src/middleware/rateLimiter'

describe('API read/write rate limits', () => {
  it('keeps normal reads in a separate budget and returns retry guidance', async () => {
    const app = express()
    app.use((req, _res, next) => { (req as any).id = 'test-request'; next() })
    app.use('/api', apiRateLimitDispatcher(
      createApiLimiter('read', 1, 60_000),
      createApiLimiter('write', 1, 60_000),
    ))
    app.get('/api/v1/cases/:id/report/status', (_req, res) => res.json({ status: 'building' }))
    app.get('/api/v1/cases/:id', (_req, res) => res.json({ status: 'building' }))
    app.post('/api/v1/cases/:id/report', (_req, res) => res.json({ started: true }))

    expect((await request(app).get('/api/v1/cases/case-1/report/status')).status).toBe(200)
    const limitedRead = await request(app).get('/api/v1/cases/case-1')
    expect(limitedRead.status).toBe(429)
    expect(Number(limitedRead.headers['retry-after'])).toBeGreaterThan(0)
    expect(limitedRead.body.requestId).toBe('test-request')

    expect((await request(app).post('/api/v1/cases/case-1/report')).status).toBe(200)
    expect((await request(app).post('/api/v1/cases/case-1/report')).status).toBe(429)
  })
})
