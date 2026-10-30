import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app'

describe('Authentication API Endpoints', () => {
  describe('Input Validation & Error Handling', () => {
    it('POST /api/v1/auth/signup returns 422 for invalid request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'short',
        })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(422)
      expect(res.body.message).toBe('Validation failed')
      expect(Array.isArray(res.body.errors)).toBe(true)
      expect(res.body.requestId).toBeDefined()
    })

    it('POST /api/v1/auth/login returns 422 for missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({})

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(422)
    })
  })

  describe('OAuth & Mobile Endpoints', () => {
    it('GET /api/v1/auth/oauth/google generates valid provider authorization URL', async () => {
      const res = await request(app).get('/api/v1/auth/oauth/google')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.provider).toBe('google')
      expect(res.body.data.url).toContain('https://')
    })

    it('GET /api/v1/auth/oauth/apple generates valid provider authorization URL', async () => {
      const res = await request(app).get('/api/v1/auth/oauth/apple')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.provider).toBe('apple')
      expect(res.body.data.url).toContain('https://')
    })

    it('POST /api/v1/auth/oauth/callback validates missing code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/oauth/callback')
        .send({})

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('Validation failed')
    })

    it('POST /api/v1/auth/oauth/google/native validates mobile idToken requirement', async () => {
      const res = await request(app)
        .post('/api/v1/auth/oauth/google/native')
        .send({})

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/v1/auth/oauth/apple/native validates mobile idToken requirement', async () => {
      const res = await request(app)
        .post('/api/v1/auth/oauth/apple/native')
        .send({})

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
    })

    it('Allows requests from mobile clients without browser Origin header', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        // No Origin header simulate native iOS / Android network stack
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('Protected Endpoints Security Enforcement', () => {
    it('GET /api/v1/auth/me rejects request without Authorization header with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(401)
      expect(res.body.message).toContain('Authorization header is missing')
    })

    it('GET /api/v1/user/profile rejects request with invalid Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer invalid_dummy_token_12345')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(401)
    })

    it('POST /api/v1/auth/logout rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/v1/auth/logout')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(401)
    })

    it('PUT /api/v1/user/profile rejects unauthenticated updates with 401', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .send({ fullName: 'New Name' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })
})
