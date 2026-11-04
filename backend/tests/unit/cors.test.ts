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
    )).toEqual(['https://fair-exit-saas.vercel.app'])
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
    expect(response.headers['access-control-allow-headers']).toContain('Authorization')
    expect(response.headers['access-control-allow-headers']).toContain('X-Case-Token')
  })

  it('allows Vercel production and preview subdomains dynamically', () => {
    expect(isOriginAllowed('https://fair-exit-saas.vercel.app', [], 'production')).toBe(true)
    expect(isOriginAllowed('https://fair-exit-saas-git-preview.vercel.app', [], 'production')).toBe(true)
    expect(isOriginAllowed('https://fairexit.io', [], 'production')).toBe(true)
    expect(isOriginAllowed('https://app.fairexit.io', [], 'production')).toBe(true)
    expect(isOriginAllowed('http://localhost:3000', [], 'production')).toBe(true)
  })

  it('rejects an origin outside the production allowlist', () => {
    const callback = vi.fn()
    createCorsOptions(['https://fair-exit-saas.vercel.app'], 'production').origin!(
      'https://attacker.example', callback,
    )
    expect(callback).toHaveBeenCalledWith(expect.any(Error))
  })
})
