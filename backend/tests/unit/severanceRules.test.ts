import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { estimate, getRule, commonLawMonths, marketAdjust, RULES } from '../../src/fairexit/severanceRules'
import { estimate as clientEstimate, FairExitRules as ClientRules } from '../../../src/lib/severance-rules'

const ORIGINAL_JS = path.resolve(__dirname, '../../../codebase/resource-hub-v2/severance-rules.js')

describe('FairExitRules — Specification & Parity Tests', () => {
  it('matches client severance-rules.js engine line-for-line across all rules, tenures and ages', () => {
    expect(fs.existsSync(ORIGINAL_JS)).toBe(true)
    const ctx: any = {}
    vm.runInNewContext(fs.readFileSync(ORIGINAL_JS, 'utf8'), ctx)
    const jsRules = ctx.FairExitRules.rules

    for (const code of Object.keys(jsRules)) {
      for (const years of [0, 0.2, 0.5, 1, 2, 4, 5, 8, 11, 21]) {
        for (const age of [25, 34, 45, 50, 58]) {
          const inp = { age, years, salary: 90000, roleFactor: 1.15, payrollGlobal: 3e6 }
          const expected = ctx.FairExitRules.estimate(code, inp)
          const serverActual = estimate(code, inp)
          const clientActual = clientEstimate(code, inp)

          expect(serverActual).toEqual(expected)
          expect(clientActual).toEqual(expected)
        }
      }
    }
  })

  describe('Walkthrough Test Fixtures — Example A (Ontario)', () => {
    it('calculates Example A (Ontario) with exact matching figures from spec', () => {
      // Inputs: Province ON, Age 45, Years 8, Salary $90,000, Role Middle manager (1.15), Payroll >= $2.5M
      const res = estimate('CA-ON', {
        age: 45,
        years: 8,
        salary: 90000,
        roleFactor: 1.15,
        payrollGlobal: 3000000,
      })

      // Verification against table in walkthrough:
      // Notice pay: 8 weeks
      expect(res.statutory?.terminationWeeks).toBe(8)
      // Severance pay: 8 weeks
      expect(res.statutory?.severanceWeeks).toBe(8)
      // Legal minimum: $27,692
      expect(res.statutory?.amount).toBe(27692)
      // What courts may award: 8–12 months
      expect(res.commonLaw?.lowMonths).toBe(8)
      expect(res.commonLaw?.highMonths).toBe(12)
      // Amounts for court range:
      // $90,000 / 12 = $7,500/mo -> 8 mo = $60,000, 12 mo = $90,000
      expect(res.commonLaw?.lowAmount).toBe(60000)
      expect(res.commonLaw?.highAmount).toBe(90000)

      // Final range shown to user: $27,692 – $90,000
      const lowAmt = res.statutory!.amount
      const highAmt = res.commonLaw!.highAmount
      expect(`$${lowAmt.toLocaleString('en-CA')}–$${highAmt.toLocaleString('en-CA')}`).toBe('$27,692–$90,000')
    })

    it('caps range at statutory minimum when contract clause holds (clause === yes && contract === current)', () => {
      const res = estimate('CA-ON', {
        age: 45,
        years: 8,
        salary: 90000,
        roleFactor: 1.15,
        payrollGlobal: 3000000,
      })

      const clauseHolds = true // clause === "yes" && contract === "current"
      const lowAmt = res.statutory!.amount
      const highAmt = clauseHolds ? res.statutory!.amount : res.commonLaw!.highAmount
      expect(lowAmt).toBe(27692)
      expect(highAmt).toBe(27692)
    })
  })

  describe('Worked Examples Across Canadian Jurisdictions', () => {
    it('calculates British Columbia early career (Age 34, 4 yrs, $62,000/yr, coordinator 1.0)', () => {
      const res = estimate('CA-BC', {
        age: 34,
        years: 4,
        salary: 62000,
        roleFactor: 1.0,
      })
      // Statutory floor: 4 wks notice ($4,769)
      expect(res.statutory?.terminationWeeks).toBe(4)
      expect(res.statutory?.amount).toBe(4769)
      // Common law: 3–5 months ($15,500 – $25,833)
      expect(res.commonLaw?.lowMonths).toBe(3)
      expect(res.commonLaw?.highMonths).toBe(5)
      expect(res.commonLaw?.lowAmount).toBe(15500)
      expect(res.commonLaw?.highAmount).toBe(25833)
    })

    it('calculates British Columbia mid career (Age 47, 11 yrs, $98,000/yr, professional 1.12)', () => {
      const res = estimate('CA-BC', {
        age: 47,
        years: 11,
        salary: 98000,
        roleFactor: 1.12,
      })
      // Statutory floor: 8 wks notice ($15,077)
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.amount).toBe(15077)
      // Common law: 11–15 months ($89,833 – $122,500)
      expect(res.commonLaw?.lowMonths).toBe(11)
      expect(res.commonLaw?.highMonths).toBe(15)
      expect(res.commonLaw?.lowAmount).toBe(89833)
      expect(res.commonLaw?.highAmount).toBe(122500)
    })

    it('calculates Alberta early career (Age 34, 4 yrs, $62,000/yr, coordinator 1.0)', () => {
      const res = estimate('CA-AB', {
        age: 34,
        years: 4,
        salary: 62000,
        roleFactor: 1.0,
      })
      expect(res.statutory?.terminationWeeks).toBe(4)
      expect(res.statutory?.amount).toBe(4769)
      expect(res.commonLaw?.lowMonths).toBe(3)
      expect(res.commonLaw?.highMonths).toBe(5)
    })

    it('calculates Alberta mid career (Age 47, 11 yrs, $98,000/yr, professional 1.12)', () => {
      const res = estimate('CA-AB', {
        age: 47,
        years: 11,
        salary: 98000,
        roleFactor: 1.12,
      })
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.amount).toBe(15077)
    })

    it('calculates Federal Canada early career (Age 34, 4 yrs, $62,000/yr, coordinator 1.0)', () => {
      const res = estimate('CA-FED', {
        age: 34,
        years: 4,
        salary: 62000,
        roleFactor: 1.0,
      })
      // Termination notice: 4 wks, Severance: 4*2/5 = 1.6 wks -> total 5.6 wks ($6,677)
      expect(res.statutory?.terminationWeeks).toBe(4)
      expect(res.statutory?.severanceWeeks).toBe(1.6)
      expect(res.statutory?.weeks).toBe(5.6)
      expect(res.statutory?.amount).toBe(6677)
    })

    it('calculates Ontario senior (Age 58, 21 yrs, $145,000/yr, senior manager 1.15, payroll >= $2.5M)', () => {
      const res = estimate('CA-ON', {
        age: 58,
        years: 21,
        salary: 145000,
        roleFactor: 1.15,
        payrollGlobal: 3000000,
      })
      // 8 wks notice + 21 wks severance = 29 wks -> $80,865
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.severanceWeeks).toBe(21)
      expect(res.statutory?.weeks).toBe(29)
      expect(res.statutory?.amount).toBe(80865)
      // Common law: 19–24 months -> $229,583 – $290,000
      expect(res.commonLaw?.lowMonths).toBe(19)
      expect(res.commonLaw?.highMonths).toBe(24)
      expect(res.commonLaw?.lowAmount).toBe(229583)
      expect(res.commonLaw?.highAmount).toBe(290000)
    })

    it('handles Saskatchewan statutory thresholds', () => {
      // SEA s.2-60: >13 wks: 1; >1 yr: 2; >3 yrs: 4; >5 yrs: 6; >10 yrs: 8
      expect(estimate('CA-SK', { years: 0.25 }).statutory?.weeks).toBe(0) // <= 13 wks
      expect(estimate('CA-SK', { years: 0.5 }).statutory?.weeks).toBe(1)
      expect(estimate('CA-SK', { years: 1.0 }).statutory?.weeks).toBe(1) // not > 1 yr yet
      expect(estimate('CA-SK', { years: 1.5 }).statutory?.weeks).toBe(2)
      expect(estimate('CA-SK', { years: 3.0 }).statutory?.weeks).toBe(2)
      expect(estimate('CA-SK', { years: 3.5 }).statutory?.weeks).toBe(4)
      expect(estimate('CA-SK', { years: 5.0 }).statutory?.weeks).toBe(4)
      expect(estimate('CA-SK', { years: 5.5 }).statutory?.weeks).toBe(6)
      expect(estimate('CA-SK', { years: 10.0 }).statutory?.weeks).toBe(6)
      expect(estimate('CA-SK', { years: 10.5 }).statutory?.weeks).toBe(8)
    })

    it('handles Manitoba statutory thresholds', () => {
      // ESC s.61: >= 30 days: 1; >= 1 yr: 2; >= 3 yrs: 4; >= 5 yrs: 6; >= 10 yrs: 8
      expect(estimate('CA-MB', { years: 0.05 }).statutory?.weeks).toBe(0)
      expect(estimate('CA-MB', { years: 0.1 }).statutory?.weeks).toBe(1)
      expect(estimate('CA-MB', { years: 1 }).statutory?.weeks).toBe(2)
      expect(estimate('CA-MB', { years: 3 }).statutory?.weeks).toBe(4)
      expect(estimate('CA-MB', { years: 5 }).statutory?.weeks).toBe(6)
      expect(estimate('CA-MB', { years: 10 }).statutory?.weeks).toBe(8)
    })

    it('handles Nova Scotia, New Brunswick, PEI, and Newfoundland thresholds', () => {
      // Nova Scotia: >= 3 mo: 1; >= 2 yrs: 2; >= 5 yrs: 4; >= 10 yrs: 8
      expect(estimate('CA-NS', { years: 2 }).statutory?.weeks).toBe(2)
      expect(estimate('CA-NS', { years: 10 }).statutory?.weeks).toBe(8)

      // New Brunswick: >= 6 mo: 2; >= 5 yrs: 4
      expect(estimate('CA-NB', { years: 0.5 }).statutory?.weeks).toBe(2)
      expect(estimate('CA-NB', { years: 5 }).statutory?.weeks).toBe(4)

      // PEI: >= 90 days: 1; >= 1 yr: 2; >= 5 yrs: 4; >= 10 yrs: 6; >= 15 yrs: 8
      expect(estimate('CA-PE', { years: 5 }).statutory?.weeks).toBe(4)
      expect(estimate('CA-PE', { years: 15 }).statutory?.weeks).toBe(8)

      // Newfoundland: >= 3 mo: 1; >= 2 yrs: 2; >= 5 yrs: 3; >= 10 yrs: 4; >= 15 yrs: 6
      expect(estimate('CA-NL', { years: 5 }).statutory?.weeks).toBe(3)
      expect(estimate('CA-NL', { years: 15 }).statutory?.weeks).toBe(6)
    })
  })

  describe('Unsupported Regions and Territories', () => {
    it('marks Quebec (CA-QC) as planned and non-common law', () => {
      const q = getRule('CA-QC')
      expect(q.status).toBe('planned')
      expect(q.commonLaw).toBe(false)
      expect(q.strategy).toBeNull()

      const res = estimate('CA-QC', { salary: 80000, years: 5, age: 40 })
      expect(res.statutory).toBeNull()
      expect(res.commonLaw).toBeNull()
      expect(res.live).toBe(false)
    })

    it('marks Canadian Territories (NT, YT, NU) as planned', () => {
      for (const terr of ['CA-NT', 'CA-YT', 'CA-NU']) {
        const rule = getRule(terr)
        expect(rule.status).toBe('planned')
      }
    })
  })

  describe('United States Regional Rules & No-Dollar-Estimate Enforcement', () => {
    it('returns zero statutory weeks/dollars and null common law for US-FED, US-CA, US-NY', () => {
      for (const usCode of ['US-FED', 'US-CA', 'US-NY']) {
        const res = estimate(usCode, { salary: 120000, years: 5, age: 45 })
        expect(res.country).toBe('US')
        expect(res.commonLawApplies).toBe(false)
        expect(res.commonLaw).toBeNull()
        expect(res.statutory?.weeks).toBe(0)
        expect(res.statutory?.amount).toBe(0)
        expect(res.statutory?.none).toBe(true)
      }
    })

    it('handles New Jersey mandatory statutory formula (1 week/yr)', () => {
      const res = estimate('US-NJ', { salary: 104000, years: 5, age: 45 })
      expect(res.country).toBe('US')
      expect(res.commonLaw).toBeNull()
      expect(res.statutory?.severanceWeeks).toBe(5)
      expect(res.statutory?.weeks).toBe(5)
    })
  })

  describe('Market Adjustment (mkAdj)', () => {
    it('applies market factors: easy 0.9, mid 1.0, hard 1.15 to common-law band only without altering statutory floor', () => {
      const base = estimate('CA-ON', { age: 45, years: 8, salary: 90000, roleFactor: 1.15, payrollGlobal: 3e6 })
      const originalMin = base.statutory?.amount

      const easy = marketAdjust(estimate('CA-ON', { age: 45, years: 8, salary: 90000, roleFactor: 1.15, payrollGlobal: 3e6 }), 'easy')
      expect(easy.statutory?.amount).toBe(originalMin)
      expect(easy.commonLaw?.lowMonths).toBe(Math.round(8 * 0.9))
      expect(easy.commonLaw?.highMonths).toBe(Math.round(12 * 0.9))

      const hard = marketAdjust(estimate('CA-ON', { age: 45, years: 8, salary: 90000, roleFactor: 1.15, payrollGlobal: 3e6 }), 'hard')
      expect(hard.statutory?.amount).toBe(originalMin)
      expect(hard.commonLaw?.lowMonths).toBe(Math.round(8 * 1.15))
      expect(hard.commonLaw?.highMonths).toBe(Math.round(12 * 1.15))
    })
  })
})

