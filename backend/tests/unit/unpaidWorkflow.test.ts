import { describe, it, expect, vi } from 'vitest'
import { caseService } from '../../src/services/case.service'
import { documentService } from '../../src/services/document.service'
import { flowService } from '../../src/services/flow.service'
import type { CaseRow, CaseDocumentRow } from '../../src/fairexit/types'

describe('Direct Unpaid Workflow Verification', () => {
  const unpaidCase: CaseRow = {
    id: '33333333-3333-3333-3333-333333333333',
    public_id: 'FX-0003',
    user_id: null,
    token_hashes: ['token_hash'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON' },
    free_result: null,
    status: 'free_check',
    status_detail: null,
    job_started_at: null,
    email: 'test@example.com',
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

  it('identifies unconfirmed/unpaid cases correctly', () => {
    expect(caseService.isPaid(unpaidCase)).toBe(false)
    const paidCase = { ...unpaidCase, status: 'paid' as const, paid_at: new Date().toISOString(), payment_provider: 'mock' }
    expect(caseService.isPaid(paidCase)).toBe(true)
  })

  it('directs nextStep to pay for unpaid free_check and pending_payment', () => {
    expect(caseService.nextStep(unpaidCase, [])).toBe('pay')
    const pendingCase = { ...unpaidCase, status: 'pending_payment' as const }
    expect(caseService.nextStep(pendingCase, [])).toBe('pay')
    const paidCase = { ...unpaidCase, status: 'paid' as const, paid_at: new Date().toISOString(), payment_provider: 'mock' }
    expect(caseService.nextStep(paidCase, [])).toBe('upload')
  })

  it('allows canRead in readiness check once case is paid and documents are satisfied', () => {
    const docs = [
      { id: 'doc-1', kind: 'letter', status: 'uploaded', page: 1 },
    ] as CaseDocumentRow[]
    const paidWithNeverContract = {
      ...unpaidCase,
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      contract_status: 'never' as const,
    }
    const ready = caseService.readiness(paidWithNeverContract, docs)
    expect(ready.canRead).toBe(true)
    expect(ready.letterPages).toBe(1)
    expect(ready.contractOk).toBe(true)

    const unpaidReady = caseService.readiness(unpaidCase, docs)
    expect(unpaidReady.canRead).toBe(false)
  })

  it('returns paid: false in case view for unpaid cases and paid: true once paid', () => {
    const unpaidView = caseService.view(unpaidCase, [])
    expect(unpaidView.paid).toBe(false)
    expect(unpaidView.nextStep).toBe('pay')

    const paidCase = { ...unpaidCase, status: 'paid' as const, paid_at: new Date().toISOString(), payment_provider: 'mock' }
    const paidView = caseService.view(paidCase, [])
    expect(paidView.paid).toBe(true)
    expect(paidView.nextStep).toBe('upload')
  })

  it('does not throw 402 on setContractStatus for unpaid cases', async () => {
    vi.spyOn(caseService, 'documents').mockResolvedValueOnce([])
    vi.spyOn(caseService, 'update').mockResolvedValueOnce({
      ...unpaidCase,
      contract_status: 'never',
    })

    const updated = await documentService.setContractStatus(unpaidCase, 'never')
    expect(updated.contract_status).toBe('never')
  })

  it('does not throw 402 on startRead for unpaid cases', async () => {
    const docs = [
      { id: 'doc-1', kind: 'letter', status: 'uploaded', page: 1 },
    ] as CaseDocumentRow[]
    vi.spyOn(caseService, 'documents').mockResolvedValueOnce(docs)
    vi.spyOn(caseService, 'update').mockResolvedValueOnce({
      ...unpaidCase,
      status: 'reading',
    })

    const caseWithNever = { ...unpaidCase, contract_status: 'never' as const }
    const res = await flowService.startRead(caseWithNever)
    expect(res.status).toBe('reading')
  })
})

