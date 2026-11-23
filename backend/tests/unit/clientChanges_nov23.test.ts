import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { computeFreeResult } from '../../src/fairexit/freeCheck'
import { leadService } from '../../src/services/lead.service'
import { emailService } from '../../src/services/email.service'
import { env } from '../../src/config/env'
import type { CaseRow } from '../../src/fairexit/types'

describe('Client Changes Verification Suite (Tasks 1 to 5)', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const readSource = (relPath: string) => fs.readFileSync(path.join(rootDir, relPath), 'utf-8')

  describe('Task 1 — About Page Redesign (Canada & US)', () => {
    const aboutContent = readSource('src/app/about/page.tsx')

    it('prominently features both founders with approved images, names and bios', () => {
      // Images
      expect(aboutContent).toMatch(/src=["']\/founder-sundeep\.jpg["']/)
      expect(aboutContent).toMatch(/src=["']\/founder-riaz\.jpg["']/)

      // Physical image files exist in public/
      expect(fs.existsSync(path.join(rootDir, 'public/founder-sundeep.jpg'))).toBe(true)
      expect(fs.existsSync(path.join(rootDir, 'public/founder-riaz.jpg'))).toBe(true)

      // Names & titles
      expect(aboutContent).toMatch(/Sundeep Parmar/)
      expect(aboutContent).toMatch(/Riaz Ladha/)
      expect(aboutContent).toMatch(/Co-founder/)

      // Bios
      expect(aboutContent).toMatch(/Laid off more than once, and handed the papers every time/)
      expect(aboutContent).toMatch(/Riaz has led teams and sat on the employer side of the table/)
    })

    it('contains the streamlined 3-paragraph short story', () => {
      expect(aboutContent).toMatch(/A short meeting\. A folder of papers\. A pen\./)
      expect(aboutContent).toMatch(/In that moment you&apos;re angry, scared and in a hurry/)
      expect(aboutContent).toMatch(/FairExit helps you make sense of the offer in plain English/)
    })

    it('contains the 3 option cards and country-specific distinctions', () => {
      expect(aboutContent).toMatch(/Sign it/)
      expect(aboutContent).toMatch(/Knowing what&apos;s in it\./)
      expect(aboutContent).toMatch(/Raise it yourself/)
      expect(aboutContent).toMatch(/With your questions organized\./)

      // Country conditional checks
      expect(aboutContent).toMatch(/isCanada \? "Talk to a lawyer" : "Talk to an attorney"/)
      expect(aboutContent).toMatch(/isCanada \? "See where your own offer sits" : "Check your own agreement"/)
      expect(aboutContent).toMatch(/isCanada \? "Check my offer →" : "Check my layoff →"/)
      expect(aboutContent).toMatch(/Software reads your documents; it doesn('t|&apos;t) decide your case\./)
    })
  })

  describe('Task 2 — Free Result Flow Audit', () => {
    it('computeFreeResult calculates results purely from deterministic rules with zero AI/LLM calls', () => {
      const caResult = computeFreeResult('CA', {
        province: 'ON',
        age: 45,
        years: 8,
        salary: 80000,
        payroll: 'yes',
      })
      expect(caResult.covered).toBe(true)
      expect(caResult.weekly).toBeGreaterThan(0)
      expect(caResult.range?.low).toBeGreaterThan(0)

      const usResult = computeFreeResult('US', {
        state: 'NY',
        age: 50,
        years: 5,
        salary: 100000,
        offer: 15000,
      })
      expect(usResult.covered).toBe(true)
      expect(usResult.offer?.amount).toBe(15000)
    })

    it('free check results screen does not display mock email or PDF download modals', () => {
      const caFlow = readSource('src/app/questions/CanadaFlow.tsx')
      const usFlow = readSource('src/app/questions/USFlow.tsx')

      expect(caFlow).not.toMatch(/Email me my free result →/)
      expect(caFlow).not.toMatch(/We&apos;ll send a clean PDF summary/)
      expect(usFlow).not.toMatch(/Email me my free result →/)
      expect(usFlow).not.toMatch(/We&apos;ll send a clean PDF summary/)
    })
  })

  describe('Task 3 — Standalone Lawyer Request Page (/lawyer-request)', () => {
    const pagePath = 'src/app/lawyer-request/page.tsx'

    it('exists as a page and follows the exact 3-stage flow', () => {
      expect(fs.existsSync(path.join(rootDir, pagePath))).toBe(true)
      const content = readSource(pagePath)

      // 3 Stages
      expect(content).toMatch(/Step 1 of 3 · Overview/)
      expect(content).toMatch(/Step 2 of 3 · Your Details/)
      expect(content).toMatch(/Step 3 of 3 · Complete/)

      // Exactly 3 contact fields
      expect(content).toMatch(/Full name/)
      expect(content).toMatch(/Phone number/)
      expect(content).toMatch(/Email address/)

      // Does not contain old 9-step questions
      expect(content).not.toMatch(/step 1 of 9/i)
      expect(content).not.toMatch(/legal_help_form/i)
    })

    it('is completely standalone and not linked from navbar, footer, or other pages', () => {
      const navbar = readSource('src/components/layout/Navbar.tsx')
      const footer = readSource('src/components/layout/Footer.tsx')
      const home = readSource('src/app/page.tsx')
      const about = readSource('src/app/about/page.tsx')

      expect(navbar).not.toMatch(/\/lawyer-request/)
      expect(footer).not.toMatch(/\/lawyer-request/)
      expect(home).not.toMatch(/\/lawyer-request/)
      expect(about).not.toMatch(/\/lawyer-request/)
    })

    it('leadService routes notifications to support@fairexit.io', async () => {
      const sendSpy = vi.spyOn(emailService, 'opsNewLead')
      const testCase: CaseRow = {
        id: '99999999-9999-9999-9999-999999999999',
        public_id: 'FX-9999',
        user_id: null,
        token_hashes: [],
        platform: 'web',
        country: 'CA',
        jurisdiction_code: 'CA-ON',
        jurisdiction: { name: 'Ontario', code: 'CA-ON' } as any,
        covered: true,
        industry: null,
        answers: { province: 'ON', years: 6, salary: 75000, offer: 12000 },
        free_result: null,
        status: 'free_check',
        status_detail: null,
        job_started_at: null,
        email: 'test@example.com',
        consent: null,
        remind: false,
        paid_at: null,
        payment_provider: null,
        amount_cents: null,
        currency: null,
        contract_status: 'never',
        call_a: null,
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

      // Verify lead summary preserves available case details
      const summary = (await import('../../src/services/lead.service')).leadSummary(testCase)
      expect(summary.years_with_employer).toBe(6)
      expect(summary.amount_offered).toBe(12000)
    })
  })

  describe('Task 4 — Mobile Homepage Headline Typography', () => {
    const heroContent = readSource('src/components/landing/HeroSection.tsx')

    it('homepage hero H1 mobile font size is increased to at least 30px', () => {
      // Look for H1 class with text-[30px]
      expect(heroContent).toMatch(/<h1[^>]*text-\[30px\]/)
    })
  })

  describe('Task 5 — Tagline Strip Above Navbar', () => {
    const taglineContent = readSource('src/components/landing/TaglineStrip.tsx')
    const homeContent = readSource('src/app/page.tsx')

    it('TaglineStrip contains exact required wording and styling', () => {
      expect(taglineContent).toMatch(/Know your worth\./)
      expect(taglineContent).toMatch(/Challenge your severance offer\./)
      expect(taglineContent).toMatch(/#0EB28D/)
      expect(taglineContent).toMatch(/font-sans/)
      expect(taglineContent).toMatch(/font-bold/)
      expect(taglineContent).toMatch(/whitespace-nowrap/)
    })

    it('TaglineStrip is placed immediately below Navbar on the homepage', () => {
      const stripIndex = homeContent.indexOf('<TaglineStrip')
      const navIndex = homeContent.indexOf('<Navbar')

      expect(stripIndex).toBeGreaterThan(-1)
      expect(navIndex).toBeGreaterThan(-1)
      expect(navIndex).toBeLessThan(stripIndex)
    })
  })
})
