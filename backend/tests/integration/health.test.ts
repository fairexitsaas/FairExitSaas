import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app'

describe('Health and System Endpoints', () => {
  it('GET / returns 200 with service information', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body.service).toBe('FairExit Backend API')
    expect(res.body.status).toBe('online')
  })

  it('GET /api/v1/health returns 200 with uptime and environment', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('UP')
    expect(res.body.data.service).toBe('FairExit Backend API')
    expect(res.body.data.timestamp).toBeDefined()
  })

  it('GET /api/v1/unknown-route returns 404 with structured ApiError', async () => {
    const res = await request(app).get('/api/v1/unknown-route')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.statusCode).toBe(404)
    expect(res.body.message).toContain('Route not found')
    expect(res.body.requestId).toBeDefined()
  })
})

