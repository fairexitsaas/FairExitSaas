import { describe, it, expect, vi, beforeEach } from 'vitest'
import { env } from '../../src/config/env'
import { caseService } from '../../src/services/case.service'
import { documentService } from '../../src/services/document.service'
import { flowService } from '../../src/services/flow.service'
import { caseController } from '../../src/controllers/case.controller'
import { leadService } from '../../src/services/lead.service'
import { ApiError } from '../../src/utils/ApiError'
import type { CaseRow } from '../../src/fairexit/types'

describe('Payment Bypass Mode & Entitlement Checks', () => {
  const unpaidCase: CaseRow = {
    id: '11111111-1111-1111-1111-111111111111',
    public_id: 'FX-0001',
    user_id: null,
    token_hashes: ['hash1'],
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
    email: 'tester@example.com',
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

  const paidCase: CaseRow = {
    ...unpaidCase,
    id: '22222222-2222-2222-2222-222222222222',
    status: 'paid',
    paid_at: new Date().toISOString(),
    payment_provider: 'stripe',
    amount_cents: 5900,
    currency: 'CAD',
  }

  describe('When PAYMENT_BYPASS_ENABLED is true', () => {
    beforeEach(() => {
      (env as any).PAYMENT_BYPASS_ENABLED = true
    })

    it('grants entitlement without marking a financial transaction as paid', () => {
      expect(caseService.isEntitled(unpaidCase)).toBe(true)
      expect(caseService.isPaid(unpaidCase)).toBe(false)
      expect(unpaidCase.paid_at).toBeNull()
      expect(unpaidCase.payment_provider).toBeNull()
    })

    it('advances nextStep from pay to upload for free_check or pending_payment', () => {
      expect(caseService.nextStep(unpaidCase, [])).toBe('upload')
      const pendingCase: CaseRow = { ...unpaidCase, status: 'pending_payment' }
      expect(caseService.nextStep(pendingCase, [])).toBe('upload')
    })

    it('surfaces entitlement and bypassEnabled in case view while preserving real paid status', () => {
      const view = caseService.view(unpaidCase, [])
      expect(view.entitled).toBe(true)
      expect(view.bypassEnabled).toBe(true)
      expect(view.paid).toBe(false)
      expect(view.payment).toBeNull()
      expect(view.nextStep).toBe('upload')
    })

    it('permits readiness.canRead when documents are present', () => {
      const docs = [
        { id: 'd1', kind: 'letter', status: 'uploaded', page: 1 },
      ] as any
      const withNeverContract: CaseRow = { ...unpaidCase, contract_status: 'never' }
      const ready = caseService.readiness(withNeverContract, docs)
      expect(ready.canRead).toBe(true)
    })

    it('safely handles mockPay without throwing 403 or fabricating transactions in bypass mode', async () => {
      vi.spyOn(caseService, 'documents').mockResolvedValueOnce([])
      vi.spyOn(leadService, 'forCase').mockResolvedValueOnce(null)
      const mockReq = { caseRow: unpaidCase } as any
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockImplementation((payload) => payload),
      } as any

      await caseController.mockPay(mockReq, mockRes)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ paid: false, bypass: true }),
        })
      )
    })
  })

  describe('When PAYMENT_BYPASS_ENABLED is false (normal enforcement)', () => {
    beforeEach(() => {
      (env as any).PAYMENT_BYPASS_ENABLED = false
    })

    it('denies entitlement to unpaid cases', () => {
      expect(caseService.isEntitled(unpaidCase)).toBe(false)
      expect(caseService.isPaid(unpaidCase)).toBe(false)
    })

    it('grants entitlement only to genuinely paid cases', () => {
      expect(caseService.isEntitled(paidCase)).toBe(true)
      expect(caseService.isPaid(paidCase)).toBe(true)
    })

    it('requires payment step for free_check and pending_payment', () => {
      expect(caseService.nextStep(unpaidCase, [])).toBe('pay')
      const pendingCase: CaseRow = { ...unpaidCase, status: 'pending_payment' }
      expect(caseService.nextStep(pendingCase, [])).toBe('pay')
    })

    it('blocks readiness.canRead for unpaid cases even with documents present', () => {
      const docs = [
        { id: 'd1', kind: 'letter', status: 'uploaded', page: 1 },
      ] as any
      const withNeverContract: CaseRow = { ...unpaidCase, contract_status: 'never' }
      const ready = caseService.readiness(withNeverContract, docs)
      expect(ready.canRead).toBe(false)
    })

    it('blocks setContractStatus with 402 Payment Required for unpaid cases', async () => {
      await expect(
        documentService.setContractStatus(unpaidCase, 'never')
      ).rejects.toThrowError(expect.objectContaining({ statusCode: 402, message: 'Payment is needed first' }))
    })

    it('blocks startRead with 402 Payment Required for unpaid cases', async () => {
      vi.spyOn(caseService, 'documents').mockResolvedValueOnce([
        { id: 'd1', kind: 'letter', status: 'uploaded', page: 1 } as any,
      ])
      await expect(
        flowService.startRead({ ...unpaidCase, contract_status: 'never' })
      ).rejects.toThrowError(expect.objectContaining({ statusCode: 402, message: 'Payment is needed first' }))
    })

    it('blocks createUploadSlot with 402 Payment Required for unpaid cases', async () => {
      await expect(
        documentService.createUploadSlot(unpaidCase, { kind: 'letter', mimeType: 'application/pdf' })
      ).rejects.toThrowError(expect.objectContaining({ statusCode: 402, message: 'Payment is needed before adding documents' }))
    })

    it('blocks uploadBase64 with 402 Payment Required for unpaid cases', async () => {
      await expect(
        documentService.uploadBase64(unpaidCase, { kind: 'letter', mimeType: 'application/pdf', dataBase64: 'data:application/pdf;base64,dGVzdA==' })
      ).rejects.toThrowError(expect.objectContaining({ statusCode: 402, message: 'Payment is needed before adding documents' }))
    })

    it('blocks startBuild with 402 Payment Required for unpaid cases', async () => {
      await expect(
        flowService.startBuild(unpaidCase)
      ).rejects.toThrowError(expect.objectContaining({ statusCode: 402, message: 'Payment is needed first' }))
    })

    it('rejects mockPay with 403 Forbidden in production when bypass is disabled', async () => {
      (env as any).NODE_ENV = 'production'
      const mockReq = { caseRow: unpaidCase } as any
      const mockRes = {} as any

      await expect(caseController.mockPay(mockReq, mockRes)).rejects.toThrowError(
        expect.objectContaining({ statusCode: 403, message: 'Mock payments are off' })
      )
      ;(env as any).NODE_ENV = 'development'
    })
  })
})
