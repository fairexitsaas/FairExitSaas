import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  normalizeUSStateParam,
  resolveUSFlowEntryStep,
} from '../../../src/lib/report-storage'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'
import * as CP from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { renderReportHtml, reportNumbers } from '../../src/fairexit/reportOutput'
import { mockCallA, mockCallB } from '../../src/fairexit/mocks'
import type { CaseRow } from '../../src/fairexit/types'

const rootDir = path.resolve(__dirname, '../../..')

describe('Round 3 A7 — US Free Check: Skip Duplicate State Question', () => {
  it('Test 1 & 2: Prefilled homepage state (California / New York / code) skips us-situation-q1 directly to us-situation-q2 and preserves chosen state', () => {
    const ca = resolveUSFlowEntryStep({ stateParam: 'California' })
    expect(ca).toEqual({
      prefilledState: 'California',
      initialStep: 'us-situation-q2',
      hasPrefilledState: true,
    })

    const ny = resolveUSFlowEntryStep({ stateParam: 'New York' })
    expect(ny).toEqual({
      prefilledState: 'New York',
      initialStep: 'us-situation-q2',
      hasPrefilledState: true,
    })

    // Case-insensitive and 2-letter code normalization
    expect(resolveUSFlowEntryStep({ stateParam: 'new york' }).prefilledState).toBe('New York')
    expect(resolveUSFlowEntryStep({ stateParam: 'NY' })).toEqual({
      prefilledState: 'New York',
      initialStep: 'us-situation-q2',
      hasPrefilledState: true,
    })
    expect(resolveUSFlowEntryStep({ stateParam: 'Illinois' }).prefilledState).toBe('Illinois')
    expect(normalizeUSStateParam('washington dc')).toBe('Washington, DC')
  })

  it('Test 3: Empty, missing, or unknown state keeps the original state question (us-situation-q1); Other state preserves us-state-stop', () => {
    for (const missing of [undefined, null, '', '   ', 'NotARealPlace']) {
      expect(resolveUSFlowEntryStep({ stateParam: missing })).toEqual({
        prefilledState: '',
        initialStep: 'us-situation-q1',
        hasPrefilledState: false,
      })
    }

    expect(resolveUSFlowEntryStep({ stateParam: 'Other state' })).toEqual({
      prefilledState: 'Other state',
      initialStep: 'us-state-stop',
      hasPrefilledState: false,
    })

    // Explicit step params take precedence while keeping prefilled state
    expect(resolveUSFlowEntryStep({ stateParam: 'New York', stepParam: 'results' })).toEqual({
      prefilledState: 'New York',
      initialStep: 'step-results',
      hasPrefilledState: true,
    })
  })

  it('Test 1–3 UI wiring: USFlow uses resolveUSFlowEntryStep for initial state, answeredFields, progress rail, and back-button gating', () => {
    const quickFormSrc = fs.readFileSync(path.join(rootDir, 'src/components/landing/QuickCheckForm.tsx'), 'utf8')
    const usFlowSrc = fs.readFileSync(path.join(rootDir, 'src/app/questions/USFlow.tsx'), 'utf8')

    // Homepage quick form passes st query param when selected
    expect(quickFormSrc).toContain('if (usState) q.push("st=" + encodeURIComponent(usState));')

    // USFlow skips q1, marks usState answered, updates Step 1 rail key, and hides Back button on q2 when prefilled
    expect(usFlowSrc).toContain('resolveUSFlowEntryStep({')
    expect(usFlowSrc).toContain('useState<boolean>(initialEntry.hasPrefilledState)')
    expect(usFlowSrc).toContain('useState<string>(initialEntry.initialStep)')
    expect(usFlowSrc).toContain('initialEntry.hasPrefilledState ? { usState: true } : {}')
    expect(usFlowSrc).toContain('key: hasPrefilledState ? "us-situation-q2" : "us-situation-q1"')
    expect(usFlowSrc).toContain('{!hasPrefilledState && (')
  })

  it('Test 4: Downstream review model, Call B inputs, and final HTML report receive homepage-selected state (New York, not California)', () => {
    const ny = buildJurisdiction('US-NY')!
    const callA = mockCallA(ny, true)
    const answers = {
      usState: 'New York',
      state: 'New York',
      age: 52,
      years: 8,
      salary: 140000,
      offer: 20000,
    }
    const c: CaseRow = {
      id: '44444444-4444-4444-4444-444444444444',
      public_id: 'FX-A7-NY',
      user_id: null,
      token_hashes: ['h'],
      platform: 'web',
      country: 'US',
      jurisdiction_code: ny.code,
      jurisdiction: ny,
      covered: true,
      industry: null,
      answers,
      free_result: null,
      status: 'checking',
      status_detail: null,
      job_started_at: null,
      email: 'ny@example.com',
      consent: null,
      remind: false,
      paid_at: new Date().toISOString(),
      payment_provider: 'mock',
      payment_ref: null,
      contract_status: 'added',
      call_a: callA as any,
      check_state: { rows: { state: { value: 'New York', status: 'confirmed' } }, agreed: true, attested: true },
      call_b: null,
      report_id: null,
      report_json: null,
      report_html: null,
      report_pdf_path: null,
      report_ready_at: null,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const ctx: CP.CheckCtx = {
      country: 'US',
      answers,
      callA,
      contractStatus: 'added',
      check: c.check_state,
    }
    const model = CP.buildModel(ctx)
    const allRows = model.groups.flatMap((g: any) => g.rows)
    const stateRow = allRows.find((r: any) => r.key === 'state')
    expect(stateRow?.value).toBe('New York')

    CP.autoConfirmAll(ctx)
    const { input, jurisdiction } = buildCallBInput(c, ctx)
    expect(jurisdiction.code).toBe('US-NY')
    expect(jurisdiction.name).toBe('New York')
    expect((input.answers as any).state).toBe('New York')

    const callB = mockCallB(input)
    const html = renderReportHtml(callB as any, {
      reportId: 'RPT-A7-NY',
      jurisdiction,
      sources: [],
      rulesAsOf: '2026-11-26',
      attestedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      numbers: reportNumbers(input),
      answers,
      input,
    })
    expect(html).toContain('New York')
  })

  it('Test 5: Canadian free-check flow remains intact and unmodified', () => {
    const caFlowSrc = fs.readFileSync(path.join(rootDir, 'src/app/questions/CanadaFlow.tsx'), 'utf8')
    expect(caFlowSrc).toContain('setCurrentStep("q1")')
    expect(caFlowSrc).not.toContain('resolveUSFlowEntryStep')
  })
})
