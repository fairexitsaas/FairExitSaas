import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  renderPdf: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  update: vi.fn(),
  callB: vi.fn(),
  isEntitled: vi.fn(),
}))

vi.mock('../../src/services/pdf.service', () => ({ renderReportPdf: mocks.renderPdf }))
vi.mock('../../src/services/storage.service', () => ({ storageService: { upload: mocks.upload, download: mocks.download } }))
vi.mock('../../src/services/case.service', () => ({ caseService: { update: mocks.update, isEntitled: mocks.isEntitled } }))
vi.mock('../../src/services/ai.service', () => ({ aiService: { callB: mocks.callB }, assertDailyLimit: vi.fn() }))

import { flowService } from '../../src/services/flow.service'

describe('saved JSON PDF recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.isEntitled.mockReturnValue(true)
    mocks.renderPdf.mockResolvedValue(Buffer.from('saved-json-pdf'))
    mocks.upload.mockRejectedValueOnce(new Error('temporary storage error')).mockResolvedValue(undefined)
    mocks.download.mockRejectedValue(new Error('no stored PDF'))
    mocks.update.mockResolvedValue({})
    vi.spyOn(flowService, 'renderMeta').mockReturnValue({ reportId: 'RPT-PDF-RETRY' } as any)
  })

  it('keeps status reads independent from Claude generation', () => {
    const status = flowService.reportStatus({
      id: 'case-status-only',
      status: 'building',
      report_id: 'RPT-STATUS',
      report_inputs: { generationId: 'generation-status' },
      report: null,
      report_pdf_path: null,
    } as any)

    expect(status).toMatchObject({ status: 'building', reportId: 'RPT-STATUS', generationId: 'generation-status' })
    expect(mocks.callB).not.toHaveBeenCalled()
  })

  it('reuses the generated PDF on storage retry and never invokes Call B', async () => {
    const c: any = {
      id: 'case-pdf-retry',
      status: 'ready',
      report_id: 'RPT-PDF-RETRY',
      report: { cover: {}, checks: [] },
      report_inputs: { generationId: 'generation-one' },
      report_pdf_path: null,
    }

    const first = await flowService.pdf(c)
    const second = await flowService.pdf(c)

    expect(first.toString()).toBe('saved-json-pdf')
    expect(second.toString()).toBe('saved-json-pdf')
    expect(mocks.renderPdf).toHaveBeenCalledTimes(1)
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    expect(mocks.callB).not.toHaveBeenCalled()
  })
})
