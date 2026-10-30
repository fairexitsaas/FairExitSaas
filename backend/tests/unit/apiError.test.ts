import { describe, it, expect } from 'vitest'
import { ApiError } from '../../src/utils/ApiError'

describe('ApiError Utility', () => {
  it('creates a badRequest error with status 400', () => {
    const error = ApiError.badRequest('Invalid input')
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('Invalid input')
    expect(error.isOperational).toBe(true)
  })

  it('creates an unauthorized error with status 401', () => {
    const error = ApiError.unauthorized('Token expired')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Token expired')
  })

  it('creates a forbidden error with status 403', () => {
    const error = ApiError.forbidden('Admin role required')
    expect(error.statusCode).toBe(403)
    expect(error.message).toBe('Admin role required')
  })

  it('creates a notFound error with status 404', () => {
    const error = ApiError.notFound('User not found')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('User not found')
  })

  it('creates an unprocessable error with status 422 and issues array', () => {
    const issues = [{ field: 'email', message: 'Required' }]
    const error = ApiError.unprocessable('Validation failed', issues)
    expect(error.statusCode).toBe(422)
    expect(error.errors).toEqual(issues)
  })

  it('creates an internal server error with status 500 and isOperational false', () => {
    const error = ApiError.internal('Database crash')
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(false)
  })
})

