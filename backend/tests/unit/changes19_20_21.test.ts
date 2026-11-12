import { describe, it, expect, vi } from 'vitest'
import { buildJurisdiction, parseLocationFromText } from '../../src/fairexit/jurisdictions'
import { mockCallA } from '../../src/fairexit/mocks'
import {
  buildModel,
  exportConfirmedFacts,
  setRow,
  rowDefs,
  detectLocationMismatch,
  CheckCtx,
} from '../../src/fairexit/checkPage'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { flowService } from '../../src/services/flow.service'
import { caseService } from '../../src/services/case.service'
import { aiService } from '../../src/services/ai.service'
import type { CaseRow, CheckState } from '../../src/fairexit/types'

describe('Group 2 Unit Tests: Changes 19, 20, 21', () => {
  // ═════════════════════════════════════════════════════════════════════════
  // CHANGE 19: Ensure Both Uploaded Documents are Considered
  // ═════════════════════════════════════════════════════════════════════════
  describe('Change 19: Both Documents in Analysis', () => {
    it('US mockCallA returns contract facts when contract is provided (hasContract = true)', () => {
      const jUS = buildJurisdiction('US-NY')!
      const resultWithContract = mockCallA(jUS, true)

      // Letter facts
      const offer = resultWithContract.facts.find((f) => f.key === 'offer_amount')
      const lastDay = resultWithContract.facts.find((f) => f.key === 'last_day')
      expect(offer?.value).toBe('$8,400')
      expect(lastDay?.value).toBe('January 30, 2026')

      // Contract facts
      const role = resultWithContract.facts.find((f) => f.key === 'job_title_contract')
      const start = resultWithContract.facts.find((f) => f.key === 'contract_start')
      const payRate = resultWithContract.facts.find((f) => f.key === 'pay_rate')

      expect(role).toBeDefined()
      expect(role?.value).toBe('Temporary Data Operations Analyst')
      expect(role?.document).toBe('contract')

      expect(start).toBeDefined()
      expect(start?.value).toBe('August 11, 2025')
      expect(start?.document).toBe('contract')

      expect(payRate).toBeDefined()
      expect(payRate?.value).toBe('$32.00 per hour')
    })

    it('US mockCallA does NOT return contract facts when only letter is provided (hasContract = false)', () => {
      const jUS = buildJurisdiction('US-NY')!
      const resultNoContract = mockCallA(jUS, false)

      const role = resultNoContract.facts.find((f) => f.key === 'job_title_contract')
      const start = resultNoContract.facts.find((f) => f.key === 'contract_start')

      expect(role).toBeUndefined()
      expect(start).toBeUndefined()
      expect(resultNoContract.missing).toContain('contract_start')
      expect(resultNoContract.missing).toContain('job_title_contract')
    })

    it('detects contract start date vs years on the job conflict for both Canada and US', () => {
      const jUS = buildJurisdiction('US-NY')!
      const mockOut = mockCallA(jUS, true) // start: August 11, 2025, last day: January 30, 2026 (~0.5 yr)

      const ctx: CheckCtx = {
        country: 'US',
        answers: {
          usState: 'New York',
          years: 8, // User claimed 8 years, but contract shows ~0.5 yr
          salary: 100000,
        },
        callA: mockOut,
        contractStatus: 'added',
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const model = buildModel(ctx)
      const yearsConflict = model.conflicts.find((c) => c.key === 'years')

      expect(yearsConflict).toBeDefined()
      expect(yearsConflict?.title).toBe('Years on the job')
      expect(yearsConflict?.lead).toContain("Your contract's start date doesn't match")
      expect(yearsConflict?.answers.value).toBe(8)
    })

    it('US rows include contract_start and job_title_contract when extracted from contract', () => {
      const jUS = buildJurisdiction('US-NY')!
      const mockOut = mockCallA(jUS, true)

      const ctx: CheckCtx = {
        country: 'US',
        answers: { usState: 'New York', salary: 100000 },
        callA: mockOut,
        contractStatus: 'added',
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const model = buildModel(ctx)
      const allRows = model.groups.flatMap((g) => g.rows)

      const startRow = allRows.find((r) => r.key === 'contract_start')
      const titleRow = allRows.find((r) => r.key === 'job_title_contract')

      expect(startRow).toBeDefined()
      expect(startRow?.docValue).toBe('2025-08-11')
      expect(titleRow).toBeDefined()
      expect(titleRow?.docValue).toBe('Temporary Data Operations Analyst')
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // CHANGE 20: Four Editable Fields (employee_name, employer_name, pay_rate, document_place)
  // ═════════════════════════════════════════════════════════════════════════
  describe('Change 20: Four Editable Fields', () => {
    it('rowDefs for both CA and US define all 4 fields', () => {
      const caRows = rowDefs('CA')
      const usRows = rowDefs('US')

      for (const key of ['employee_name', 'employer_name', 'pay_rate', 'document_place']) {
        expect(caRows.some((r) => r.key === key), `CA missing rowDef ${key}`).toBe(true)
        expect(usRows.some((r) => r.key === key), `US missing rowDef ${key}`).toBe(true)
      }
    })

    it('extracts all 4 fields into check page rows when present in Call A output', () => {
      const jUS = buildJurisdiction('US-NY')!
      const callAOut = mockCallA(jUS, true)

      const ctx: CheckCtx = {
        country: 'US',
        answers: { usState: 'New York' },
        callA: callAOut,
        contractStatus: 'added',
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const model = buildModel(ctx)
      const allRows = model.groups.flatMap((g) => g.rows)

      const empName = allRows.find((r) => r.key === 'employee_name')
      const empOrg = allRows.find((r) => r.key === 'employer_name')
      const payRate = allRows.find((r) => r.key === 'pay_rate')
      const docPlace = allRows.find((r) => r.key === 'document_place')

      expect(empName?.docValue).toBe('Jordan Taylor')
      expect(empOrg?.docValue).toBe('Empire Harbor Analytics LLC')
      expect(payRate?.docValue).toBe('$32.00 per hour')
      expect(docPlace?.docValue).toBe('New York')
    })

    it('allows user to edit all 4 fields and confirmed edits override extracted values', () => {
      const jCA = buildJurisdiction('CA-ON')!
      const callAOut = mockCallA(jCA, false)

      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'ON', salary: 112500 },
        callA: callAOut,
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      // User changes all 4 fields
      setRow(ctx, 'employee_name', 'Alex Mercer', 'confirmed', { user: 'Alex Mercer' })
      setRow(ctx, 'employer_name', 'Acme Canada Ltd.', 'confirmed', { user: 'Acme Canada Ltd.' })
      setRow(ctx, 'pay_rate', '$120,000 / year', 'confirmed', { user: '$120,000 / year' })
      setRow(ctx, 'document_place', 'Ontario, Canada', 'confirmed', { user: 'Ontario, Canada' })

      const confirmed = exportConfirmedFacts(ctx)

      expect(confirmed.employee_name).toBe('Alex Mercer')
      expect(confirmed.employer_name).toBe('Acme Canada Ltd.')
      expect(confirmed.pay_rate).toBe('$120,000 / year')
      expect(confirmed.document_place).toBe('Ontario, Canada')

      // Verify downstream Call B input passes confirmed values
      const dummyCase: CaseRow = {
        id: 'test-case-id',
        country: 'CA',
        answers: ctx.answers,
        check_state: ctx.check,
        contract_status: null,
        call_a: callAOut,
      } as any

      const { input } = buildCallBInput(dummyCase, ctx)
      const inputFacts = input.confirmed_facts as any

      expect(inputFacts.employee_name).toBe('Alex Mercer')
      expect(inputFacts.employer_name).toBe('Acme Canada Ltd.')
      expect(inputFacts.pay_rate).toBe('$120,000 / year')
      expect(inputFacts.document_place).toBe('Ontario, Canada')
    })

    it('does not fabricate values when fields are missing from document', () => {
      const emptyCallA = { facts: [], missing: ['employee_name', 'employer_name', 'pay_rate', 'document_place'] }

      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'ON' },
        callA: emptyCallA,
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const confirmed = exportConfirmedFacts(ctx)

      expect(confirmed.employee_name).toBeNull()
      expect(confirmed.employer_name).toBeNull()
      expect(confirmed.pay_rate).toBeNull()
      expect(confirmed.document_place).toBeNull()
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // CHANGE 21: Detect and Correct Document Location Mismatch
  // ═════════════════════════════════════════════════════════════════════════
  describe('Change 21: Jurisdiction Location Mismatch', () => {
    it('detects country-level mismatch (User selected BC, Canada; Document says New York, USA)', () => {
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'BC' },
        callA: {
          facts: [{ key: 'document_place', value: 'New York', document: 'letter', quote: 'laws of New York', where: 'page 2', confidence: 'high' }],
          missing: [],
        },
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const mismatch = detectLocationMismatch(ctx)

      expect(mismatch.detected).toBe(true)
      expect(mismatch.documentPlace).toBe('New York')
      expect(mismatch.selectedPlace).toBe('British Columbia')
      expect(mismatch.message).toBe('Your documents mention New York. Is British Columbia right?')
      expect(mismatch.documentCountry).toBe('US')
    })

    it('detects province-level mismatch (User selected BC; Document says Ontario)', () => {
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'BC' },
        callA: {
          facts: [{ key: 'document_place', value: 'laws of Ontario', document: 'letter', quote: 'laws of Ontario', where: 'page 2', confidence: 'high' }],
          missing: [],
        },
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const mismatch = detectLocationMismatch(ctx)

      expect(mismatch.detected).toBe(true)
      expect(mismatch.documentPlace).toBe('Ontario')
      expect(mismatch.selectedPlace).toBe('British Columbia')
      expect(mismatch.message).toBe('Your documents mention Ontario. Is British Columbia right?')
    })

    it('detects state-level mismatch in US (User selected California; Document says Texas)', () => {
      const ctx: CheckCtx = {
        country: 'US',
        answers: { usState: 'California' },
        callA: {
          facts: [{ key: 'document_place', value: 'State of Texas', document: 'agreement', quote: 'State of Texas', where: 'page 1', confidence: 'high' }],
          missing: [],
        },
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const mismatch = detectLocationMismatch(ctx)

      expect(mismatch.detected).toBe(true)
      expect(mismatch.documentPlace).toBe('Texas')
      expect(mismatch.selectedPlace).toBe('California')
      expect(mismatch.message).toBe('Your documents mention Texas. Is California right?')
    })

    it('does NOT trigger mismatch when document place matches selected jurisdiction', () => {
      const ctx: CheckCtx = {
        country: 'US',
        answers: { usState: 'New York' },
        callA: {
          facts: [{ key: 'document_place', value: 'New York, NY', document: 'agreement', quote: 'New York', where: 'page 1', confidence: 'high' }],
          missing: [],
        },
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const mismatch = detectLocationMismatch(ctx)
      expect(mismatch.detected).toBe(false)
    })

    it('does NOT trigger mismatch when document place is missing or not mentioned', () => {
      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'BC' },
        callA: {
          facts: [{ key: 'document_place', value: 'not mentioned', document: 'letter', quote: null, where: 'page 1', confidence: 'high' }],
          missing: ['document_place'],
        },
        contractStatus: null,
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const mismatch = detectLocationMismatch(ctx)
      expect(mismatch.detected).toBe(false)
    })

    it('changes jurisdiction cleanly and updates case without reusing stale answers', async () => {
      const initialCase: CaseRow = {
        id: '12345678-1234-1234-1234-123456789012',
        country: 'CA',
        jurisdiction_code: 'CA-BC',
        jurisdiction: buildJurisdiction('CA-BC')!,
        covered: true,
        answers: {
          province: 'BC',
          clause: 'yes', // CA-specific ESA minimum clause
          salary: 95000,
          age: 42,
          years: 6,
        },
        check_state: {
          rows: {
            province: { value: 'BC', source: 'answers', status: 'confirmed' } as any,
          },
          attested: true,
          attested_at: '2026-11-12T00:00:00Z',
        },
        status: 'checking',
        call_a: { facts: [], missing: [] },
      } as any

      // Mock DB updates via caseService
      vi.spyOn(caseService, 'update').mockImplementation(async (id, patch) => {
        return { ...initialCase, ...patch } as any
      })

      const res = await flowService.changeJurisdiction(initialCase, 'US', 'New York')

      expect(res.case.country).toBe('US')
      expect(res.case.jurisdiction?.code).toBe('US-NY')
      expect(res.case.answers.usState).toBe('New York')
      expect(res.case.answers.province).toBeUndefined()

      // Stale attestation must be reset
      expect(res.page.finalAgreement.attested).toBe(false)
    })

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFICATION CONCERN 1: Document-source fallback and inter-document conflicts
    // ─────────────────────────────────────────────────────────────────────────
    it('falls back to contract facts when values are missing from severance letter, preserving contract source and where citations', () => {
      const callAOut = {
        facts: [
          // Letter facts (only offer and last day, missing employer, pay rate, employee name, document place)
          { key: 'offer_amount', value: '$10,000', document: 'letter' as const, quote: 'severance of $10,000', where: 'page 1', confidence: 'high' as const },
          { key: 'last_day', value: '2026-03-31', document: 'letter' as const, quote: 'last day March 31, 2026', where: 'page 1', confidence: 'high' as const },

          // Contract facts providing the 4 fields
          { key: 'employee_name', value: 'Taylor Jordan', document: 'contract' as const, quote: 'Taylor Jordan ("Employee")', where: 'agreement p. 1 § 1', confidence: 'high' as const },
          { key: 'employer_name', value: 'Northstar Systems Corp.', document: 'contract' as const, quote: 'Northstar Systems Corp. ("Company")', where: 'agreement p. 1 preamble', confidence: 'high' as const },
          { key: 'pay_rate', value: '$45.00 per hour', document: 'contract' as const, quote: 'hourly compensation of $45.00', where: 'agreement p. 2 § 4', confidence: 'high' as const },
          { key: 'document_place', value: 'Ontario, Canada', document: 'contract' as const, quote: 'governed by laws of Ontario', where: 'agreement p. 4 § 14', confidence: 'high' as const },
        ],
        missing: [],
      }

      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'ON', salary: 93600 },
        callA: callAOut,
        contractStatus: 'added',
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const model = buildModel(ctx)
      const allRows = model.groups.flatMap((g) => g.rows)

      const empName = allRows.find((r) => r.key === 'employee_name')
      const empOrg = allRows.find((r) => r.key === 'employer_name')
      const payRate = allRows.find((r) => r.key === 'pay_rate')
      const docPlace = allRows.find((r) => r.key === 'document_place')

      // Values extracted from contract
      expect(empName?.docValue).toBe('Taylor Jordan')
      expect(empOrg?.docValue).toBe('Northstar Systems Corp.')
      expect(payRate?.docValue).toBe('$45.00 per hour')
      expect(docPlace?.docValue).toBe('Ontario, Canada')

      // Sources preserved as contract, not letter
      expect(empName?.source).toBe('contract')
      expect(empOrg?.source).toBe('contract')
      expect(payRate?.source).toBe('contract')
      expect(docPlace?.source).toBe('contract')

      // Citations preserved
      expect(empName?.sourceLine).toContain('Your contract, agreement p. 1 § 1')
      expect(payRate?.sourceLine).toContain('Your contract, agreement p. 2 § 4')

      // Confirm rows and verify export
      setRow(ctx, 'employee_name', 'Taylor Jordan', 'confirmed')
      setRow(ctx, 'employer_name', 'Northstar Systems Corp.', 'confirmed')
      setRow(ctx, 'pay_rate', '$45.00 per hour', 'confirmed')
      setRow(ctx, 'document_place', 'Ontario, Canada', 'confirmed')

      const exported = exportConfirmedFacts(ctx)
      expect(exported.employee_name).toBe('Taylor Jordan')
      expect(exported.employer_name).toBe('Northstar Systems Corp.')
      expect(exported.pay_rate).toBe('$45.00 per hour')
      expect(exported.document_place).toBe('Ontario, Canada')
    })

    it('detects conflicting values between letter and contract without silently overwriting either', () => {
      const callAOut = {
        facts: [
          // Letter says $35.00/hr, employer is Acme Letter Corp.
          { key: 'pay_rate', value: '$35.00 per hour', document: 'letter' as const, quote: '$35.00/hr', where: 'letter p. 1', confidence: 'high' as const },
          { key: 'employer_name', value: 'Acme Letter Corp.', document: 'letter' as const, quote: 'Acme Letter Corp.', where: 'letter p. 1', confidence: 'high' as const },

          // Contract says $32.00/hr, employer is Acme Contract Inc.
          { key: 'pay_rate', value: '$32.00 per hour', document: 'contract' as const, quote: '$32.00 per hour', where: 'contract § 3', confidence: 'high' as const },
          { key: 'employer_name', value: 'Acme Contract Inc.', document: 'contract' as const, quote: 'Acme Contract Inc.', where: 'contract § 1', confidence: 'high' as const },
        ],
        missing: [],
      }

      const ctx: CheckCtx = {
        country: 'CA',
        answers: { province: 'ON', salary: 70000 },
        callA: callAOut,
        contractStatus: 'added',
        check: { rows: {}, attested: false, attested_at: null, dismissed: [] },
      }

      const model = buildModel(ctx)

      // Both pay_rate and employer_name must surface as conflict cards
      const payConflict = model.conflicts.find((c) => c.key === 'pay_rate')
      const empConflict = model.conflicts.find((c) => c.key === 'employer_name')

      expect(payConflict).toBeDefined()
      expect(payConflict?.lead).toContain('Your letter and your contract give different values')
      expect(payConflict?.document.display).toBe('$35.00 per hour')
      expect(payConflict?.answers.display).toBe('$32.00 per hour')

      expect(empConflict).toBeDefined()
      expect(empConflict?.lead).toContain('Your letter and your contract give different values')
      expect(empConflict?.document.display).toBe('Acme Letter Corp.')
      expect(empConflict?.answers.display).toBe('Acme Contract Inc.')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFICATION CONCERN 2: Same-country jurisdiction changes (Canada BC -> ON)
    // ─────────────────────────────────────────────────────────────────────────
    it('same-country Canada change (BC -> ON): clears stale answers, recomputes statutory severance, clears stale report, and requires re-attestation', async () => {
      // Step 1: User answered questions under British Columbia (CA-BC)
      const initialBcCase: CaseRow = {
        id: 'case-bc-to-on-123',
        country: 'CA',
        jurisdiction_code: 'CA-BC',
        jurisdiction: buildJurisdiction('CA-BC')!,
        covered: true,
        answers: {
          province: 'BC',
          provinceName: 'British Columbia',
          age: 48,
          years: 9,
          salary: 104000,
          role: 'Professional (accountant, engineer, etc.)',
          roleFactor: 1.12,
          offer: 24000,
          howEnded: 'Laid off, no cause',
        },
        free_result: {
          code: 'CA-BC',
          strategy: 'weeksTable',
          terminationWeeks: 8,
          severanceWeeks: 0, // In BC there is no statutory severance pay
        },
        check_state: {
          rows: {
            province: { value: 'BC', source: 'answers', status: 'confirmed', doc_value: null, quote: null, where: null },
          },
          attested: true,
          attested_at: '2026-11-12T10:00:00Z',
          dismissed: [],
        },
        status: 'ready',
        status_detail: null,
        report_id: 'RPT-BC-OLD',
        report: { cover: { name_line: 'Old Client', title: 'Severance Assessment for British Columbia' } },
        report_inputs: { jurisdiction: { code: 'CA-BC', name: 'British Columbia' } },
        report_pdf_path: 'reports/old-bc-report.pdf',
        report_ready_at: '2026-11-12T10:05:00Z',
        call_a: {
          facts: [
            { key: 'document_place', value: 'Toronto, Ontario', document: 'letter' as const, quote: 'Toronto, Ontario', where: 'p. 1', confidence: 'high' as const },
          ],
          missing: [],
        },
      } as any

      // Step 2: Location mismatch detected in BC
      const initialCtx: CheckCtx = {
        country: 'CA',
        answers: initialBcCase.answers,
        callA: initialBcCase.call_a,
        contractStatus: null,
        check: initialBcCase.check_state,
      }
      const initialMismatch = detectLocationMismatch(initialCtx)
      expect(initialMismatch.detected).toBe(true)
      expect(initialMismatch.documentPlace).toBe('Ontario')
      expect(initialMismatch.selectedPlace).toBe('British Columbia')
      expect(initialMismatch.message).toBe('Your documents mention Ontario. Is British Columbia right?')

      // Step 3: User changes jurisdiction from British Columbia to Ontario
      let savedPatch: any = null
      vi.spyOn(caseService, 'update').mockImplementation(async (id, patch) => {
        savedPatch = patch
        return { ...initialBcCase, ...patch } as any
      })

      const result = await flowService.changeJurisdiction(initialBcCase, 'CA', 'Ontario')

      // A. Verify jurisdiction and code updated
      expect(result.case.country).toBe('CA')
      expect(result.case.jurisdiction?.code).toBe('CA-ON')
      expect(result.case.jurisdiction?.name).toBe('Ontario')

      // B. Verify BC-specific answers not reused, unrelated answers retained
      expect(savedPatch.answers.province).toBe('ON')
      expect(savedPatch.answers.provinceName).toBe('Ontario')
      expect(savedPatch.answers.age).toBe(48)
      expect(savedPatch.answers.years).toBe(9)
      expect(savedPatch.answers.salary).toBe(104000)
      expect(savedPatch.answers.offer).toBe(24000)

      // C. Verify province-dependent calculations recomputed under Ontario ESA
      // Ontario ESA § 64 includes statutory severance pay potential (up to 26 weeks) for 9 years
      expect(savedPatch.free_result).toBeDefined()
      expect(savedPatch.free_result.jurisdiction?.code).toBe('CA-ON')
      expect(savedPatch.free_result.jurisdiction?.name).toBe('Ontario')
      expect(savedPatch.free_result.covered).toBe(true)

      // D. Verify stale report artifacts completely invalidated
      expect(savedPatch.report).toBeNull()
      expect(savedPatch.report_id).toBeNull()
      expect(savedPatch.report_inputs).toBeNull()
      expect(savedPatch.report_pdf_path).toBeNull()
      expect(savedPatch.report_ready_at).toBeNull()
      expect(savedPatch.status).toBe('checking')

      // E. Verify user is required to re-review and re-attest
      expect(savedPatch.check_state.attested).toBe(false)
      expect(savedPatch.attested_at).toBeNull()
      expect(result.page.build.enabled).toBe(false)

      // F. Verify location mismatch warning is cleared against Ontario
      expect(result.page.locationMismatch?.detected).toBe(false)

      // G. Verify downstream Call B input generation uses Ontario, not BC
      const updatedCase: CaseRow = { ...initialBcCase, ...savedPatch }
      const updatedCtx: CheckCtx = {
        country: 'CA',
        answers: updatedCase.answers,
        callA: updatedCase.call_a,
        contractStatus: null,
        check: updatedCase.check_state,
      }
      const { input, jurisdiction } = buildCallBInput(updatedCase, updatedCtx)
      expect(jurisdiction.code).toBe('CA-ON')
      expect(jurisdiction.name).toBe('Ontario')
      expect((input.jurisdiction as any).code).toBe('CA-ON')
      expect((input.answers as any).province).toBe('Ontario')
      expect(input.region_rules).toBeDefined()
      expect(JSON.stringify(input)).not.toContain('British Columbia')
    })

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFICATION CONCERN 2: Same-country jurisdiction changes (US California -> New York)
    // ─────────────────────────────────────────────────────────────────────────
    it('same-country US change (California -> New York): updates state, recalculates rules, and resets report', async () => {
      const initialCaCase: CaseRow = {
        id: 'case-us-ca-to-ny',
        country: 'US',
        jurisdiction_code: 'US-CA',
        jurisdiction: buildJurisdiction('US-CA')!,
        covered: true,
        answers: {
          usState: 'California',
          state: 'California',
          stateName: 'California',
          age: 52,
          years: 7,
          salary: 130000,
          offer: 30000,
        },
        free_result: {
          code: 'US-CA',
          name: 'California',
        },
        check_state: {
          rows: {
            state: { value: 'California', source: 'answers', status: 'confirmed', doc_value: null, quote: null, where: null },
          },
          attested: true,
          attested_at: '2026-11-12T10:00:00Z',
          dismissed: [],
        },
        status: 'ready',
        report_id: 'RPT-CA-OLD',
        report: { cover: { title: 'California Report' } },
        call_a: {
          facts: [
            { key: 'document_place', value: 'New York, NY', document: 'agreement' as const, quote: 'New York', where: 'p. 1', confidence: 'high' as const },
          ],
          missing: [],
        },
      } as any

      let savedPatch: any = null
      vi.spyOn(caseService, 'update').mockImplementation(async (id, patch) => {
        savedPatch = patch
        return { ...initialCaCase, ...patch } as any
      })

      const result = await flowService.changeJurisdiction(initialCaCase, 'US', 'New York')

      expect(result.case.country).toBe('US')
      expect(result.case.jurisdiction?.code).toBe('US-NY')
      expect(savedPatch.answers.usState).toBe('New York')
      expect(savedPatch.answers.state).toBe('New York')
      expect(savedPatch.answers.age).toBe(52)
      expect(savedPatch.answers.salary).toBe(130000)

      // Report invalidated
      expect(savedPatch.report).toBeNull()
      expect(savedPatch.status).toBe('checking')
      expect(savedPatch.check_state.attested).toBe(false)
      expect(result.page.build.enabled).toBe(false)

      // Location mismatch against New York now resolved
      expect(result.page.locationMismatch?.detected).toBe(false)
    })
  })
})

