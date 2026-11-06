import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { estimate, getRule, commonLawMonths, marketAdjust, RULES } from '../../src/fairexit/severanceRules'
import { estimate as clientEstimate, FairExitRules as ClientRules } from '../../../src/lib/severance-rules'
import { computeFreeResult } from '../../src/fairexit/freeCheck'

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

    it('enforces 24-month cap after market factor application (Test Case D)', () => {
      const res = marketAdjust(estimate('CA-AB', {
        age: 56,
        years: 15,
        salary: 120000,
        roleFactor: 1.25,
      }), 'hard')

      expect(res.weekly).toBeCloseTo(120000 / 52, 2)
      expect(res.monthly).toBe(10000)
      expect(res.statutory?.amount).toBe(18462)
      expect(res.commonLaw?.lowMonths).toBe(21)
      expect(res.commonLaw?.highMonths).toBe(24)
      expect(res.commonLaw?.highAmount).toBe(240000)
      expect(res.commonLaw?.highAmount).toBeLessThanOrEqual(24 * 10000)
      const range = `$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`
      expect(range).toBe('$18,462–$240,000')
    })
  })

  describe('Spec v0.4.0 Worked Examples A through H', () => {
    it('calculates Example A (Ontario): $27,692–$90,000', () => {
      const res = marketAdjust(estimate('CA-ON', {
        age: 45, years: 8, salary: 90000, roleFactor: 1.15, payrollGlobal: 3000000
      }), 'mid')
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.severanceWeeks).toBe(8)
      expect(res.statutory?.amount).toBe(27692)
      expect(res.commonLaw?.lowMonths).toBe(8)
      expect(res.commonLaw?.highMonths).toBe(12)
      expect(res.commonLaw?.highAmount).toBe(90000)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$27,692–$90,000')
    })

    it('calculates Example B (Ontario Payroll Unknown): $8,077–$40,833', () => {
      const res = marketAdjust(estimate('CA-ON', {
        age: 38, years: 6, salary: 70000, roleFactor: 1.0, payrollUnknown: true
      }), 'mid')
      expect(res.statutory?.terminationWeeks).toBe(6)
      expect(res.statutory?.severanceWeeks).toBe(0)
      expect(res.statutory?.amount).toBe(8077)
      expect(res.statutory?.potentialSeveranceWeeks).toBe(6)
      expect(res.statutory?.potentialSeveranceAmount).toBe(8077)
      expect(res.statutory?.potentialSeveranceMessage).toBe('may apply, up to 6 wks ($8,077)')
      expect(res.commonLaw?.lowMonths).toBe(5)
      expect(res.commonLaw?.highMonths).toBe(7)
      expect(res.commonLaw?.highAmount).toBe(40833)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$8,077–$40,833')
    })

    it('calculates Example C (British Columbia): $3,462–$13,500', () => {
      const res = marketAdjust(estimate('CA-BC', {
        age: 30, years: 3, salary: 60000, roleFactor: 1.0
      }), 'easy')
      expect(res.statutory?.terminationWeeks).toBe(3)
      expect(res.statutory?.amount).toBe(3462)
      expect(res.commonLaw?.lowMonths).toBe(2)
      expect(res.commonLaw?.highMonths).toBe(3)
      expect(res.commonLaw?.highAmount).toBe(13500)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$3,462–$13,500')
    })

    it('calculates Example D (Alberta): $18,462–$240,000 with 24-month cap', () => {
      const res = marketAdjust(estimate('CA-AB', {
        age: 56, years: 15, salary: 120000, roleFactor: 1.25
      }), 'hard')
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.amount).toBe(18462)
      expect(res.commonLaw?.lowMonths).toBe(21)
      expect(res.commonLaw?.highMonths).toBe(24)
      expect(res.commonLaw?.highAmount).toBe(240000)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$18,462–$240,000')
    })

    it('calculates Example E (Nova Scotia Group Layoff): $12,692–$22,917', () => {
      const res = marketAdjust(estimate('CA-NS', {
        age: 40, years: 4, salary: 55000, roleFactor: 1.08, groupLayoff: true, groupSize: 100, workforceQuarter: 'yes'
      }), 'mid')
      expect(res.statutory?.individualNoticeWeeks).toBe(2)
      expect(res.statutory?.groupWeeks).toBe(12)
      expect(res.statutory?.appliedNoticeWeeks).toBe(12)
      expect(res.statutory?.terminationWeeks).toBe(12)
      expect(res.statutory?.amount).toBe(12692)
      expect(res.commonLaw?.lowMonths).toBe(3)
      expect(res.commonLaw?.highMonths).toBe(5)
      expect(res.commonLaw?.highAmount).toBe(22917)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$12,692–$22,917')
    })

    it('calculates Example F (Federal Canada): $18,462–$100,000', () => {
      const res = marketAdjust(estimate('CA-FED', {
        age: 50, years: 10, salary: 80000, roleFactor: 1.12
      }), 'mid')
      expect(res.statutory?.terminationWeeks).toBe(8)
      expect(res.statutory?.severanceWeeks).toBe(4)
      expect(res.statutory?.weeks).toBe(12)
      expect(res.statutory?.amount).toBe(18462)
      expect(res.commonLaw?.lowMonths).toBe(11)
      expect(res.commonLaw?.highMonths).toBe(15)
      expect(res.commonLaw?.highAmount).toBe(100000)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$18,462–$100,000')
    })

    it('calculates Example G (Saskatchewan Group Conditional): $1,923–$8,333', () => {
      const res = marketAdjust(estimate('CA-SK', {
        age: 35, years: 2, salary: 50000, roleFactor: 1.0, groupLayoff: true, groupSize: 50
      }), 'mid')
      expect(res.statutory?.individualNoticeWeeks).toBe(2)
      expect(res.statutory?.terminationWeeks).toBe(2)
      expect(res.statutory?.amount).toBe(1923)
      expect(res.statutory?.conditionalGroupNoticeWeeks).toBe(6)
      expect(res.statutory?.conditionalGroupNoticeAmount).toBe(5769)
      expect(res.statutory?.conditionalGroupMessage).toBe('may add 6 wks ($5,769), ask a lawyer')
      expect(res.commonLaw?.lowMonths).toBe(2)
      expect(res.commonLaw?.highMonths).toBe(2)
      expect(res.commonLaw?.highAmount).toBe(8333)
      expect(`$${res.statutory!.amount.toLocaleString('en-CA')}–$${res.commonLaw!.highAmount.toLocaleString('en-CA')}`).toBe('$1,923–$8,333')
    })

    it('calculates Example H (PEI Group Layoff): $5,192 (min only)', () => {
      const res = marketAdjust(estimate('CA-PE', {
        age: 28, years: 1, salary: 45000, roleFactor: 1.0, groupLayoff: true, groupSize: 25, workforceQuarter: 'yes'
      }), 'mid')
      expect(res.statutory?.individualNoticeWeeks).toBe(2)
      expect(res.statutory?.groupWeeks).toBe(6)
      expect(res.statutory?.appliedNoticeWeeks).toBe(6)
      expect(res.statutory?.terminationWeeks).toBe(6)
      expect(res.statutory?.amount).toBe(5192)

      const clauseHolds = true
      const lowAmt = res.statutory!.amount
      const highAmt = clauseHolds ? res.statutory!.amount : res.commonLaw!.highAmount
      expect(lowAmt).toBe(5192)
      expect(highAmt).toBe(5192)
    })
  })

  describe('Province-Specific Group Layoff Rules Coverage', () => {
    it('applies Ontario mass termination thresholds (50+: 8, 200+: 12, 500+: 16)', () => {
      const res50 = estimate('CA-ON', { years: 2, salary: 52000, groupLayoff: true, groupSize: 50 })
      expect(res50.statutory?.individualNoticeWeeks).toBe(2)
      expect(res50.statutory?.groupWeeks).toBe(8)
      expect(res50.statutory?.appliedNoticeWeeks).toBe(8)

      const res200 = estimate('CA-ON', { years: 2, salary: 52000, groupLayoff: true, groupSize: 200 })
      expect(res200.statutory?.groupWeeks).toBe(12)
      expect(res200.statutory?.appliedNoticeWeeks).toBe(12)

      const res500 = estimate('CA-ON', { years: 2, salary: 52000, groupLayoff: true, groupSize: 500 })
      expect(res500.statutory?.groupWeeks).toBe(16)
      expect(res500.statutory?.appliedNoticeWeeks).toBe(16)
    })

    it('adds BC group notice on top of individual notice', () => {
      // Individual: 4 yrs -> 4 wks. Group: 50 -> 8 wks. Total = 12 wks.
      const resBC = estimate('CA-BC', { years: 4, salary: 52000, groupLayoff: true, groupSize: 50 })
      expect(resBC.statutory?.individualNoticeWeeks).toBe(4)
      expect(resBC.statutory?.groupWeeks).toBe(8)
      expect(resBC.statutory?.appliedNoticeWeeks).toBe(12)
      expect(resBC.statutory?.weeks).toBe(12)
      expect(resBC.statutory?.amount).toBe(12000)
    })

    it('applies Manitoba group notice thresholds (50+: 10, 101+: 14, 300+: 18)', () => {
      const res50 = estimate('CA-MB', { years: 1, salary: 52000, groupLayoff: true, groupSize: 50 })
      expect(res50.statutory?.groupWeeks).toBe(10)
      expect(res50.statutory?.appliedNoticeWeeks).toBe(10)

      const res101 = estimate('CA-MB', { years: 1, salary: 52000, groupLayoff: true, groupSize: 150 })
      expect(res101.statutory?.groupWeeks).toBe(14)
      expect(res101.statutory?.appliedNoticeWeeks).toBe(14)

      const res300 = estimate('CA-MB', { years: 1, salary: 52000, groupLayoff: true, groupSize: 300 })
      expect(res300.statutory?.groupWeeks).toBe(18)
      expect(res300.statutory?.appliedNoticeWeeks).toBe(18)
    })

    it('applies Newfoundland group notice thresholds (50+: 8, 200+: 12, 500+: 16)', () => {
      const resNL = estimate('CA-NL', { years: 2, salary: 52000, groupLayoff: true, groupSize: 50 })
      expect(resNL.statutory?.groupWeeks).toBe(8)
      expect(resNL.statutory?.appliedNoticeWeeks).toBe(8)
    })

    it('handles New Brunswick conditional group notice (11+ & 25%+ workforce: 6 wks)', () => {
      const resNB = estimate('CA-NB', { years: 2, salary: 52000, groupLayoff: true, groupSize: 25, workforceQuarter: 'yes' })
      expect(resNB.statutory?.individualNoticeWeeks).toBe(2)
      expect(resNB.statutory?.appliedNoticeWeeks).toBe(2)
      expect(resNB.statutory?.conditionalGroupNoticeWeeks).toBe(4) // 6 - 2 = 4
      expect(resNB.statutory?.conditionalGroupMessage).toContain('may add 4 wks')

      // Without 25% of workforce, no group notice
      const resNBNoQ = estimate('CA-NB', { years: 2, salary: 52000, groupLayoff: true, groupSize: 25, workforceQuarter: 'no' })
      expect(resNBNoQ.statutory?.groupWeeks).toBe(0)
    })

    it('confirms Alberta and Federal treat group layoff as notice to Minister only', () => {
      const resAB = estimate('CA-AB', { years: 2, salary: 52000, groupLayoff: true, groupSize: 100 })
      expect(resAB.statutory?.groupWeeks).toBe(0)
      expect(resAB.statutory?.appliedNoticeWeeks).toBe(2)

      const resFED = estimate('CA-FED', { years: 2, salary: 52000, groupLayoff: true, groupSize: 100 })
      expect(resFED.statutory?.groupWeeks).toBe(0)
    })
  })

  describe('computeFreeResult — Free Check API & Payload Integration', () => {
    it('computes Free Check Test Case B (Ontario Payroll Unsure)', () => {
      const res = computeFreeResult('CA', {
        province: 'ON',
        age: 38,
        years: 6,
        salary: 70000,
        payroll: 'unsure',
        roleF: 1.0,
        market: 'mid',
      })
      expect(res.covered).toBe(true)
      expect(res.minimum?.amount).toBe(8077)
      expect(res.minimum?.potentialSeveranceWeeks).toBe(6)
      expect(res.minimum?.potentialSeveranceAmount).toBe(8077)
      expect(res.range?.low).toBe(8077)
      expect(res.range?.high).toBe(40833)
    })

    it('computes Free Check Test Case E (Nova Scotia Group Layoff)', () => {
      const res = computeFreeResult('CA', {
        province: 'NS',
        age: 40,
        years: 4,
        salary: 55000,
        roleFactor: 1.08,
        reason: 'mass',
        groupBand: '100-199',
        quarter: 'yes',
        market: 'mid',
      })
      expect(res.covered).toBe(true)
      expect(res.minimum?.amount).toBe(12692)
      expect(res.range?.low).toBe(12692)
      expect(res.range?.high).toBe(22917)
    })

    it('computes Free Check Test Case G (Saskatchewan Conditional Group Notice)', () => {
      const res = computeFreeResult('CA', {
        province: 'SK',
        age: 35,
        years: 2,
        salary: 50000,
        roleFactor: 1.0,
        reason: 'mass',
        groupBand: '50-99',
        market: 'mid',
      })
      expect(res.covered).toBe(true)
      expect(res.minimum?.amount).toBe(1923)
      expect(res.minimum?.conditionalGroupNoticeWeeks).toBe(6)
      expect(res.minimum?.conditionalGroupNoticeAmount).toBe(5769)
      expect(res.range?.low).toBe(1923)
      expect(res.range?.high).toBe(8333)
    })

    it('computes Free Check Test Case H (PEI Min Only Clause Cap)', () => {
      const res = computeFreeResult('CA', {
        province: 'PE',
        age: 28,
        years: 1,
        salary: 45000,
        roleFactor: 1.0,
        reason: 'mass',
        groupBand: '25-49',
        quarter: 'yes',
        clause: 'yes',
        contract: 'current',
        market: 'mid',
      })
      expect(res.covered).toBe(true)
      expect(res.minimum?.amount).toBe(5192)
      expect(res.range?.clause_caps_range).toBe(true)
      expect(res.range?.low).toBe(5192)
      expect(res.range?.high).toBe(5192)
    })
  })
})

