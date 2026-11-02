import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { estimate } from '../../src/fairexit/severanceRules'
import { buildJurisdiction, normalizeCode, isCovered } from '../../src/fairexit/jurisdictions'
import * as CP from '../../src/fairexit/checkPage'
import { mockCallA, mockCallB } from '../../src/fairexit/mocks'
import { buildCallBInput } from '../../src/fairexit/reportInputs'
import { validateShape } from '../../src/fairexit/reportOutput'
import { parseDate, parseMoney, parseDays } from '../../src/fairexit/values'
import { systemPromptCallA, promptSha256 } from '../../src/fairexit/prompts'

const ORIGINAL = path.resolve(__dirname, '../../../FairExit-Phase1-Code-2026-10-25/resource-hub-v2/severance-rules.js')

describe('rules engine port', () => {
  it.skipIf(!fs.existsSync(ORIGINAL))('matches the client severance-rules.js exactly', () => {
    const ctx: any = {}
    vm.runInNewContext(fs.readFileSync(ORIGINAL, 'utf8'), ctx)
    for (const code of Object.keys(ctx.FairExitRules.rules)) {
      for (const years of [0, 0.3, 1, 3, 5, 8, 12, 20]) {
        for (const age of [30, 47, 52, 58]) {
          const inp = { age, years, salary: 78000, roleFactor: 1.15, payrollGlobal: 3e6 }
          expect(estimate(code, inp)).toEqual(ctx.FairExitRules.estimate(code, inp))
        }
      }
    }
  })
})

describe('jurisdictions', () => {
  it('covers 9 provinces + federal and 50 states only', () => {
    expect(isCovered('CA-QC')).toBe(false)
    expect(isCovered('CA-FED')).toBe(true)
    expect(buildJurisdiction('US-GA')!.regime).toBe('us_federal_only')
    expect(buildJurisdiction('US-OH')!.regime).toBe('us_state_page')
    expect(buildJurisdiction('CA-ON')!.has_statutory_severance).toBe(true)
    expect(buildJurisdiction('CA-NB')!.has_statutory_severance).toBe(false)
    expect(normalizeCode('Georgia', 'US')).toBe('US-GA')
  })
})

describe('value parsing', () => {
  it('reads document wording', () => {
    expect(parseMoney('a lump sum of $24,000, less deductions')).toBe(24000)
    expect(parseDate('effective October 31, 2026')).toBe('2026-10-31')
    expect(parseDays('fourteen (14) days')).toBe(14)
  })
})

describe('check page + Call B input (Ontario sample)', () => {
  const j = buildJurisdiction('CA-ON')!
  const answers: any = { province: 'ON', age: 50, years: 13, salary: 78000, roleFactor: 1.15, payroll: 'yes', offer: 24000, clause: 'yes', reason: 'layoff', market: 'mid', pay: {} }
  const c: any = { id: 't', country: 'CA', answers, call_a: mockCallA(j, true), contract_status: 'added', jurisdiction: j, jurisdiction_code: 'CA-ON', check_state: { rows: {}, attested: false, attested_at: null } }
  const ctx: CP.CheckCtx = { country: 'CA', answers, callA: c.call_a, contractStatus: 'added', check: c.check_state }

  it('derives sign_by from "14 days from your last day"', () => {
    const m = CP.buildModel(ctx)
    const row = m.groups.flatMap((g) => g.rows).find((r) => r.key === 'sign_by')!
    expect(row.value).toBe('2026-11-14')
    expect(m.missing.map((x) => x.key)).toContain('working_notice_weeks')
  })

  it('locks build until every required row is confirmed and attested', () => {
    let m = CP.buildModel(ctx)
    expect(m.build.enabled).toBe(false)
    for (const r of m.groups.flatMap((g) => g.rows)) if (r.required) CP.setRow(ctx, r.key, r.value ?? 2, 'confirmed')
    m = CP.buildModel(ctx)
    expect(m.build.allRequiredConfirmed).toBe(true)
    ctx.check.attested = true
    ctx.check.attested_at = '2026-10-31T10:00:00Z'
    expect(CP.buildModel(ctx).build.enabled).toBe(true)
  })

  it('applies rule 15 (notice already worked) to the minimum', () => {
    const { input } = buildCallBInput(c, ctx)
    const min = input.minimum as any
    expect(min.terminationWeeks).toBe(6)
    expect(min.arithmetic).toContain('8 weeks − 2 weeks you worked = 6 weeks')
    expect((input.confirmed_facts as any).attested).toBe(true)
    expect(validateShape(mockCallB(input)).ok).toBe(true)
  })
})

describe('prompt file', () => {
  it('is used unchanged (v0.6)', () => {
    expect(promptSha256()).toBe('e914ac5878fa8ad1a26d1ca4058edad0aa1cb9d1c70a0bd5cf483849311b7724')
    expect(systemPromptCallA(buildJurisdiction('US-CA')!)).toContain("person's separation agreement")
  })
})
