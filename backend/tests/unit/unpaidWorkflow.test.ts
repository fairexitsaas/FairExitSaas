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

  it('directs nextStep to upload for unsatisifed documents and pay once documents are added', () => {
    expect(caseService.nextStep(unpaidCase, [])).toBe('upload')
    const pendingCase = { ...unpaidCase, status: 'pending_payment' as const }
    expect(caseService.nextStep(pendingCase, [])).toBe('upload')

    const docs = [
      { id: 'doc-1', kind: 'letter', status: 'uploaded', page: 1 },
    ] as CaseDocumentRow[]
    const caseWithNever = { ...unpaidCase, contract_status: 'never' as const }
    expect(caseService.nextStep(caseWithNever, docs)).toBe('pay')

    const paidCase = { ...caseWithNever, status: 'paid' as const, paid_at: new Date().toISOString(), payment_provider: 'mock' }
    // Before customer info is completed, nextStep is 'pay' so modal displays
    expect(caseService.nextStep(paidCase, docs)).toBe('pay')
  })

  it('allows canRead in readiness check once case is paid, documents are satisfied, and customer info is completed', () => {
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
    const readyBeforeCustomerInfo = caseService.readiness(paidWithNeverContract, docs)
    expect(readyBeforeCustomerInfo.canRead).toBe(false)
    expect(readyBeforeCustomerInfo.letterPages).toBe(1)
    expect(readyBeforeCustomerInfo.contractOk).toBe(true)

    const paidWithCustomerInfo = {
      ...paidWithNeverContract,
      answers: { customer_name: 'John Doe', name: 'John Doe' },
      consent: { name: 'John Doe', email: 'john@example.com', source: 'post-payment-collection', submitted_at: new Date().toISOString() },
    }
    const readyAfterCustomerInfo = caseService.readiness(paidWithCustomerInfo, docs)
    expect(readyAfterCustomerInfo.canRead).toBe(true)

    const unpaidReady = caseService.readiness(unpaidCase, docs)
    expect(unpaidReady.canRead).toBe(false)
  })

  it('returns paid: false in case view for unpaid cases and paid: true once paid', () => {
    const unpaidView = caseService.view(unpaidCase, [])
    expect(unpaidView.paid).toBe(false)
    expect(unpaidView.nextStep).toBe('upload')

    const paidCase = { ...unpaidCase, status: 'paid' as const, paid_at: new Date().toISOString(), payment_provider: 'mock' }
    const paidView = caseService.view(paidCase, [])
    expect(paidView.paid).toBe(true)
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

  it('enforces payment and customer details safeguards before startRead can execute', async () => {
    const docs = [
      { id: 'doc-1', kind: 'letter', status: 'uploaded', page: 1 },
    ] as CaseDocumentRow[]
    vi.spyOn(caseService, 'documents').mockResolvedValue(docs)

    const caseWithNever = { ...unpaidCase, contract_status: 'never' as const }
    // Unpaid case must reject startRead
    await expect(flowService.startRead(caseWithNever)).rejects.toThrow('Payment required')

    // Paid case without customer info must reject startRead
    const paidWithoutCustomerInfo = {
      ...caseWithNever,
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
    }
    await expect(flowService.startRead(paidWithoutCustomerInfo)).rejects.toThrow('Customer name and email must be saved')

    // Paid case with customer info starts reading
    const paidWithCustomerInfo = {
      ...paidWithoutCustomerInfo,
      answers: { customer_name: 'John Doe', name: 'John Doe' },
      consent: { name: 'John Doe', email: 'john@example.com', source: 'post-payment-collection', submitted_at: new Date().toISOString() },
    }
    vi.spyOn(caseService, 'update').mockResolvedValueOnce({
      ...paidWithCustomerInfo,
      status: 'reading',
    })
    const res = await flowService.startRead(paidWithCustomerInfo)
    expect(res.status).toBe('reading')
  })
})

