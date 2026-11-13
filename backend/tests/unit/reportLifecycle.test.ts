import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  callB: vi.fn(),
  renderReportPdf: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  update: vi.fn(),
  claimBuild: vi.fn(),
  get: vi.fn(),
  assertDailyLimit: vi.fn(),
}))

vi.mock('../../src/services/ai.service', () => ({
  aiService: { callB: mocks.callB },
  assertDailyLimit: mocks.assertDailyLimit,
}))

vi.mock('../../src/services/pdf.service', () => ({
  renderReportPdf: mocks.renderReportPdf,
}))

vi.mock('../../src/services/storage.service', () => ({
  storageService: {
    upload: mocks.upload,
    download: mocks.download,
  },
}))

vi.mock('../../src/services/case.service', () => ({
  caseService: {
    update: mocks.update,
    claimBuild: mocks.claimBuild,
    get: mocks.get,
    healStale: vi.fn((row) => row),
    documents: vi.fn().mockResolvedValue([]),
    addToken: vi.fn().mockResolvedValue('token-123'),
  },
}))

import * as CP from '../../src/fairexit/checkPage'
import { flowService } from '../../src/services/flow.service'
import { caseService } from '../../src/services/case.service'
import type { CaseRow } from '../../src/fairexit/types'

describe('Report Lifecycle, Interruption, Stale Jobs, and Recovery', () => {
  const baseCase: CaseRow = {
    id: '11111111-1111-1111-1111-111111111111',
    public_id: 'FX-9001',
    user_id: null,
    token_hashes: ['hash'],
    platform: 'web',
    country: 'CA',
    jurisdiction_code: 'CA-ON',
    jurisdiction: { name: 'Ontario', code: 'CA-ON', regime: 'ca_common_law', words: { letter: 'letter', contract: 'contract' } } as any,
    covered: true,
    industry: null,
    answers: { province: 'ON', years: 5, salary: 100000 },
    free_result: null,
    status: 'checking',
    status_detail: null,
    job_started_at: null,
    email: 'user@example.com',
    consent: null,
    remind: false,
    paid_at: new Date().toISOString(),
    payment_provider: 'stripe',
    amount_cents: 5900,
    currency: 'CAD',
    contract_status: 'never',
    call_a: { facts: [{ key: 'years', value: 5, confidence: 'high' }], missing: [] } as any,
    call_a_at: new Date().toISOString(),
    check_state: {
      rows: { years: { status: 'confirmed', doc_value: 5, source: 'document' } },
      attested: true,
      attested_at: new Date().toISOString(),
    },
    attested_at: new Date().toISOString(),
    report_id: 'RPT-TEST-001',
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
    vi.clearAllMocks()
    mocks.renderReportPdf.mockResolvedValue(Buffer.from('pdf-bytes'))
    mocks.upload.mockResolvedValue(undefined)
    mocks.download.mockResolvedValue(Buffer.from('downloaded-pdf'))
    mocks.assertDailyLimit.mockResolvedValue(undefined)
    vi.spyOn(CP, 'buildModel').mockReturnValue({
      build: { allRequiredConfirmed: true, label: 'Ready to build' },
    } as any)
  })

  it('rejects duplicate execution when case is already building', async () => {
    const buildingCase = { ...baseCase, status: 'building' as const, report_inputs: { generationId: 'active-gen-1' } }
    const result = await flowService.startBuild(buildingCase)

    expect(result.started).toBe(false)
    expect(result.status).toBe('building')
    expect(result.generationId).toBe('active-gen-1')
    expect(mocks.callB).not.toHaveBeenCalled()
  })

  it('preserves idempotency and recovers PDF without invoking Claude when JSON exists', async () => {
    const savedJson = {
      cover: { client_name: 'Alex' },
      verdict: { title: 'Fair offer' },
      citations_used: [],
      _meta: { generation_id: 'gen-persisted-123', generated_at: new Date().toISOString() },
    }
    const caseWithJson: CaseRow = {
      ...baseCase,
      status: 'ready',
      status_detail: 'pdf_pending',
      report: savedJson as any,
      report_ready_at: new Date().toISOString(),
      report_pdf_path: null,
      report_inputs: { generationId: 'gen-persisted-123' },
    }

    const result = await flowService.startBuild(caseWithJson)

    expect(result.status).toBe('ready')
    expect(result.pdfReady).toBe(true)
    expect(mocks.callB).not.toHaveBeenCalled()
    expect(mocks.renderReportPdf).toHaveBeenCalled()
    expect(mocks.upload).toHaveBeenCalled()
  })

  it('persists structured error and failedStage when Claude Call B fails', async () => {
    mocks.claimBuild.mockResolvedValueOnce({
      ...baseCase,
      status: 'building',
      status_detail: 'preparing',
      report_id: 'RPT-ERR-001',
      job_started_at: new Date().toISOString(),
      report_inputs: { generationId: 'gen-err-1' },
    })

    mocks.callB.mockRejectedValueOnce(new Error('Claude API stream timed out after 50s'))
    mocks.update.mockResolvedValue({})

    const startResult = await flowService.startBuild(baseCase)
    expect(startResult).toMatchObject({ started: true, status: 'building' })

    // Wait for the background job to finish its work
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mocks.update).toHaveBeenCalledWith(
      baseCase.id,
      expect.objectContaining({
        status: 'failed',
        status_detail: 'claude_failed',
        report_inputs: expect.objectContaining({
          lastError: 'Claude API stream timed out after 50s',
          failedStage: 'claude',
        }),
      }),
    )
  })

  it('heals a stale job: transitions to pdf_pending if JSON was saved, or failed if interrupted during Claude', async () => {
    // We test the real healStale logic
    const { caseService: realCaseService } = await vi.importActual<any>('../../src/services/case.service')

    // Stale timestamp 15 minutes ago (> 12 minutes STALE_JOB_MS)
    const fiveMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const updateSpy = vi.fn().mockImplementation((_id, patch) => ({ ...patch }))
    realCaseService.update = updateSpy

    // Case 1: Interrupted during Claude (no report JSON)
    const staleClaudeJob: CaseRow = {
      ...baseCase,
      status: 'building',
      status_detail: 'claude',
      job_started_at: fiveMinutesAgo,
      report: null,
      report_inputs: { generationId: 'gen-lost' },
    }

    await realCaseService.healStale(staleClaudeJob)
    expect(updateSpy).toHaveBeenCalledWith(
      staleClaudeJob.id,
      expect.objectContaining({
        status: 'failed',
        status_detail: 'build_failed',
        report_inputs: expect.objectContaining({
          failedStage: 'claude',
        }),
      }),
    )

    // Case 2: JSON was saved before interruption (should recover to ready / pdf_pending)
    updateSpy.mockClear()
    const stalePdfJob: CaseRow = {
      ...baseCase,
      status: 'building',
      status_detail: 'pdf',
      job_started_at: fiveMinutesAgo,
      report: { _meta: { generation_id: 'gen-saved' } } as any,
      report_inputs: { generationId: 'gen-saved' },
    }

    await realCaseService.healStale(stalePdfJob)
    expect(updateSpy).toHaveBeenCalledWith(
      stalePdfJob.id,
      expect.objectContaining({
        status: 'ready',
        status_detail: 'pdf_pending',
        job_started_at: null,
      }),
    )
  })

  it('distinguishes all report status stages accurately in reportStatus()', () => {
    // 1. Building stage
    const buildingStatus = flowService.reportStatus({
      ...baseCase,
      status: 'building',
      status_detail: 'claude',
      report_inputs: { generationId: 'gen-stage-1' },
    })
    expect(buildingStatus).toMatchObject({
      status: 'building',
      stage: 'claude',
      ready: false,
      pdfReady: false,
      failed: false,
    })

    // 2. Ready but PDF pending
    const pdfPendingStatus = flowService.reportStatus({
      ...baseCase,
      status: 'ready',
      status_detail: 'pdf_pending',
      report: { cover: {} } as any,
      report_pdf_path: null,
      report_ready_at: new Date().toISOString(),
    })
    expect(pdfPendingStatus).toMatchObject({
      status: 'ready',
      stage: 'pdf_pending',
      ready: true,
      pdfReady: false,
      failed: false,
    })

    // 3. Failed stage with persisted error
    const failedStatus = flowService.reportStatus({
      ...baseCase,
      status: 'failed',
      status_detail: 'claude_failed',
      report_inputs: {
        lastError: 'Anthropic rate limit exceeded',
        failedStage: 'claude',
      },
    })
    expect(failedStatus).toMatchObject({
      status: 'failed',
      failed: true,
      failedStage: 'claude',
      error: 'Anthropic rate limit exceeded',
    })
  })
})
