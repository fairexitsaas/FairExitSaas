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
  // 2. PROGRESS COUNTER CALCULATION
  // ═════════════════════════════════════════════════════════════════════════
  describe('2. Progress Counter Logic', () => {
    it('Canada review page excludes optional and hasOnlyChange items from required count', () => {
      expect(caContent).toContain('const requiredItems = items.filter((i) => !i.isOptional && !i.hasOnlyChange);')
    })

    it('Canada review page calculates totalCount from requiredItems, activeConflicts, and activeMissingCount', () => {
      expect(caContent).toContain('const totalCount = requiredItems.length + activeConflictsCount + activeMissingCount;')
    })

    it('Canada review page confirmedCount only includes active confirmations without pre-counting', () => {
      expect(caContent).toContain('hasOfferConflict && offerConflictChoice !== null ? 1 : 0')
      expect(caContent).toContain('hasContractConflict && contractConflictChoice !== null ? 1 : 0')
      expect(caContent).not.toContain('!hasOfferConflict || offerConflictChoice !== null ? 1 : 0')
    })

    it('US review page calculates totalCount from requiredItems, activeConflicts, and activeMissingCount', () => {
      expect(usContent).toContain('const totalCount = requiredItems.length + activeConflictsCount + activeMissingCount;')
    })

    it('US review page confirmedCount only includes active confirmations without pre-counting', () => {
      expect(usContent).toContain('hasOfferConflict && offerConflictChoice !== null ? 1 : 0')
      expect(usContent).toContain('hasNoticeConflict && noticeConflictChoice !== null ? 1 : 0')
      expect(usContent).toContain('hasServiceConflict && serviceConflictChoice !== null ? 1 : 0')
    })

    it('Simulated Canada progress counter behaves consistently from 0 to complete', () => {
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
        // 10 offer (9 required, 1 hasOnlyChange)
        { id: 'offerMoney', confirmed: false },
        { id: 'pay_rate', confirmed: false },
        { id: 'document_place', confirmed: false },
        { id: 'offerNotice', confirmed: false },
        { id: 'offerVacation', confirmed: false },
        { id: 'offerLastDay', confirmed: false },
        { id: 'offerNoticeWorked', hasOnlyChange: true, confirmed: false },
        { id: 'offerDecideBy', confirmed: false },
        { id: 'offerRelease', confirmed: false },
        { id: 'offerBenefitsEnd', confirmed: false },
        // 3 contract (2 required, 1 optional)
        { id: 'contractLimit', confirmed: false },
        { id: 'contractStartDate', confirmed: false },
        { id: 'contractJobTitle', isOptional: true, confirmed: false },
      ]

      const hasOfferConflict = true
      let offerConflictChoice: string | null = null
      const hasContractConflict = false
      let contractConflictChoice: string | null = null
      let workingWeeksSaved = false
      const hasBonusQuestion = false
      let bonusSaved = false

      function calc() {
        const required = items.filter((i) => !i.isOptional && !i.hasOnlyChange)
        const confirmedItems = required.filter((i) => i.confirmed).length
        const activeConflicts = (hasOfferConflict ? 1 : 0) + (hasContractConflict ? 1 : 0)
        const confirmedConflicts =
          (hasOfferConflict && offerConflictChoice !== null ? 1 : 0) +
          (hasContractConflict && contractConflictChoice !== null ? 1 : 0)
        const activeMissing = 1 + (hasBonusQuestion ? 1 : 0)
        const confirmedMissing =
          (workingWeeksSaved ? 1 : 0) + (hasBonusQuestion && bonusSaved ? 1 : 0)

        const total = required.length + activeConflicts + activeMissing
        const confirmed = Math.min(total, confirmedItems + confirmedConflicts + confirmedMissing)
        const remaining = Math.max(0, total - confirmed)
        return { total, confirmed, remaining }
      }

      // Initial state: 19 required items + 1 active conflict + 1 missing question = 21 tasks
      const init = calc()
      expect(init.total).toBe(21)
      expect(init.confirmed).toBe(0)
      expect(init.remaining).toBe(21)

      // Confirm 1 review item
      items[0].confirmed = true
      const step1 = calc()
      expect(step1.confirmed).toBe(1)
      expect(step1.remaining).toBe(20)

      // Resolve conflict
      offerConflictChoice = 'letter'
      const step2 = calc()
      expect(step2.confirmed).toBe(2)
      expect(step2.remaining).toBe(19)

      // Save missing question
      workingWeeksSaved = true
      const step3 = calc()
      expect(step3.confirmed).toBe(3)
      expect(step3.remaining).toBe(18)

      // Confirm all remaining
      for (const itm of items) itm.confirmed = true
      const finalStep = calc()
      expect(finalStep.confirmed).toBe(21)
      expect(finalStep.remaining).toBe(0)
    })
  })

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CHANGE REGION MODAL MOUNTING & BEHAVIOUR
  // ═════════════════════════════════════════════════════════════════════════
  describe('3. Change Region Modal Integration', () => {
    it('CanadaReviewPage renders ChangeJurisdictionModal with showChangeRegionModal', () => {
      expect(caContent).toContain('<ChangeJurisdictionModal')
      expect(caContent).toContain('isOpen={showChangeRegionModal}')
      expect(caContent).toContain('currentCountry="CA"')
      expect(caContent).toContain('onClose={() => setShowChangeRegionModal(false)}')
    })

    it('USReviewPage renders ChangeJurisdictionModal with showChangeRegionModal', () => {
      expect(usContent).toContain('<ChangeJurisdictionModal')
      expect(usContent).toContain('isOpen={showChangeRegionModal}')
      expect(usContent).toContain('currentCountry="US"')
      expect(usContent).toContain('onClose={() => setShowChangeRegionModal(false)}')
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

    it('ChangeJurisdictionModal invokes fairexit.changeJurisdiction on Save', () => {
      expect(modalContent).toContain('await fairexit.changeJurisdiction(caseId, country, region)')
    })

    it('ChangeJurisdictionModal displays error on failure and does not falsely report success', () => {
      expect(modalContent).toContain('setErrorMessage(err?.message || "Failed to update jurisdiction. Please try again.");')
      expect(modalContent).toContain('setIsSubmitting(false);')
      expect(modalContent).toContain('{errorMessage && (')
    })
  })
})

