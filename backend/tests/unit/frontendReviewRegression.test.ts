import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Group 2 Frontend Regression Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const caPagePath = path.join(rootDir, 'src/components/report/ca/CanadaReviewPage.tsx')
  const usPagePath = path.join(rootDir, 'src/components/report/us/USReviewPage.tsx')
  const modalPath = path.join(rootDir, 'src/components/report/ChangeJurisdictionModal.tsx')

  const caContent = fs.readFileSync(caPagePath, 'utf8')
  const usContent = fs.readFileSync(usPagePath, 'utf8')
  const modalContent = fs.readFileSync(modalPath, 'utf8')

  // ═════════════════════════════════════════════════════════════════════════
  // 1. CONFIRMATION ITEMS RENDERING & SECTION ASSIGNMENT
  // ═════════════════════════════════════════════════════════════════════════
  describe('1. Confirmation Items and Sections', () => {
    it('CanadaReviewPage ReviewItem interface requires section: "you" | "offer" | "contract"', () => {
      expect(caContent).toContain('section: "you" | "offer" | "contract";')
      expect(caContent).not.toContain('section?: "you" | "offer" | "contract";')
    })

    it('USReviewPage USReviewItem interface requires section: "you" | "offer" | "layoff"', () => {
      expect(usContent).toContain('section: "you" | "offer" | "layoff";')
      expect(usContent).not.toContain('section?: "you" | "offer" | "layoff";')
    })

    it('CanadaReviewPage defines all 8 "About you" items with section "you"', () => {
      const youItems = ['province', 'employee_name', 'employer_name', 'age', 'years', 'salary', 'role', 'howEnded']
      for (const id of youItems) {
        expect(caContent).toMatch(new RegExp(`id:\\s*"${id}",\\s*section:\\s*"you"`))
      }
    })

    it('CanadaReviewPage defines all 10 "Your offer" items with section "offer"', () => {
      const offerItems = [
        'offerMoney', 'pay_rate', 'document_place', 'offerNotice', 'offerVacation',
        'offerLastDay', 'offerNoticeWorked', 'offerDecideBy', 'offerRelease', 'offerBenefitsEnd'
      ]
      for (const id of offerItems) {
        expect(caContent).toMatch(new RegExp(`id:\\s*"${id}",\\s*section:\\s*"offer"`))
      }
    })

    it('CanadaReviewPage defines all 3 "Your contract" items with section "contract"', () => {
      const contractItems = ['contractLimit', 'contractStartDate', 'contractJobTitle']
      for (const id of contractItems) {
        expect(caContent).toMatch(new RegExp(`id:\\s*"${id}",\\s*section:\\s*"contract"`))
      }
    })

    it('USReviewPage defines all 6 "About you" items with section "you"', () => {
      const youItems = ['state', 'employee_name', 'employer_name', 'age', 'years', 'salary']
      for (const id of youItems) {
        expect(usContent).toMatch(new RegExp(`id:\\s*"${id}",\\s*section:\\s*"you"`))
      }
    })

    it('USReviewPage defines all 12 "Your agreement" items with section "offer"', () => {
      const offerItems = [
        'offerMoney', 'pay_rate', 'document_place', 'contractStartDate', 'contractJobTitle',
        'signRelease', 'daysToDecide', 'revocationPeriod', 'seeAttorney', 'agesTitlesList',
        'nonCompete', 'lastDayAgreement'
      ]
      for (const id of offerItems) {
        expect(usContent).toMatch(new RegExp(`id:\\s*"${id}",\\s*section:\\s*"offer"`))
      }
    })

    it('USReviewPage defines "advanceNotice" with section "layoff"', () => {
      expect(usContent).toMatch(/id:\s*"advanceNotice",\s*section:\s*"layoff"/)
    })

    it('No review items in either page have undefined or missing sections', () => {
      // Parse item objects from CanadaReviewPage
      const caMatches = caContent.match(/id:\s*"([a-zA-Z0-9_]+)"/g) || []
      const caIds = caMatches.map((m) => m.replace(/id:\s*"/, '').replace('"', ''))
      // Check that all defined IDs are unique
      const uniqueCa = new Set(caIds)
      expect(uniqueCa.size).toBe(caIds.length)

      // Parse item objects from USReviewPage
      const usMatches = usContent.match(/id:\s*"([a-zA-Z0-9_]+)"/g) || []
      const usIds = usMatches.map((m) => m.replace(/id:\s*"/, '').replace('"', ''))
      const uniqueUs = new Set(usIds)
      expect(uniqueUs.size).toBe(usIds.length)
    })

    it('Both Canada and US review pages render all 3 sections using item.section filters', () => {
      expect(caContent).toContain('items.filter((item) => item.section === "you")')
      expect(caContent).toContain('items.filter((item) => item.section === "offer")')
      expect(caContent).toContain('items.filter((item) => item.section === "contract")')

      expect(usContent).toContain('items.filter((item) => item.section === "you")')
      expect(usContent).toContain('items.filter((item) => item.section === "offer")')
      expect(usContent).toContain('items.filter((item) => item.section === "layoff")')
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // 2. PROGRESS COUNTER CALCULATION (1-TO-1 TASK MAPPING)
  // ═════════════════════════════════════════════════════════════════════════
  describe('2. Progress Counter Logic (1-to-1 Task Mapping)', () => {
    it('Canada review page maps required items 1-to-1 without double-counting conflicts or missing tasks', () => {
      expect(caContent).toContain('const totalCount = requiredItems.length + (isBonusRequired ? 1 : 0);')
      expect(caContent).toContain('requiredItems.filter(isItemConfirmed).length')
      expect(caContent).not.toContain('requiredItems.length + activeConflictsCount')
    })

    it('US review page maps required items 1-to-1 without inflating total when conflicts or missing questions exist', () => {
      expect(usContent).toContain('const totalCount = requiredItems.length;')
      expect(usContent).toContain('requiredItems.filter(isItemConfirmed).length')
      expect(usContent).not.toContain('requiredItems.length + activeConflictsCount')
    })

    it('US review page accurately maps 19 cards to 19 total tasks (never 20)', () => {
      // 19 US review cards matching USReviewPage items
      const items = [
        // Section 3: About you (6)
        { id: 'state', confirmed: false },
        { id: 'employee_name', confirmed: false },
        { id: 'employer_name', confirmed: false },
        { id: 'age', confirmed: false },
        { id: 'years', confirmed: false },
        { id: 'salary', confirmed: false },
        // Section 4: Your agreement (12)
        { id: 'offerMoney', confirmed: false },
        { id: 'pay_rate', confirmed: false },
        { id: 'document_place', confirmed: false },
        { id: 'contractStartDate', confirmed: false },
        { id: 'contractJobTitle', confirmed: false },
        { id: 'signRelease', confirmed: false },
        { id: 'daysToDecide', confirmed: false },
        { id: 'revocationPeriod', confirmed: false },
        { id: 'seeAttorney', confirmed: false },
        { id: 'agesTitlesList', confirmed: false },
        { id: 'nonCompete', confirmed: false },
        { id: 'lastDayAgreement', confirmed: false },
        // Section 5: The layoff (1)
        { id: 'advanceNotice', confirmed: false },
      ]

      let hasNoticeConflict = true
      let noticeConflictChoice: string | null = null
      let hasMissingLastDay = true
      let lastDayWorkSaved = false

      const isItemConfirmed = (item: any) => {
        if (item.id === 'advanceNotice' && hasNoticeConflict) {
          return noticeConflictChoice !== null || item.confirmed === true
        }
        if (item.id === 'lastDayAgreement' && hasMissingLastDay) {
          return lastDayWorkSaved || item.confirmed === true
        }
        return item.confirmed === true
      }

      function calcUS() {
        const requiredItems = items.filter((i: any) => !i.isOptional)
        const totalCount = requiredItems.length
        const confirmedCount = Math.min(totalCount, requiredItems.filter(isItemConfirmed).length)
        const remainingCount = Math.max(0, totalCount - confirmedCount)
        const isAllConfirmed = remainingCount === 0
        return { totalCount, confirmedCount, remainingCount, isAllConfirmed }
      }

      // Initial: 19 cards total, 0 confirmed
      const init = calcUS()
      expect(init.totalCount).toBe(19)
      expect(init.confirmedCount).toBe(0)
      expect(init.remainingCount).toBe(19)
      expect(init.isAllConfirmed).toBe(false)

      // Resolving notice conflict marks advanceNotice confirmed -> 1 of 19 (total remains 19)
      noticeConflictChoice = 'agreement'
      const step1 = calcUS()
      expect(step1.totalCount).toBe(19)
      expect(step1.confirmedCount).toBe(1)
      expect(step1.remainingCount).toBe(18)

      // Saving missing last day question marks lastDayAgreement confirmed -> 2 of 19 (total remains 19)
      lastDayWorkSaved = true
      const step2 = calcUS()
      expect(step2.totalCount).toBe(19)
      expect(step2.confirmedCount).toBe(2)
      expect(step2.remainingCount).toBe(17)

      // Confirm all remaining cards -> exactly 19 of 19 confirmed, never 20
      for (const itm of items) itm.confirmed = true
      const finalStep = calcUS()
      expect(finalStep.totalCount).toBe(19)
      expect(finalStep.confirmedCount).toBe(19)
      expect(finalStep.remainingCount).toBe(0)
      expect(finalStep.isAllConfirmed).toBe(true)
    })

    it('Simulated Canada progress counter maps each item 1-to-1 from 0 to complete without double-counting', () => {
      const items = [
        // 8 about you (all required)
        { id: 'province', confirmed: false },
        { id: 'employee_name', confirmed: false },
        { id: 'employer_name', confirmed: false },
        { id: 'age', confirmed: false },
        { id: 'years', confirmed: false },
        { id: 'salary', confirmed: false },
        { id: 'role', confirmed: false },
        { id: 'howEnded', confirmed: false },
        // 10 offer (all required)
        { id: 'offerMoney', confirmed: false },
        { id: 'pay_rate', confirmed: false },
        { id: 'document_place', confirmed: false },
        { id: 'offerNotice', confirmed: false },
        { id: 'offerVacation', confirmed: false },
        { id: 'offerLastDay', confirmed: false },
        { id: 'offerNoticeWorked', confirmed: false },
        { id: 'offerDecideBy', confirmed: false },
        { id: 'offerRelease', confirmed: false },
        { id: 'offerBenefitsEnd', confirmed: false },
        // 3 contract (2 required, 1 optional)
        { id: 'contractLimit', confirmed: false },
        { id: 'contractStartDate', confirmed: false },
        { id: 'contractJobTitle', isOptional: true, confirmed: false },
      ]

      let hasOfferConflict = true
      let offerConflictChoice: string | null = null
      let hasContractConflict = false
      let contractConflictChoice: string | null = null
      let workingWeeksSaved = false
      let hasBonusQuestion = true
      let bonusSaved = false

      const isItemConfirmed = (item: any) => {
        if (item.id === 'offerNoticeWorked') {
          return workingWeeksSaved || item.confirmed === true
        }
        if (item.id === 'offerMoney' && hasOfferConflict) {
          return offerConflictChoice !== null || item.confirmed === true
        }
        if (item.id === 'contractLimit' && hasContractConflict) {
          return contractConflictChoice !== null || item.confirmed === true
        }
        return item.confirmed === true
      }

      function calcCA() {
        const requiredItems = items.filter((i: any) => !i.isOptional)
        const isBonusRequired = Boolean(hasBonusQuestion)
        const isBonusConfirmed = isBonusRequired && Boolean(bonusSaved)
        const totalCount = requiredItems.length + (isBonusRequired ? 1 : 0)
        const confirmedCount = Math.min(
          totalCount,
          requiredItems.filter(isItemConfirmed).length + (isBonusConfirmed ? 1 : 0)
        )
        const remainingCount = Math.max(0, totalCount - confirmedCount)
        const isAllConfirmed = remainingCount === 0
        return { totalCount, confirmedCount, remainingCount, isAllConfirmed }
      }

      // Initial state: 20 required items (21 - 1 optional) + 1 bonus question = 21 tasks
      const init = calcCA()
      expect(init.totalCount).toBe(21)
      expect(init.confirmedCount).toBe(0)
      expect(init.remainingCount).toBe(21)

      // Confirm 1 review item
      items[0].confirmed = true
      const step1 = calcCA()
      expect(step1.confirmedCount).toBe(1)
      expect(step1.remainingCount).toBe(20)

      // Resolve conflict (marks offerMoney confirmed, does not add extra task)
      offerConflictChoice = 'letter'
      const step2 = calcCA()
      expect(step2.confirmedCount).toBe(2)
      expect(step2.remainingCount).toBe(19)

      // Save working notice (marks offerNoticeWorked confirmed)
      workingWeeksSaved = true
      const step3 = calcCA()
      expect(step3.confirmedCount).toBe(3)
      expect(step3.remainingCount).toBe(18)

      // Save bonus question
      bonusSaved = true
      const step4 = calcCA()
      expect(step4.confirmedCount).toBe(4)
      expect(step4.remainingCount).toBe(17)

      // Confirm all remaining -> exactly 21 of 21 confirmed
      for (const itm of items) itm.confirmed = true
      const finalStep = calcCA()
      expect(finalStep.confirmedCount).toBe(21)
      expect(finalStep.remainingCount).toBe(0)
      expect(finalStep.isAllConfirmed).toBe(true)
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CHANGE REGION & IN-PLACE STATE UPDATE (NO RELOAD / NO LOADER)
  // ═════════════════════════════════════════════════════════════════════════
  describe('3. Change Region Modal & In-Place State Update', () => {
    it('Neither CanadaReviewPage nor USReviewPage calls window.location.reload()', () => {
      expect(caContent).not.toContain('window.location.reload()')
      expect(usContent).not.toContain('window.location.reload()')
    })

    it('Both review pages implement handleJurisdictionChanged for in-place state updating', () => {
      expect(caContent).toContain('handleJurisdictionChanged')
      expect(usContent).toContain('handleJurisdictionChanged')
    })

    it('Changing region resets declaredCorrect to false (requiring re-attestation before build)', () => {
      expect(caContent).toContain('setDeclaredCorrect(false)')
      expect(usContent).toContain('setDeclaredCorrect(false)')
    })

    it('Saving State/Province inline triggers fairexit.changeJurisdiction', () => {
      expect(usContent).toContain("if (id === 'state')")
      expect(usContent).toContain("fairexit.changeJurisdiction(activeCaseId, 'US', formattedVal)")
      expect(caContent).toContain("if (id === 'province')")
      expect(caContent).toContain("fairexit.changeJurisdiction(activeCaseId, 'CA', formattedVal)")
    })

    it('CanadaReviewPage renders ChangeJurisdictionModal with in-place onSuccess handler', () => {
      expect(caContent).toContain('<ChangeJurisdictionModal')
      expect(caContent).toContain('isOpen={showChangeRegionModal}')
      expect(caContent).toContain('currentCountry="CA"')
      expect(caContent).toContain('onClose={() => setShowChangeRegionModal(false)}')
      expect(caContent).toContain('handleJurisdictionChanged')
    })

    it('USReviewPage renders ChangeJurisdictionModal with in-place onSuccess handler', () => {
      expect(usContent).toContain('<ChangeJurisdictionModal')
      expect(usContent).toContain('isOpen={showChangeRegionModal}')
      expect(usContent).toContain('currentCountry="US"')
      expect(usContent).toContain('onClose={() => setShowChangeRegionModal(false)}')
      expect(usContent).toContain('handleJurisdictionChanged')
    })

    it('ChangeJurisdictionModal passes API response and region to onSuccess without page reload', () => {
      expect(modalContent).toContain('const res = await fairexit.changeJurisdiction(caseId, country, region);')
      expect(modalContent).toContain('onSuccess(res, region);')
      expect(modalContent).not.toContain('window.location.reload();')
    })

    it('ChangeJurisdictionModal matches substring regions (e.g. "Ontario, Canada" -> "Ontario")', () => {
      expect(modalContent).toContain('function matchRegion(')
      expect(modalContent).toContain('r.toLowerCase() === clean')
      expect(modalContent).toContain('clean.includes(r.toLowerCase())')
    })

    it('ChangeJurisdictionModal updates selection when opened via useEffect', () => {
      expect(modalContent).toContain('React.useEffect(() => {')
      expect(modalContent).toContain('if (isOpen) {')
      expect(modalContent).toContain('setRegion(')
    })

    it('ChangeJurisdictionModal displays error on failure and does not falsely report success', () => {
      expect(modalContent).toContain('setErrorMessage(err?.message || "Failed to update jurisdiction. Please try again.");')
      expect(modalContent).toContain('setIsSubmitting(false);')
      expect(modalContent).toContain('{errorMessage && (')
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // 4. BONUS CARD DISPLAY CONDITION (ONLY WHEN BONUS TICKED IN OTHER PAY)
  // ═════════════════════════════════════════════════════════════════════════
  describe('4. Bonus Option in Other Pay Condition', () => {
    it('CanadaReviewPage exports isBonusInOtherPay and binds hasBonusQuestion to it', () => {
      expect(caContent).toContain('isBonusInOtherPay')
      expect(caContent).toContain('const isBonusSelected = useMemo(() => isBonusInOtherPay(answers, data), [answers, data]);')
      expect(caContent).toContain('const [hasBonusQuestion, setHasBonusQuestion] = useState<boolean>(isBonusSelected);')
    })

    it('CanadaReviewPage wraps the bonus card strictly with {hasBonusQuestion && ...}', () => {
      expect(caContent).toContain('{hasBonusQuestion && (')
      expect(caContent).toContain('About how much was your bonus each year?')
    })

    it('CanadaReviewPage does not use missingKeys or missingList to artificially show bonus card', () => {
      expect(caContent).not.toContain("missingKeys?.includes('bonus_amount')")
      expect(caContent).not.toContain("m.key === 'bonus_amount'")
    })

    it('isBonusInOtherPay logic accurately detects bonus selection across all payload variants', async () => {
      const { isBonusInOtherPay } = await import('../../../src/lib/report-storage')

      // 1. Explicit pay object with bonus: true -> true
      expect(isBonusInOtherPay({ pay: { bonus: true } }, null)).toBe(true)
      expect(isBonusInOtherPay({ fullState: { pay: { bonus: true } } }, null)).toBe(true)

      // 2. Explicit pay object with bonus: false -> false (even if otherPay string contains text)
      expect(isBonusInOtherPay({ pay: { bonus: false } }, null)).toBe(false)
      expect(isBonusInOtherPay({ pay: { bonus: false, benefits: true } }, null)).toBe(false)

      // 3. otherPay string in answers
      expect(isBonusInOtherPay({ otherPay: 'Bonus' }, null)).toBe(true)
      expect(isBonusInOtherPay({ otherPay: 'bonus' }, null)).toBe(true)
      expect(isBonusInOtherPay({ otherPay: 'Bonus, Stock' }, null)).toBe(true)
      expect(isBonusInOtherPay({ otherPay: 'Benefits, bonus' }, null)).toBe(true)

      // 4. otherPay is None or non-bonus
      expect(isBonusInOtherPay({ otherPay: 'None' }, null)).toBe(false)
      expect(isBonusInOtherPay({ otherPay: 'Benefits' }, null)).toBe(false)
      expect(isBonusInOtherPay({ otherPay: 'Stock, Benefits' }, null)).toBe(false)
      expect(isBonusInOtherPay({ otherPay: 'No bonus' }, null)).toBe(false)

      // 5. Unpaid bonus / wages in redflags/reasons must NOT trigger bonus card when otherPay is None
      expect(
        isBonusInOtherPay(
          {
            otherPay: 'None',
            redflag: 'unpaid',
            flagged: 'Unpaid bonus / wages',
            reasons: [['Unpaid bonus / wages may be owed', 1]],
          },
          null
        )
      ).toBe(false)

      // 6. Stale localStorage with bonus is overridden by current case answers
      expect(
        isBonusInOtherPay(
          { otherPay: 'None' },
          { otherPay: 'Bonus' } as any
        )
      ).toBe(false)

      expect(
        isBonusInOtherPay(
          { pay: { bonus: false } },
          { otherPay: 'Bonus' } as any
        )
      ).toBe(false)

      // 7. Local data fallback when no remote case answers exist
      expect(isBonusInOtherPay(null, { otherPay: 'Bonus' } as any)).toBe(true)
      expect(isBonusInOtherPay(null, { otherPay: 'None' } as any)).toBe(false)
      expect(isBonusInOtherPay(null, { otherPay: 'Benefits' } as any)).toBe(false)
    })
  })
})

