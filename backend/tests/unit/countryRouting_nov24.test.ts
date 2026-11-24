import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Canada Questions Routing & Country Resolution Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const storagePath = path.join(rootDir, 'src/lib/report-storage.ts')
  const questionsPagePath = path.join(rootDir, 'src/app/questions/page.tsx')
  const canadaFlowPath = path.join(rootDir, 'src/app/questions/CanadaFlow.tsx')
  const navbarPath = path.join(rootDir, 'src/components/layout/Navbar.tsx')
  const bottomCtaPath = path.join(rootDir, 'src/components/landing/BottomCta.tsx')
  const faqSectionPath = path.join(rootDir, 'src/components/landing/FaqSection.tsx')
  const providerPath = path.join(rootDir, 'src/app/Provider.tsx')
  const quickCheckPath = path.join(rootDir, 'src/components/landing/QuickCheckForm.tsx')

  const storageContent = fs.readFileSync(storagePath, 'utf8')
  const questionsContent = fs.readFileSync(questionsPagePath, 'utf8')
  const canadaFlowContent = fs.readFileSync(canadaFlowPath, 'utf8')
  const navbarContent = fs.readFileSync(navbarPath, 'utf8')
  const bottomCtaContent = fs.readFileSync(bottomCtaPath, 'utf8')
  const faqSectionContent = fs.readFileSync(faqSectionPath, 'utf8')
  const providerContent = fs.readFileSync(providerPath, 'utf8')
  const quickCheckContent = fs.readFileSync(quickCheckPath, 'utf8')

  describe('1. detectIsUS bidirectional logic & Canadian priority', () => {
    it('defines and exports Canadian provinces and isCAProvince helper', () => {
      expect(storageContent).toContain('export const CA_PROVINCES')
      expect(storageContent).toContain('export const CA_PROVINCE_CODES')
      expect(storageContent).toContain('export function isCAProvince(')
    })

    it('prioritizes URL searchParams with country=CA or Canadian provinces to return false (Canada)', () => {
      expect(storageContent).toMatch(/if\s*\(cParam\s*===\s*["']CA["']\)\s*return false/)
      expect(storageContent).toMatch(/if\s*\(isCAProvince\(pParam\)\)\s*return false/)
    })

    it('returns false when country option or CountryContext is CA', () => {
      expect(storageContent).toMatch(/if\s*\(countryStr\s*===\s*["']CA["']\)\s*return false/)
    })

    it('returns false when case cs indicates CA', () => {
      expect(storageContent).toMatch(/cs\?\.country\s*===\s*["']CA["']/)
    })

    it('returns false when browser storage or report inputs indicate CA', () => {
      expect(storageContent).toMatch(/if\s*\(localCountry\s*===\s*["']CA["']\)\s*return false/)
      expect(storageContent).toMatch(/parsed\.country\s*===\s*["']CA["']/)
    })

    it('guards isUSState(parsed.provinceName) to not misidentify CA as California', () => {
      expect(storageContent).toContain('parsed.provinceName?.toLowerCase() !== "ca"')
    })
  })

  describe('2. Questions router and CanadaFlow configuration', () => {
    it('Questions router correctly selects CanadaFlow when isCanada is true (!isUS)', () => {
      expect(questionsContent).toContain('const isCanada = !isUS')
      expect(questionsContent).toContain('<CanadaFlow key={flowKey} />')
      expect(questionsContent).toContain('<USFlow key={flowKey} />')
    })

    it('Questions router syncs CountryContext with active question flow', () => {
      expect(questionsContent).toContain('countryContext?.setCountry("CA")')
      expect(questionsContent).toContain('countryContext?.setCountry("US")')
    })

    it('CanadaFlow strictly sets isCanada = true and defaults to step q1 (not us-situation)', () => {
      expect(canadaFlowContent).toContain('const isCanada = true;')
      expect(canadaFlowContent).toContain('const [currentStep, setCurrentStep] = useState<string>("q1");')
      expect(canadaFlowContent).not.toMatch(/const \[currentStep,\s*setCurrentStep\]\s*=\s*useState<string>\(\s*isCanada\s*\?\s*"q1"\s*:\s*"us-situation"/)
    })
  })

  describe('3. Links and forms explicitly route Canada users to Canada questions', () => {
    it('Navbar CTA routes Canadian users to /questions?country=CA', () => {
      expect(navbarContent).toContain('router.push(isCanada ? "/questions?country=CA" : "/questions?country=US")')
      expect(navbarContent).toContain('href={isCanada ? "/questions?country=CA" : "/#check"}')
    })

    it('BottomCta routes Canadian users to /questions?country=CA', () => {
      expect(bottomCtaContent).toContain('router.push("/questions?country=CA")')
      expect(bottomCtaContent).toContain('href={isCanada ? "/questions?country=CA" : "#hero"}')
    })

    it('FaqSection routes Canadian users to /questions?country=CA', () => {
      expect(faqSectionContent).toContain('router.push("/questions?country=CA")')
      expect(faqSectionContent).toContain('href="/questions?country=CA"')
    })

    it('QuickCheckForm sets country in localStorage on submit', () => {
      expect(quickCheckContent).toContain('localStorage.setItem("fairexit_country", "CA")')
      expect(quickCheckContent).toContain('localStorage.setItem("fairexit_country", "US")')
    })

    it('Provider initializes country lazily and recognizes Canadian province params', () => {
      expect(providerContent).toContain('params.get("p") || params.get("province")')
      expect(providerContent).toContain('knownCountry = "CA"')
    })
  })
})
