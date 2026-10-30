import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema, resetPasswordSchema } from '../../src/validators/auth.validator'

describe('Auth Validators', () => {
  describe('signupSchema', () => {
    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password123',
        fullName: 'Jane Doe',
        country: 'US',
      })
      expect(result.success).toBe(true)
    })

    it('rejects passwords shorter than 8 characters', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Pass1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters')
      }
    })

    it('rejects passwords missing numbers or uppercase letters', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'passwordlowercase',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email format', () => {
      const result = signupSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('validates email and password presence', () => {
      const valid = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anyPassword123',
      })
      expect(valid.success).toBe(true)

      const invalid = loginSchema.safeParse({
        email: '',
        password: '',
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    it('validates reset token and strong password', () => {
      const valid = resetPasswordSchema.safeParse({
        token: 'recovery-token-xyz',
        newPassword: 'NewSecurePassword123',
      })
      expect(valid.success).toBe(true)

      const invalid = resetPasswordSchema.safeParse({
        token: '',
        newPassword: 'weak',
      })
      expect(invalid.success).toBe(false)
    })
  })
})

