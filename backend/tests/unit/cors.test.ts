import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import cors from 'cors'
import { createCorsOptions, getAllowedOrigins, isOriginAllowed } from '../../src/config/cors'

describe('CORS configuration', () => {
  it('normalizes configured origins and includes the canonical frontend URL', () => {
    expect(getAllowedOrigins(
      [' https://fair-exit-saas.vercel.app/ ', 'https://fair-exit-saas.vercel.app'],
      'https://fair-exit-saas.vercel.app/',
    )).toEqual(['https://fair-exit-saas.vercel.app', 'http://localhost:3000'])
  })

  it('accepts production OPTIONS preflight with credentials and required headers', async () => {
    const app = express()
    app.use(cors(createCorsOptions(
      ['https://fair-exit-saas.vercel.app/'],
      'production',
    )))
    app.get('/api/v1/config', (_req, res) => res.json({ ok: true }))

    const response = await request(app)
      .options('/api/v1/config')
      .set('Origin', 'https://fair-exit-saas.vercel.app')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,x-case-token')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('https://fair-exit-saas.vercel.app')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS')
    expect(response.headers['access-control-max-age']).toBe('86400')
  })

  it('allows Vercel production and preview subdomains dynamically', () => {
    expect(isOriginAllowed('https://fair-exit-saas-git-feat-test.vercel.app')).toBe(true)
    expect(isOriginAllowed('https://fair-exit-saas.vercel.app')).toBe(true)
    expect(isOriginAllowed('https://fairexit.io')).toBe(true)
    expect(isOriginAllowed('https://preview.fairexit.io')).toBe(true)
    expect(isOriginAllowed('http://localhost:3000')).toBe(true)
  })

  it('rejects an origin outside the production allowlist', () => {
    expect(isOriginAllowed('https://attacker.example')).toBe(false)
    expect(isOriginAllowed('https://fake-fair-exit-saas.vercel.app.evil.com')).toBe(false)
  })
})
