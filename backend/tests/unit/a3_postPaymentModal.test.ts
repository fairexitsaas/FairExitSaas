import { describe, it, expect, vi, beforeEach } from 'vitest'
import { caseService, hasCompletedPostPaymentCollection } from '../../src/services/case.service'
import { postPaymentCustomerSchema } from '../../src/validators/fairexit.validator'
import type { CaseRow } from '../../src/fairexit/types'

describe('A3 - Post-Payment Modal Lifecycle & Idempotency Tests', () => {
  const sampleCase: CaseRow = {
    id: '33333333-3333-3333-3333-333333333333',
    public_id: 'FX-A301',
    user_id: null,
    token_hashes: ['hash_existing_token'],
    platform: 'web',
    country: 'US',
    jurisdiction_code: 'US-CA',
    jurisdiction: { name: 'California', code: 'US-CA', country: 'US' } as any,
    covered: true,
    industry: null,
    answers: { usState: 'California', salary: 140000 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: null,
    consent: null,
    remind: false,
    paid_at: null,
    payment_provider: null,
    amount_cents: null,
    currency: null,
    contract_status: null,
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: false, attested_at: null },
    attested_at: null,
    report_id: null,
    report: null,
    report_inputs: null,
    report_ready_at: null,
    report_pdf_path: null,
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.6',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Rejects customer info submission before payment has succeeded', async () => {
    vi.spyOn(caseService, 'get').mockResolvedValue({ ...sampleCase, paid_at: null })

    await expect(
      caseService.submitCustomerInfo(sampleCase.id, {
        name: 'Alex Mercer',
        email: 'alex@example.com',
      })
    ).rejects.toThrow('Payment required before submitting customer details')
  })

  it('2. Accepts customer info after payment and transitions hasCompletedPostPaymentCollection to true', async () => {
    const paidCase: CaseRow = {
      ...sampleCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'usd',
    }

    let updatedRow: CaseRow = { ...paidCase }
    vi.spyOn(caseService, 'get').mockImplementation(async () => updatedRow)
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch: any) => {
      updatedRow = {
        ...updatedRow,
        ...patch,
        answers: { ...(updatedRow.answers || {}), ...(patch.answers || {}) },
        consent: { ...(updatedRow.consent || {}), ...(patch.consent || {}) },
      }
      return updatedRow
    })
    vi.spyOn(caseService, 'addToken').mockResolvedValue('new_private_token_123')

    // Initial check: hasCompletedPostPaymentCollection is false
    expect(hasCompletedPostPaymentCollection(paidCase)).toBe(false)

    // Submit customer info
    const res = await caseService.submitCustomerInfo(paidCase.id, {
      name: 'Alex Mercer',
      email: 'alex@example.com',
      consentNews: true,
    })

    expect(res.success).toBe(true)
    expect(res.customer.name).toBe('Alex Mercer')
    expect(res.customer.email).toBe('alex@example.com')
    expect(res.privateLink).toContain('t=new_private_token_123')

    // Now hasCompletedPostPaymentCollection must be true
    expect(hasCompletedPostPaymentCollection(updatedRow)).toBe(true)
  })

  it('3. Form validation: rejects empty name or invalid email, preserving ability to retry without completing state', () => {
    // Empty name
    const res1 = postPaymentCustomerSchema.safeParse({
      name: '   ',
      email: 'valid@example.com',
    })
    expect(res1.success).toBe(false)

    // Invalid email
    const res2 = postPaymentCustomerSchema.safeParse({
      name: 'Alex Mercer',
      email: 'not-an-email',
    })
    expect(res2.success).toBe(false)

    // Valid retry
    const res3 = postPaymentCustomerSchema.safeParse({
      name: 'Alex Mercer',
      email: 'valid@example.com',
      consentNews: true,
    })
    expect(res3.success).toBe(true)
  })

  it('4. Re-rendering or refreshing does not re-open modal once customer info is recorded', async () => {
    const completedCase: CaseRow = {
      ...sampleCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'usd',
      email: 'alex@example.com',
      answers: {
        ...sampleCase.answers,
        customer_name: 'Alex Mercer',
        name: 'Alex Mercer',
      },
      consent: {
        name: 'Alex Mercer',
        email: 'alex@example.com',
        remind: false,
        source: 'post-payment-collection',
        submitted_at: new Date().toISOString(),
      },
    }

    vi.spyOn(caseService, 'get').mockResolvedValue(completedCase)

    const c = await caseService.get(completedCase.id)
    // Both hasCompletedPostPaymentCollection and public view representation hasCompletedCustomerInfo must indicate completion
    expect(hasCompletedPostPaymentCollection(c)).toBe(true)
    const pub = caseService.view(c)
    expect(pub.hasCompletedCustomerInfo).toBe(true)
  })

  it('5. Idempotent submission: re-submitting does not corrupt state or invalidate existing token history', async () => {
    const paidCase: CaseRow = {
      ...sampleCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      token_hashes: ['token_hash_initial'],
    }

    let storedCase = { ...paidCase }
    vi.spyOn(caseService, 'get').mockImplementation(async () => storedCase)
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch: any) => {
      storedCase = {
        ...storedCase,
        ...patch,
      }
      return storedCase
    })
    vi.spyOn(caseService, 'addToken').mockResolvedValue('token_2')

    // First submission
    const res1 = await caseService.submitCustomerInfo(paidCase.id, {
      name: 'Alex Mercer',
      email: 'alex@example.com',
    })
    expect(res1.success).toBe(true)
    expect(hasCompletedPostPaymentCollection(storedCase)).toBe(true)

    // Second submission (e.g. network retry or update)
    const res2 = await caseService.submitCustomerInfo(paidCase.id, {
      name: 'Alex Mercer Jr.',
      email: 'alex.jr@example.com',
    })
    expect(res2.success).toBe(true)
    expect(hasCompletedPostPaymentCollection(storedCase)).toBe(true)
    expect(res2.customer.name).toBe('Alex Mercer Jr.')
    expect(res2.customer.email).toBe('alex.jr@example.com')
  })
})
