import { describe, it, expect, vi, beforeEach } from 'vitest'
import { caseService } from '../../src/services/case.service'
import { flowService } from '../../src/services/flow.service'
import { caseController } from '../../src/controllers/case.controller'
import { caseAccess } from '../../src/middleware/caseAccess'
import { ApiError } from '../../src/utils/ApiError'
import { env } from '../../src/config/env'
import type { CaseRow } from '../../src/fairexit/types'
import crypto from 'crypto'

describe('Change 1: Direct PDF Download URL & Security Lifecycle Tests', () => {
  const rawToken = 'test-secret-case-token-12345'
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  const paidCase: CaseRow = {
    id: '11111111-2222-3333-4444-555555555555',
    public_id: 'FX-PDF-01',
    user_id: null,
    token_hashes: [tokenHash],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON' } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', years: 8, salary: 85000 },
    free_result: null,
    status: 'report_ready',
    status_detail: null,
    job_started_at: null,
    email: 'client@example.com',
    consent: null,
    remind: false,
    paid_at: new Date().toISOString(),
    payment_provider: 'stripe',
    amount_cents: 5900,
    currency: 'cad',
    contract_status: 'never',
    call_a: null,
    call_a_at: null,
    check_state: { rows: {}, attested: true, attested_at: new Date().toISOString() },
    attested_at: new Date().toISOString(),
    report_id: 'RPT-PDF-001',
    report: {
      reportId: 'RPT-PDF-001',
      executiveSummary: { headline: 'Severance analysis' },
    },
    report_inputs: { offer: 20000 },
    report_ready_at: new Date().toISOString(),
    report_pdf_path: '11111111-2222-3333-4444-555555555555/report.pdf',
    docs_delete_after: null,
    docs_deleted_at: null,
    report_delete_after: null,
    rules_version: '0.2.0',
    prompt_version: 'v0.7',
    prompt_sha256: 'sha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const unpaidCase: CaseRow = {
    ...paidCase,
    id: '22222222-3333-4444-5555-666666666666',
    public_id: 'FX-UNPAID-01',
    paid_at: null,
    amount_cents: null,
    currency: null,
    status: 'free_check',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('submitCustomerInfo returns distinct privateLink and pdfDownloadUrl', async () => {
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)
    vi.spyOn(caseService, 'update').mockImplementation(async (_id, patch) => ({
      ...paidCase,
      ...patch,
    }))

    const result = await caseService.submitCustomerInfo(paidCase.id, {
      name: 'Avery Morgan',
      email: 'avery@example.com',
    }, rawToken)

    expect(result.success).toBe(true)
    expect(result.customer.email).toBe('avery@example.com')
    // privateLink points to the web application report route
    expect(result.privateLink).toContain(`/report?case=${paidCase.id}&t=`)
    // pdfDownloadUrl points directly to the PDF download API endpoint
    expect(result.pdfDownloadUrl).toContain(`/cases/${paidCase.id}/report/pdf?t=`)
    expect(result.pdfDownloadUrl).not.toContain('/report?case=')
  })

  it('reportPdf serves raw binary PDF with Content-Type: application/pdf and attachment header', async () => {
    const fakePdfBytes = Buffer.from('%PDF-1.4 Fake PDF Content')
    vi.spyOn(flowService, 'pdf').mockResolvedValue(fakePdfBytes)

    const headers: Record<string, string> = {}
    let sentBuffer: Buffer | null = null

    const mockReq = {
      id: 'req-test-1',
      caseRow: paidCase,
      query: {},
    } as any

    const mockRes = {
      setHeader: (key: string, val: string) => {
        headers[key] = val
      },
      send: (buf: Buffer) => {
        sentBuffer = buf
      },
    } as any

    await caseController.reportPdf(mockReq, mockRes)

    expect(headers['Content-Type']).toBe('application/pdf')
    expect(headers['Content-Disposition']).toBe(`attachment; filename="FairExit-Severance-Report-${paidCase.report_id}.pdf"`)
    expect(sentBuffer).toEqual(fakePdfBytes)
  })

  it('reportPdf supports inline PDF viewing with download=0 query parameter', async () => {
    const fakePdfBytes = Buffer.from('%PDF-1.4 Fake PDF Content')
    vi.spyOn(flowService, 'pdf').mockResolvedValue(fakePdfBytes)

    const headers: Record<string, string> = {}
    let sentBuffer: Buffer | null = null

    const mockReq = {
      id: 'req-test-2',
      caseRow: paidCase,
      query: { download: '0' },
    } as any

    const mockRes = {
      setHeader: (key: string, val: string) => {
        headers[key] = val
      },
      send: (buf: Buffer) => {
        sentBuffer = buf
      },
    } as any

    await caseController.reportPdf(mockReq, mockRes)

    expect(headers['Content-Type']).toBe('application/pdf')
    expect(headers['Content-Disposition']).toBe(`inline; filename="FairExit-Severance-Report-${paidCase.report_id}.pdf"`)
    expect(sentBuffer).toEqual(fakePdfBytes)
  })

  it('reportPdf rejects unpaid cases with 400 Bad Request', async () => {
    const mockReq = {
      id: 'req-test-3',
      caseRow: unpaidCase,
      query: {},
    } as any

    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as any

    await expect(caseController.reportPdf(mockReq, mockRes)).rejects.toThrow(
      'Payment required before downloading purchased report'
    )
  })

  it('caseAccess middleware allows access via t query parameter on GET requests', async () => {
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)

    const mockReq = {
      params: { caseId: paidCase.id },
      method: 'GET',
      headers: {},
      query: { t: rawToken },
    } as any

    let nextCalled = false
    const mockNext = () => {
      nextCalled = true
    }

    await caseAccess(mockReq, {} as any, mockNext)

    expect(nextCalled).toBe(true)
    expect(mockReq.caseAccessVia).toBe('token')
    expect(mockReq.caseRow).toEqual(paidCase)
  })

  it('caseAccess middleware rejects requests with missing or invalid token with 404 Not Found', async () => {
    vi.spyOn(caseService, 'get').mockResolvedValue(paidCase)

    const mockReqInvalidToken = {
      params: { caseId: paidCase.id },
      method: 'GET',
      headers: {},
      query: { t: 'wrong-token-99999' },
    } as any

    let errorThrown: any = null
    const mockNext = (err?: any) => {
      if (err) errorThrown = err
    }

    await caseAccess(mockReqInvalidToken, {} as any, mockNext)
    expect(errorThrown).toBeDefined()
    expect(errorThrown.statusCode).toBe(404)
    expect(errorThrown.message).toBe('Case not found')
  })
})
