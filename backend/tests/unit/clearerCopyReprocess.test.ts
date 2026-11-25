import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type RowMap = Map<string, any[]>

const state = vi.hoisted(() => ({
  tables: new Map<string, any[]>([
    ['cases', []],
    ['case_documents', []],
    ['extracted_facts', []],
    ['corrected_facts', []],
    ['analysis_runs', []],
    ['payments', []],
  ]) as RowMap,
  storage: new Map<string, Buffer>(),
  callA: vi.fn(),
  callA2: vi.fn(),
  callB: vi.fn(),
  assertDailyLimit: vi.fn(),
  renderReportPdf: vi.fn(),
}))

function createQueryBuilder(tableName: string) {
  let mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  let payload: any = null
  const filters: Array<(r: any) => boolean> = []
  const sorts: Array<{ col: string; asc: boolean }> = []
  let onConflictCols: string[] = []

  const getRows = () => {
    if (!state.tables.has(tableName)) state.tables.set(tableName, [])
    return state.tables.get(tableName)!
  }

  const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

  const applyFilters = (rows: any[]) =>
    rows.filter((r) => filters.every((fn) => fn(r)))

  const applySorts = (rows: any[]) => {
    if (!sorts.length) return rows
    return [...rows].sort((a, b) => {
      for (const s of sorts) {
        if (a[s.col] < b[s.col]) return s.asc ? -1 : 1
        if (a[s.col] > b[s.col]) return s.asc ? 1 : -1
      }
      return 0
    })
  }

  const execute = (singleMode?: 'single' | 'maybeSingle') => {
    const rows = getRows()
    let data: any = null

    if (mode === 'select') {
      const matched = applySorts(applyFilters(rows)).map(clone)
      if (singleMode === 'single') {
        if (!matched.length) return { data: null, error: { message: 'Not found', code: 'PGRST116' } }
        data = matched[0]
      } else if (singleMode === 'maybeSingle') {
        data = matched[0] || null
      } else {
        data = matched
      }
      return { data, error: null }
    }

    if (mode === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload]
      const inserted = items.map((item) => {
        const now = new Date().toISOString()
        const rec = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || now,
          updated_at: item.updated_at || now,
          ...clone(item),
        }
        rows.push(rec)
        return clone(rec)
      })
      data = singleMode ? inserted[0] : inserted
      return { data, error: null }
    }

    if (mode === 'upsert') {
      const items = Array.isArray(payload) ? payload : [payload]
      const out: any[] = []
      for (const item of items) {
        const existingIdx = rows.findIndex((r) =>
          onConflictCols.length
            ? onConflictCols.every((c) => r[c] === item[c])
            : r.id === item.id,
        )
        const now = new Date().toISOString()
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...clone(item), updated_at: now }
          out.push(clone(rows[existingIdx]))
        } else {
          const rec = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...clone(item) }
          rows.push(rec)
          out.push(clone(rec))
        }
      }
      data = singleMode ? out[0] : out
      return { data, error: null }
    }

    if (mode === 'update') {
      const updated: any[] = []
      const now = new Date().toISOString()
      for (let i = 0; i < rows.length; i++) {
        if (filters.every((fn) => fn(rows[i]))) {
          rows[i] = { ...rows[i], ...clone(payload), updated_at: now }
          updated.push(clone(rows[i]))
        }
      }
      if (singleMode === 'single') {
        if (!updated.length) return { data: null, error: { message: 'Not found', code: 'PGRST116' } }
        data = updated[0]
      } else if (singleMode === 'maybeSingle') {
        data = updated[0] || null
      } else {
        data = updated
      }
      return { data, error: null }
    }

    if (mode === 'delete') {
      const kept: any[] = []
      const removed: any[] = []
      for (const r of rows) {
        if (filters.every((fn) => fn(r))) removed.push(clone(r))
        else kept.push(r)
      }
      state.tables.set(tableName, kept)
      return { data: removed, error: null }
    }

    return { data: null, error: null }
  }

  const builder: any = {
    select: () => builder,
    insert: (p: any) => {
      mode = 'insert'
      payload = p
      return builder
    },
    update: (p: any) => {
      mode = 'update'
      payload = p
      return builder
    },
    upsert: (p: any, opts?: { onConflict?: string }) => {
      mode = 'upsert'
      payload = p
      onConflictCols = (opts?.onConflict || '').split(',').map((s) => s.trim()).filter(Boolean)
      return builder
    },
    delete: () => {
      mode = 'delete'
      return builder
    },
    eq: (col: string, val: any) => {
      filters.push((r) => r[col] === val)
      return builder
    },
    in: (col: string, vals: any[]) => {
      filters.push((r) => vals.includes(r[col]))
      return builder
    },
    is: (col: string, val: any) => {
      filters.push((r) => (val === null ? (r[col] === null || r[col] === undefined) : r[col] === val))
      return builder
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      sorts.push({ col, asc: opts?.ascending !== false })
      return builder
    },
    single: () => Promise.resolve(execute('single')),
    maybeSingle: () => Promise.resolve(execute('maybeSingle')),
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(execute()).then(onFulfilled, onRejected),
  }
  return builder
}

vi.mock('../../src/config/db', () => ({
  db: () => ({
    from: (table: string) => createQueryBuilder(table),
  }),
  check: <T>(res: { data: T; error: { message: string } | null }) => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  },
}))

vi.mock('../../src/services/storage.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/storage.service')>()
  return {
    ...actual,
    storageService: {
      upload: vi.fn(async (bucket: string, storagePath: string, body: Buffer) => {
        state.storage.set(`${bucket}:${storagePath}`, Buffer.from(body))
      }),
      download: vi.fn(async (bucket: string, storagePath: string) => {
        const found = state.storage.get(`${bucket}:${storagePath}`)
        if (!found) throw new Error(`Missing object ${bucket}:${storagePath}`)
        return Buffer.from(found)
      }),
      exists: vi.fn(async (bucket: string, storagePath: string) => {
        const found = state.storage.get(`${bucket}:${storagePath}`)
        return { exists: !!found, size: found?.length ?? null }
      }),
      remove: vi.fn(async (bucket: string, paths: string[]) => {
        for (const p of paths) state.storage.delete(`${bucket}:${p}`)
      }),
      signedUpload: vi.fn(async (storagePath: string) => ({
        uploadUrl: `https://storage.local/upload/${storagePath}`,
        uploadToken: 'tok',
      })),
    },
  }
})

vi.mock('../../src/services/ai.service', () => ({
  aiService: {
    callA: state.callA,
    callA2: state.callA2,
    callB: state.callB,
  },
  assertDailyLimit: state.assertDailyLimit,
}))

vi.mock('../../src/services/pdf.service', () => ({
  renderReportPdf: state.renderReportPdf,
}))

import { caseService } from '../../src/services/case.service'
import { documentService } from '../../src/services/document.service'
import { flowService } from '../../src/services/flow.service'
import { paymentService } from '../../src/services/payment.service'
import { reviewService } from '../../src/services/review.service'
import { storageService } from '../../src/services/storage.service'
import { emailService } from '../../src/services/email.service'
import { isRunning } from '../../src/utils/background'
import { env } from '../../src/config/env'

function validReportPayload(offerDisplay: string, glanceText: string) {
  return {
    cover: { role_line: 'Senior Analyst', place_line: 'Ontario, Canada', name_line: 'Alex Taylor' },
    glance: glanceText,
    confirmed_line: `Confirmed offer ${offerDisplay}.`,
    checks: [
      {
        topic: 'Severance offer',
        letter_says: offerDisplay,
        rule_says: 'Common law range applies',
        status: 'ok' as const,
        why: 'Matches updated document extraction.',
        source_id: null,
      },
    ],
    questions: ['Ask about benefits continuation'],
    next_steps: ['Review before signing deadline'],
    citations_used: [],
  }
}

async function seedPaidCase(country: 'CA' | 'US') {
  const { row } = await caseService.create({
    country,
    platform: 'web',
    answers:
      country === 'CA'
        ? { province: 'ON', age: 44, years: 6, salary: 104000, offer: 45000, role: 'Analyst', ended: 'without_cause' }
        : { state: 'NY', age: 44, years: 6, salary: 104000, offer: 45000, advanceNotice: 'none' },
  })

  await documentService.uploadBase64(row, {
    kind: 'letter',
    fileName: 'initial-letter.pdf',
    mimeType: 'application/pdf',
    dataBase64: Buffer.from('blurry-page-1').toString('base64'),
  })
  await documentService.uploadBase64(row, {
    kind: 'contract',
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    dataBase64: Buffer.from('contract-page-1').toString('base64'),
  })

  await caseService.update(row.id, {
    paid_at: new Date().toISOString(),
    payment_provider: 'stripe',
    amount_cents: 5900,
    currency: country === 'CA' ? 'CAD' : 'USD',
    status: 'paid',
    email: 'alex@example.com',
    consent: {
      name: 'Alex Taylor',
      email: 'alex@example.com',
      source: 'post-payment-collection',
      submitted_at: new Date().toISOString(),
    },
    answers: {
      ...(row.answers || {}),
      customer_name: 'Alex Taylor',
      name: 'Alex Taylor',
    },
  })

  return caseService.get(row.id)
}

async function completeInitialReport(caseId: string, country: 'CA' | 'US') {
  const initialCallA =
    country === 'CA'
      ? {
          facts: [
            { key: 'offer_amount', value: '15000', document: 'letter', quote: '$15,000 blurry', where: 'p.1', confidence: 'low' },
            { key: 'notice_weeks', value: '8', document: 'letter', quote: '8 weeks', where: 'p.1', confidence: 'high' },
            { key: 'age', value: '44', document: 'letter', quote: 'Age 44', where: 'p.1', confidence: 'high' },
            { key: 'pay', value: '104000', document: 'letter', quote: '$104,000', where: 'p.1', confidence: 'high' },
          ],
          missing: [],
        }
      : {
          facts: [
            { key: 'offer_amount', value: '15000', document: 'letter', quote: '$15,000 blurry', where: 'p.1', confidence: 'low' },
            { key: 'days_to_decide', value: '21', document: 'letter', quote: '21 days', where: 'p.1', confidence: 'high' },
            { key: 'age', value: '44', document: 'letter', quote: 'Age 44', where: 'p.1', confidence: 'high' },
            { key: 'pay', value: '104000', document: 'letter', quote: '$104,000', where: 'p.1', confidence: 'high' },
          ],
          missing: [],
        }

  state.callA.mockResolvedValueOnce(initialCallA)
  state.callB.mockResolvedValueOnce(validReportPayload('$15,000', 'Initial report from blurry scan ($15,000).'))
  state.renderReportPdf.mockResolvedValueOnce(Buffer.from('PDF-V1-BYTES'))

  await flowService.startRead(await caseService.get(caseId))
  await vi.waitFor(async () => {
    const c = await caseService.get(caseId)
    expect(c.status).toBe('checking')
  })

  await flowService.resolveConflict(await caseService.get(caseId), 'offer_amount', { choice: 'document' })
  await flowService.rowAction(await caseService.get(caseId), country === 'CA' ? 'notice_weeks' : 'days_to_decide', { action: 'confirm' })
  await flowService.attest(await caseService.get(caseId), true)
  await flowService.startBuild(await caseService.get(caseId))

  await vi.waitFor(async () => {
    const c = await caseService.get(caseId)
    expect(c.status).toBe('ready')
    expect(c.report_pdf_path).toBeTruthy()
    expect(isRunning(`build:${caseId}`)).toBe(false)
  })

  return caseService.get(caseId)
}

describe('Add a clearer copy: full reprocessing without repeat payment', () => {
  beforeEach(() => {
    state.tables = new Map([
      ['cases', []],
      ['case_documents', []],
      ['extracted_facts', []],
      ['corrected_facts', []],
      ['analysis_runs', []],
      ['payments', []],
    ])
    state.storage.clear()
    vi.clearAllMocks()
    state.assertDailyLimit.mockResolvedValue(undefined)
    state.renderReportPdf.mockResolvedValue(Buffer.from('DEFAULT-PDF-BYTES'))
    emailService.setMockTransport(async () => ({ sent: true, id: 'mock-email-id' }))
  })

  it('already-paid Canada user uploads clearer copy -> preserves original docs, resets review states, re-runs full AI pipeline without checkout, and updates report', async () => {
    const seeded = await seedPaidCase('CA')
    const initialReady = await completeInitialReport(seeded.id, 'CA')
    const oldPdfPath = initialReady.report_pdf_path!
    expect(initialReady.report_id).toBeTruthy()

    // Trying checkout endpoints on already-paid case rejects cleanly
    await expect(
      paymentService.prepare(initialReady, { termsAccepted: true, email: 'alex@example.com' }),
    ).rejects.toThrow(/already paid/i)

    // Upload supplemental clearer letter (never deleting initial letter or contract)
    const clearerDoc = await documentService.uploadBase64(initialReady, {
      kind: 'letter',
      fileName: 'clearer-letter-page2.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('clearer-page-2').toString('base64'),
    })
    expect(clearerDoc.page).toBe(2)

    const allDocs = await caseService.documents(initialReady.id)
    expect(allDocs.map((d) => [d.kind, d.file_name || d.original_name])).toEqual([
      ['contract', 'contract.pdf'],
      ['letter', 'initial-letter.pdf'],
      ['letter', 'clearer-letter-page2.pdf'],
    ])

    // Save a stale user correction prior to reprocessing to prove it is cleared on fresh Call A
    await reviewService.saveUserCorrection(initialReady.id, { key: 'employer_name', value: 'Old Wrong Corp', action: 'change' })

    const loadedKinds: Array<{ kind: string; page: number; data: string }> = []
    state.callA.mockImplementationOnce(async (c) => {
      const docs = await documentService.loadForAi(c)
      for (const d of docs) loadedKinds.push({ kind: d.kind, page: d.page, data: d.data.toString('utf8') })
      return {
        facts: [
          { key: 'offer_amount', value: '45000', document: 'letter', quote: '$45,000 lump sum', where: 'p.2', confidence: 'high' },
          { key: 'notice_weeks', value: '18', document: 'letter', quote: '18 weeks pay', where: 'p.2', confidence: 'high' },
          { key: 'age', value: '46', document: 'letter', quote: 'Age 46', where: 'p.2', confidence: 'high' },
          { key: 'pay', value: '120000', document: 'letter', quote: '$120,000 annual base', where: 'p.2', confidence: 'high' },
        ],
        missing: [],
      }
    })
    state.callB.mockImplementationOnce(async (_c, input) => {
      expect(input).toBeTruthy()
      return validReportPayload('$45,000', 'Reprocessed report using clearer letter ($45,000 / 18 weeks).')
    })
    state.renderReportPdf.mockResolvedValueOnce(Buffer.from('PDF-V2-BYTES'))

    const readStart = await flowService.startRead(await caseService.get(initialReady.id))
    expect(readStart).toEqual({ started: true, status: 'reading' })

    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('checking')
    })

    // Call A received ALL original docs plus the newly uploaded clearer copy (ordered by kind, page)
    expect(loadedKinds).toEqual([
      { kind: 'contract', page: 1, data: 'contract-page-1' },
      { kind: 'letter', page: 1, data: 'blurry-page-1' },
      { kind: 'letter', page: 2, data: 'clearer-page-2' },
    ])

    // Review confirmation states, attested flag, and stale corrected_facts were reset
    const afterReadCase = await caseService.get(initialReady.id)
    expect(afterReadCase.check_state?.attested).toBe(false)
    expect(afterReadCase.check_state?.rows).toEqual({})
    expect(afterReadCase.check_state?.dismissed).toEqual([])
    const reviewAfterRead = await reviewService.getReviewData(initialReady.id)
    expect(reviewAfterRead.correctedFacts).toEqual({})
    // Conflicts re-detected against updated clearer doc values (age 46 vs 44, pay 120k vs 104k)
    expect(reviewAfterRead.reviewModel?.conflicts.map((x: any) => x.key)).toEqual(
      expect.arrayContaining(['age', 'pay']),
    )

    // Previous report remains preserved while in checking before Call B succeeds
    expect(afterReadCase.report).toBeTruthy()
    expect((afterReadCase.report as any).glance).toContain('$15,000')
    expect(flowService.reportStatus(afterReadCase).ready).toBe(false)
    expect(flowService.reportStatus(afterReadCase).previousReportAvailable).toBe(true)

    // Resolve updated conflicts, attest, and rebuild Call B -> new report
    await flowService.resolveConflict(await caseService.get(initialReady.id), 'age', { choice: 'document' })
    await flowService.resolveConflict(await caseService.get(initialReady.id), 'pay', { choice: 'document' })
    await flowService.attest(await caseService.get(initialReady.id), true)

    const buildStart = await flowService.startBuild(await caseService.get(initialReady.id))
    expect(buildStart.started).toBe(true)
    expect(buildStart.status).toBe('building')

    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('ready')
    })

    const finalCase = await caseService.get(initialReady.id)
    expect((finalCase.report as any).glance).toContain('$45,000')
    expect((finalCase.report_inputs as any)?.previousReport).toBeUndefined()
    expect((finalCase.report_inputs as any)?.reprocessPendingBuild).toBeUndefined()
    expect(finalCase.report_pdf_path).not.toBe(oldPdfPath)
    expect(finalCase.paid_at).toBe(initialReady.paid_at)
    expect((await flowService.pdf(finalCase)).toString('utf8')).toBe('PDF-V2-BYTES')
    // Previous PDF object was never corrupted during or after rebuild
    expect(state.storage.get(`${env.REPORTS_BUCKET}:${oldPdfPath}`)?.toString('utf8')).toBe('PDF-V1-BYTES')
  })

  it('US user adds a clearer copy -> preserves US jurisdiction and completes full reprocessing without repeat payment', async () => {
    const seeded = await seedPaidCase('US')
    const initialReady = await completeInitialReport(seeded.id, 'US')

    await documentService.uploadBase64(initialReady, {
      kind: 'letter',
      fileName: 'us-clearer-agreement.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('us-clearer-agreement').toString('base64'),
    })

    state.callA.mockResolvedValueOnce({
      facts: [
        { key: 'offer_amount', value: '55000', document: 'letter', quote: '$55,000 separation payment', where: 'p.2', confidence: 'high' },
        { key: 'days_to_decide', value: '21', document: 'letter', quote: '21 days', where: 'p.2', confidence: 'high' },
        { key: 'age', value: '44', document: 'letter', quote: 'Age 44', where: 'p.2', confidence: 'high' },
        { key: 'pay', value: '104000', document: 'letter', quote: '$104,000', where: 'p.2', confidence: 'high' },
      ],
      missing: [],
    })
    state.callB.mockResolvedValueOnce(validReportPayload('$55,000', 'US report updated with clearer agreement ($55,000).'))
    state.renderReportPdf.mockResolvedValueOnce(Buffer.from('US-PDF-V2'))

    await flowService.startRead(await caseService.get(initialReady.id))
    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('checking')
    })

    const checked = await caseService.get(initialReady.id)
    expect(checked.country).toBe('US')
    expect(checked.jurisdiction_code).toBe('US-NY')
    await flowService.resolveConflict(checked, 'offer_amount', { choice: 'document' })
    await flowService.attest(await caseService.get(initialReady.id), true)
    await flowService.startBuild(await caseService.get(initialReady.id))

    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('ready')
    })

    const finalUS = await caseService.get(initialReady.id)
    expect(finalUS.country).toBe('US')
    expect((finalUS.report as any).glance).toContain('$55,000')
    expect((await flowService.pdf(finalUS)).toString('utf8')).toBe('US-PDF-V2')
  })

  it('failure during Call A or Call B or PDF upload preserves previous completed report & new doc, and retry completes without paying again', async () => {
    const seeded = await seedPaidCase('CA')
    const initialReady = await completeInitialReport(seeded.id, 'CA')
    const oldPdfPath = initialReady.report_pdf_path!

    await documentService.uploadBase64(initialReady, {
      kind: 'letter',
      fileName: 'clearer-letter.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('clearer-bytes').toString('base64'),
    })

    // 1. Simulate Call A failure
    state.callA.mockRejectedValueOnce(new Error('Claude Call A temporary error'))
    await flowService.startRead(await caseService.get(initialReady.id))
    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('failed')
    })

    const failedReadCase = await caseService.get(initialReady.id)
    expect(failedReadCase.status_detail).toBe('read_failed')
    // Previous completed report JSON + PDF remain available and untouched
    expect(flowService.reportStatus(failedReadCase)).toMatchObject({
      ready: false,
      failed: true,
      previousReportAvailable: true,
    })
    expect((flowService.report(failedReadCase).report as any).glance).toContain('$15,000')
    expect((await flowService.pdf(failedReadCase)).toString('utf8')).toBe('PDF-V1-BYTES')
    expect((await caseService.documents(initialReady.id)).some((d) => d.original_name === 'clearer-letter.pdf')).toBe(true)

    // 2. Retry Call A without paying again -> succeeds
    state.callA.mockResolvedValueOnce({
      facts: [
        { key: 'offer_amount', value: '50000', document: 'letter', quote: '$50,000', where: 'p.2', confidence: 'high' },
        { key: 'age', value: '44', document: 'letter', quote: '44', where: 'p.2', confidence: 'high' },
        { key: 'pay', value: '104000', document: 'letter', quote: '104000', where: 'p.2', confidence: 'high' },
      ],
      missing: [],
    })
    const retryRead = await flowService.startRead(failedReadCase)
    expect(retryRead).toEqual({ started: true, status: 'reading' })
    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('checking')
    })

    // 3. Simulate Call B storage failure -> must NOT replace previous report or mark new report ready
    await flowService.resolveConflict(await caseService.get(initialReady.id), 'offer_amount', { choice: 'document' })
    await flowService.attest(await caseService.get(initialReady.id), true)
    state.callB.mockResolvedValueOnce(validReportPayload('$50,000', 'Draft new report that failed PDF store.'))
    state.renderReportPdf.mockResolvedValueOnce(Buffer.from('PDF-V2-DRAFT'))
    vi.mocked(storageService.upload).mockRejectedValueOnce(new Error('Storage upload outage'))

    await flowService.startBuild(await caseService.get(initialReady.id))
    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('failed')
    })

    const failedBuildCase = await caseService.get(initialReady.id)
    expect(flowService.reportStatus(failedBuildCase)).toMatchObject({
      ready: false,
      failed: true,
      previousReportAvailable: true,
    })
    expect((failedBuildCase.report as any).glance).toContain('$15,000')
    expect(failedBuildCase.report_pdf_path).toBe(oldPdfPath)
    expect((await flowService.pdf(failedBuildCase)).toString('utf8')).toBe('PDF-V1-BYTES')

    // 4. Retry Call B without paying again -> completes cleanly and updates active report
    state.callB.mockResolvedValueOnce(validReportPayload('$50,000', 'Recovered new report ($50,000).'))
    state.renderReportPdf.mockResolvedValueOnce(Buffer.from('PDF-V2-RECOVERED'))
    const retryBuild = await flowService.startBuild(failedBuildCase)
    expect(retryBuild.started).toBe(true)

    await vi.waitFor(async () => {
      const c = await caseService.get(initialReady.id)
      expect(c.status).toBe('ready')
    })

    const recoveredCase = await caseService.get(initialReady.id)
    expect((recoveredCase.report as any).glance).toContain('$50,000')
    expect((await flowService.pdf(recoveredCase)).toString('utf8')).toBe('PDF-V2-RECOVERED')
  })

  it('unpaid user uploading additional clearer document still follows existing payment flow and cannot bypass payment', async () => {
    const { row } = await caseService.create({
      country: 'US',
      platform: 'web',
      answers: { state: 'CA', years: 4, salary: 120000, offer: 20000 },
    })
    await documentService.uploadBase64(row, {
      kind: 'letter',
      fileName: 'blurry-letter.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('blurry').toString('base64'),
    })
    await documentService.uploadBase64(row, {
      kind: 'letter',
      fileName: 'clearer-letter.pdf',
      mimeType: 'application/pdf',
      dataBase64: Buffer.from('clearer').toString('base64'),
    })
    await documentService.setContractStatus(await caseService.get(row.id), 'never')

    const unpaid = await caseService.get(row.id)
    const docs = await caseService.documents(unpaid.id)
    expect(caseService.isPaid(unpaid)).toBe(false)
    expect(caseService.nextStep(unpaid, docs)).toBe('pay')
    expect(docs).toHaveLength(2)

    await expect(flowService.startRead(unpaid)).rejects.toThrow('Payment required before reading documents')
  })

  it('concurrent startRead and startBuild requests prevent duplicate processing jobs', async () => {
    const seeded = await seedPaidCase('CA')
    const initialReady = await completeInitialReport(seeded.id, 'CA')
    state.callA.mockClear()
    state.callB.mockClear()

    let resolveA!: (val: any) => void
    state.callA.mockImplementationOnce(() => new Promise((r) => { resolveA = r }))

    const [r1, r2] = await Promise.all([
      flowService.startRead(initialReady),
      flowService.startRead(initialReady),
    ])
    expect(r1.started).toBe(true)
    expect(r2.started).toBe(false)
    expect(r2.status).toBe('reading')

    await vi.waitFor(() => {
      expect(typeof resolveA).toBe('function')
    })
    resolveA({
      facts: [
        { key: 'offer_amount', value: '45000', document: 'letter', quote: '$45,000', where: 'p.1', confidence: 'high' },
      ],
      missing: [],
    })
    await vi.waitFor(async () => {
      expect((await caseService.get(initialReady.id)).status).toBe('checking')
    })
    expect(state.callA).toHaveBeenCalledTimes(1)

    await flowService.attest(await caseService.get(initialReady.id), true)
    let resolveB!: (val: any) => void
    state.callB.mockImplementationOnce(() => new Promise((r) => { resolveB = r }))

    const checked = await caseService.get(initialReady.id)
    const [b1, b2] = await Promise.all([
      flowService.startBuild(checked),
      flowService.startBuild(checked),
    ])
    expect([b1.started, b2.started].filter(Boolean)).toHaveLength(1)

    await vi.waitFor(() => {
      expect(typeof resolveB).toBe('function')
    })
    resolveB(validReportPayload('$45,000', 'Single build output.'))
    await vi.waitFor(async () => {
      expect((await caseService.get(initialReady.id)).status).toBe('ready')
    })
    expect(state.callB).toHaveBeenCalledTimes(1)
  })

  it('frontend upload, review, loading, and ready pages preserve case context, check backend payment, and preserve previous report on failure', () => {
    const rootDir = path.resolve(__dirname, '../../..')
    const caReview = fs.readFileSync(path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx'), 'utf8')
    const usReview = fs.readFileSync(path.join(rootDir, 'src/components/report/us/USReviewPage.tsx'), 'utf8')
    const uploadPage = fs.readFileSync(path.join(rootDir, 'src/components/report/ReportUploadPage.tsx'), 'utf8')
    const reportFlow = fs.readFileSync(path.join(rootDir, 'src/app/report/ReportFlow.tsx'), 'utf8')
    const readyPage = fs.readFileSync(path.join(rootDir, 'src/components/report/PaidReportReadyPage.tsx'), 'utf8')

    // Review pages preserve caseId and country when navigating to "Add a clearer copy"
    expect(caReview).not.toContain('router.push("/report?step=upload")')
    expect(usReview).not.toContain('router.push("/report?step=upload")')
    expect(caReview).toContain('buildReportStepUrl({ step: "upload", caseId: caseId || cs?.id, country: "CA" })')
    expect(usReview).toContain('buildReportStepUrl({ step: "upload", caseId: caseId || cs?.id, country: "US" })')

    // Upload page verifies payment from backend via getCase and starts Call A directly without checkout when paid
    expect(uploadPage).toContain('await fairexit.getCase(activeCaseId)')
    expect(uploadPage).toContain('if (freshCase?.paid)')
    expect(uploadPage).toContain('await fairexit.startRead(activeCaseId)')
    expect(uploadPage).toContain('submitLockRef.current')

    // ReportFlow keeps paid users with customer info out of ReportSalesPage and routes dynamically from upload onContinue
    expect(reportFlow).toContain('urlStep === "pay" && cs?.paid && hasCompletedPostPaymentCollection(cs)')
    expect(reportFlow).toContain('onContinue={async (targetStep = "pay") =>')

    // PaidReportReadyPage handles build failure even when a prior report exists and provides previous PDF download fallback
    expect(readyPage).toContain('if (buildStatus === "building" || buildStatus === "failed")')
    expect(readyPage).toContain('previousReportPdfUrl={previousReportPdfUrl}')
    expect(readyPage).toContain('if (cs && cs.status === "checking" && !autoBuildAttemptedRef.current)')
  })
})
