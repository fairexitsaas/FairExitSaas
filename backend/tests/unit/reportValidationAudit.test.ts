import { describe, it, expect } from 'vitest'
import { ruleWarnings, allowedAmounts, extractContextualAmounts, ReportJson } from '../../src/fairexit/reportOutput'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import type { CaseRow } from '../../src/fairexit/types'
import { CheckCtx } from '../../src/fairexit/checkPage'

describe('Report Validation Audit (Pre-Push Audit — Items 2 and 3)', () => {
  const baseReport: ReportJson = {
    report_id: 'RPT-TEST-001',
    name_line: 'Jane Doe',
    confirmed_facts: [
      { topic: 'Base salary', confirmed: '$128,000 per year' },
    ],
    at_a_glance: {
      statutory_minimum: '$8,000',
      court_estimate_range: '$45,000 – $65,000',
    },
    checks: [
      {
        topic: 'Statutory minimum',
        status: 'ok',
        statute_says: 'Statutory minimum is $8,000',
        contract_says: null,
        letter_says: null,
      },
      {
        topic: 'Notice period & pay',
        status: 'ok',
        statute_says: null,
        contract_says: 'Contract specifies base salary of $128,000 with 4 weeks notice',
        letter_says: 'Offer letter gives $15,000 lump sum',
      },
    ],
    clauses: [
      {
        clause: 'Release of all claims',
        assessment: 'Standard broad release',
        source_id: 'from_documents',
      },
      {
        clause: 'Non-compete clause',
        assessment: 'Generally unenforceable in California',
        source_id: 'DOC-CONTRACT',
      },
    ],
    questions: [],
    next_steps: [],
    citations_used: ['US-CA-S1', 'from_documents', 'DOC-CONTRACT'],
  }

  const mockInput = {
    confirmed_facts: {
      rows: {
        tenure: { value: 6 },
      },
    },
    minimum: { amount: 8000, weekly_pay: 2000 },
    range: { low: 45000, high: 65000 },
    call_a: {
      facts: [
        { key: 'base_salary', value: '$128,000', document: 'contract' },
        { key: 'offer_amount', value: '$15,000', document: 'letter' },
      ],
    },
    answers: {
      salary: 128000,
    },
  }

  describe('Item 2: Financial amount validation – Contextual Provenance Safety', () => {
    it('allowedAmounts extracts contextual partitions correctly', () => {
      const ctx = extractContextualAmounts(mockInput)
      expect(ctx.calculator).toContain(8000)
      expect(ctx.calculator).toContain(45000)
      expect(ctx.calculator).toContain(65000)
      expect(ctx.contract).toContain(128000)
      expect(ctx.letter).toContain(15000)
      // Provenance safety check: contract salary must NOT be in calculator statutory minimum/range
      expect(ctx.calculator).not.toContain(128000)
      expect(ctx.calculator).not.toContain(15000)
    })

    it('allows contract-stated salary $128,000 in checks[i].contract_says', () => {
      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(baseReport, allowedSourceIds, allowed)

      const contractSalaryWarnings = warnings.filter((w) => w.includes('rule 2:') && w.includes('128,000'))
      expect(contractSalaryWarnings.length).toBe(0)
    })

    it('allows severance letter offer $15,000 in checks[i].letter_says', () => {
      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(baseReport, allowedSourceIds, allowed)

      const letterWarnings = warnings.filter((w) => w.includes('rule 2:') && w.includes('15,000'))
      expect(letterWarnings.length).toBe(0)
    })

    it('NEGATIVE TEST: rejects contract salary $128,000 when hallucinated into checks[0].statute_says', () => {
      const r = JSON.parse(JSON.stringify(baseReport))
      r.checks[0].statute_says = 'Statutory law requires your employer to pay $128,000 immediately'

      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(r, allowedSourceIds, allowed)

      const statutoryHallucination = warnings.filter(
        (w) => w.includes('rule 2:') && w.includes('128,000') && w.includes('checks[0].statute_says')
      )
      expect(statutoryHallucination.length).toBe(1)
    })

    it('NEGATIVE TEST: rejects contract salary $128,000 when hallucinated into at_a_glance.statutory_minimum', () => {
      const r = JSON.parse(JSON.stringify(baseReport))
      r.at_a_glance.statutory_minimum = '$128,000'

      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(r, allowedSourceIds, allowed)

      const glanceHallucination = warnings.filter(
        (w) => w.includes('rule 2:') && w.includes('128,000') && w.includes('statutory_minimum')
      )
      expect(glanceHallucination.length).toBe(1)
    })

    it('NEGATIVE TEST: rejects contract salary $128,000 when misplaced into checks[1].letter_says', () => {
      const r = JSON.parse(JSON.stringify(baseReport))
      r.checks[1].letter_says = 'Severance letter offers $128,000 severance package'

      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(r, allowedSourceIds, allowed)

      const letterHallucination = warnings.filter(
        (w) => w.includes('rule 2:') && w.includes('128,000') && w.includes('checks[1].letter_says')
      )
      expect(letterHallucination.length).toBe(1)
    })

    it('NEGATIVE TEST: rejects severance letter amount $15,000 when used as a statutory legal entitlement', () => {
      const r = JSON.parse(JSON.stringify(baseReport))
      r.checks[0].statute_says = 'Under state statute, minimum severance is $15,000'

      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(r, allowedSourceIds, allowed)

      const statutoryOfferHallucination = warnings.filter(
        (w) => w.includes('rule 2:') && w.includes('15,000') && w.includes('checks[0].statute_says')
      )
      expect(statutoryOfferHallucination.length).toBe(1)
    })

    it('NEGATIVE TEST: rejects completely fabricated number ($999,999) in contract_says', () => {
      const r = JSON.parse(JSON.stringify(baseReport))
      r.checks[1].contract_says = 'Contract guarantees a retention bonus of $999,999'

      const allowed = allowedAmounts(mockInput)
      const allowedSourceIds = ['US-CA-S1', 'from_documents', 'DOC-CONTRACT']
      const warnings = ruleWarnings(r, allowedSourceIds, allowed)

      const fabricatedWarnings = warnings.filter((w) => w.includes('rule 2:') && w.includes('999,999'))
      expect(fabricatedWarnings.length).toBe(1)
    })
  })

  describe('Item 3: Document source IDs verification matrix', () => {
    const makeCase = (hasLetter: boolean, hasContract: boolean): { c: CaseRow; ctx: CheckCtx } => {
      const facts: Array<{ key: string; value: string; document: 'letter' | 'contract' | 'agreement' }> = []
      if (hasLetter) facts.push({ key: 'offer_amount', value: '$15,000', document: 'letter' })
      if (hasContract) facts.push({ key: 'base_salary', value: '$128,000', document: 'contract' })

      const c: CaseRow = {
        id: '22222222-2222-2222-2222-222222222222',
        public_id: 'FX-TEST',
        user_id: null,
        token_hashes: [],
        platform: 'web',
        country: 'US',
        jurisdiction_code: 'US-CA',
        jurisdiction: { name: 'California', code: 'US-CA' } as any,
        covered: true,
        industry: null,
        answers: { usState: 'California', salary: 128000, years: 5 },
        free_result: null,
        status: 'checking',
        status_detail: null,
        job_started_at: null,
        email: null,
        consent: null,
        remind: false,
        paid_at: null,
        payment_provider: null,
        amount_cents: null,
        currency: null,
        contract_status: hasContract ? 'added' : 'never',
        call_a: facts.length > 0 ? { facts, missing: [] } : null,
        call_a_at: null,
        check_state: null,
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
        prompt_version: 'v0.7',
        prompt_sha256: 'sha',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const ctx: CheckCtx = {
        country: 'US',
        province: 'California',
        answers: { usState: 'California' },
        check: { rows: {} },
      } as any

      return { c, ctx }
    }

    it('Scenario 1: No uploaded documents — does NOT include document sources; citing them triggers rule 1', () => {
      const { c, ctx } = makeCase(false, false)
      const { input } = buildCallBInput(c, ctx)
      const sources = input.sources as Array<{ id: string }>
      const sourceIds = sources.map((s) => s.id)

      expect(sourceIds).not.toContain('from_documents')
      expect(sourceIds).not.toContain('DOC-LETTER')
      expect(sourceIds).not.toContain('DOC-CONTRACT')

      // Report citing document sources must be rejected
      const allowed = allowedAmounts(input)
      const warnings = ruleWarnings(baseReport, sourceIds, allowed)

      expect(warnings).toContain('rule 1: source_id from_documents is not in the given sources')
      expect(warnings).toContain('rule 1: source_id DOC-CONTRACT is not in the given sources')
    })

    it('Scenario 2: One uploaded letter — includes from_documents and DOC-LETTER, but NOT DOC-CONTRACT', () => {
      const { c, ctx } = makeCase(true, false)
      const { input } = buildCallBInput(c, ctx)
      const sources = input.sources as Array<{ id: string }>
      const sourceIds = sources.map((s) => s.id)

      expect(sourceIds).toContain('from_documents')
      expect(sourceIds).toContain('DOC-LETTER')
      expect(sourceIds).not.toContain('DOC-CONTRACT')

      const allowed = allowedAmounts(input)
      const warnings = ruleWarnings(baseReport, sourceIds, allowed)

      // from_documents is accepted
      expect(warnings.some((w) => w.includes('from_documents'))).toBe(false)
      // DOC-CONTRACT must be rejected because contract was not uploaded
      expect(warnings).toContain('rule 1: source_id DOC-CONTRACT is not in the given sources')
    })

    it('Scenario 3: One uploaded contract — includes from_documents and DOC-CONTRACT, but NOT DOC-LETTER', () => {
      const { c, ctx } = makeCase(false, true)
      const { input } = buildCallBInput(c, ctx)
      const sources = input.sources as Array<{ id: string }>
      const sourceIds = sources.map((s) => s.id)

      expect(sourceIds).toContain('from_documents')
      expect(sourceIds).toContain('DOC-CONTRACT')
      expect(sourceIds).not.toContain('DOC-LETTER')

      const allowed = allowedAmounts(input)
      const reportWithLetterCite = JSON.parse(JSON.stringify(baseReport))
      reportWithLetterCite.citations_used.push('DOC-LETTER')
      const warnings = ruleWarnings(reportWithLetterCite, sourceIds, allowed)

      // from_documents and DOC-CONTRACT are accepted
      expect(warnings.some((w) => w.includes('from_documents'))).toBe(false)
      expect(warnings.some((w) => w.includes('DOC-CONTRACT'))).toBe(false)
      // DOC-LETTER must be rejected because letter was not uploaded
      expect(warnings).toContain('rule 1: source_id DOC-LETTER is not in the given sources')
    })

    it('Scenario 4: Both uploaded — includes from_documents, DOC-LETTER and DOC-CONTRACT', () => {
      const { c, ctx } = makeCase(true, true)
      const { input } = buildCallBInput(c, ctx)
      const sources = input.sources as Array<{ id: string }>
      const sourceIds = sources.map((s) => s.id)

      expect(sourceIds).toContain('from_documents')
      expect(sourceIds).toContain('DOC-LETTER')
      expect(sourceIds).toContain('DOC-CONTRACT')

      const allowed = allowedAmounts(input)
      const warnings = ruleWarnings(baseReport, sourceIds, allowed)

      const docSourceWarnings = warnings.filter((w) => w.includes('rule 1:'))
      expect(docSourceWarnings.length).toBe(0)
    })

    it('Scenario 5: Fabricated source ID — always rejected regardless of document configuration', () => {
      const { c, ctx } = makeCase(true, true)
      const { input } = buildCallBInput(c, ctx)
      const sources = input.sources as Array<{ id: string }>
      const sourceIds = sources.map((s) => s.id)

      const reportWithFabricatedSource = JSON.parse(JSON.stringify(baseReport))
      reportWithFabricatedSource.clauses[0].source_id = 'FABRICATED-STATUTE-999'
      reportWithFabricatedSource.citations_used.push('FABRICATED-STATUTE-999')

      const allowed = allowedAmounts(input)
      const warnings = ruleWarnings(reportWithFabricatedSource, sourceIds, allowed)

      expect(warnings).toContain('rule 1: source_id FABRICATED-STATUTE-999 is not in the given sources')
    })
  })
})
