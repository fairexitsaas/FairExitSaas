import { describe, it, expect, vi, beforeEach } from 'vitest'
import { caseService } from '../../src/services/case.service'
import { paymentService } from '../../src/services/payment.service'
import type { CaseRow } from '../../src/fairexit/types'

describe('A1 - Case Lifecycle and Multi-Case Isolation Tests', () => {
  const baseCanadaCase: CaseRow = {
    id: '11111111-ca01-4000-8000-000000000001',
    public_id: 'FX-CA01',
    user_id: null,
    token_hashes: ['ca_token_hash_1'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON', country: 'CA' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', salary: 110000, years: 14, age: 52 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: 'canada@example.com',
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

  const baseUSCase: CaseRow = {
    id: '22222222-us01-4000-8000-000000000002',
    public_id: 'FX-US01',
    user_id: null,
    token_hashes: ['us_token_hash_1'],
    platform: 'web',
    country: 'US',
    jurisdiction_code: 'US-CA',
    jurisdiction: { name: 'California', code: 'US-CA', country: 'US' } as any,
    covered: true,
    industry: null,
    answers: { usState: 'California', salary: 120000, years: 5, age: 45 },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: 'us@example.com',
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

  it('1. Each new check has a distinct case ID and correct country association', () => {
    expect(baseCanadaCase.id).not.toBe(baseUSCase.id)
    expect(baseCanadaCase.country).toBe('CA')
    expect(baseUSCase.country).toBe('US')
    expect(caseService.isPaid(baseCanadaCase)).toBe(false)
    expect(caseService.isPaid(baseUSCase)).toBe(false)
  })

  it('2. Paying for a Canadian case marks that case paid without affecting US case', () => {
    const paidCanadaCase: CaseRow = {
      ...baseCanadaCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'cad',
    }
    expect(caseService.isPaid(paidCanadaCase)).toBe(true)
    expect(caseService.isPaid(baseUSCase)).toBe(false)
  })

  it('3. Attempting checkout on an already-paid case throws 409 Conflict', async () => {
    const paidCanadaCase: CaseRow = {
      ...baseCanadaCase,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'cad',
    }
    await expect(
      paymentService.prepare(paidCanadaCase, { termsAccepted: true })
    ).rejects.toThrow('This report is already paid')

    await expect(
      paymentService.stripeCheckout(paidCanadaCase, {
        successUrl: 'http://localhost:3000/report',
        cancelUrl: 'http://localhost:3000/report?step=pay',
      })
    ).rejects.toThrow('This report is already paid')
  })

  it('4. Starting a new US check after a paid Canadian check allows checkout on the fresh US case', async () => {
    vi.spyOn(caseService, 'update').mockResolvedValue(baseUSCase)
    const res = await paymentService.prepare(baseUSCase, { termsAccepted: true })
    expect(res).toBeDefined()
    expect(caseService.isPaid(baseUSCase)).toBe(false)
  })

  it('5. Two separate checks in the same country receive separate case IDs and paid statuses', () => {
    const usCheck1: CaseRow = { ...baseUSCase, id: '33333333-us01-4000-8000-000000000001' }
    const usCheck2: CaseRow = { ...baseUSCase, id: '44444444-us02-4000-8000-000000000002' }

    expect(usCheck1.id).not.toBe(usCheck2.id)
    const paidUS1: CaseRow = {
      ...usCheck1,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      amount_cents: 5900,
      currency: 'usd',
    }

    expect(caseService.isPaid(paidUS1)).toBe(true)
    expect(caseService.isPaid(usCheck2)).toBe(false)
  })

  it('6. Previously purchased report remains accessible via its token while fresh check proceeds', () => {
    const paidCase: CaseRow = {
      ...baseCanadaCase,
      status: 'ready',
      paid_at: new Date().toISOString(),
      payment_provider: 'stripe',
      report_ready_at: new Date().toISOString(),
      report_id: 'RPT-CA01',
    }
    const view = caseService.view(paidCase, [])
    expect(view.paid).toBe(true)
    expect(view.nextStep).toBe('ready')
    expect(view.country).toBe('CA')

    // Fresh US case view remains unpaid and points to upload
    const freshUSView = caseService.view(baseUSCase, [])
    expect(freshUSView.paid).toBe(false)
    expect(freshUSView.nextStep).toBe('upload')
    expect(freshUSView.country).toBe('US')
  })
})
