import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Change 2: Navbar & Footer Navigation Requirements', () => {
  const rootDir = path.resolve(__dirname, '../../..')

  const readSource = (relPath: string) => {
    return fs.readFileSync(path.join(rootDir, relPath), 'utf-8')
  }

  describe('Navbar.tsx', () => {
    const navbarContent = readSource('src/components/layout/Navbar.tsx')

    it('does not contain "Get the app" or "triggerGetApp"', () => {
      expect(navbarContent).not.toMatch(/Get the app/i)
      expect(navbarContent).not.toMatch(/triggerGetApp/)
    })

    it('does not contain "Accessibility" in navbar links or buttons', () => {
      expect(navbarContent).not.toMatch(/accessibility/i)
      expect(navbarContent).not.toMatch(/useAccessibility/)
    })

    it('does not contain "Blog" in desktop navigation or mobile drawer links', () => {
      // In JSX nav links
      expect(navbarContent).not.toMatch(/>\s*Blog\s*</)
      expect(navbarContent).not.toMatch(/href=["']\/blog["']/)
    })

    it('retains "How it works", "Pricing", "FAQ", "About", and Country selector', () => {
      expect(navbarContent).toMatch(/How it works/i)
      expect(navbarContent).toMatch(/Pricing/i)
      expect(navbarContent).toMatch(/FAQ/i)
      expect(navbarContent).toMatch(/About/i)
      // Country flag switcher
      expect(navbarContent).toMatch(/handleToggleCountry/)
      expect(navbarContent).toMatch(/CaFlagSvg/)
      expect(navbarContent).toMatch(/UsFlagSvg/)
    })

    it('preserves desktop and mobile responsive drawer implementations', () => {
      expect(navbarContent).toMatch(/mobileMenuOpen/)
      expect(navbarContent).toMatch(/id="mobmenu"/)
      expect(navbarContent).toMatch(/aria-label="Menu"/)
    })
  })

  describe('Footer.tsx', () => {
    const footerContent = readSource('src/components/layout/Footer.tsx')

    it('provides accessible Blog links in both Canada and US footers', () => {
      // Ensure there are at least 2 Blog links in the footer (one for CA, one for US)
      const blogMatches = footerContent.match(/href=["']\/blog["']/g) || []
      expect(blogMatches.length).toBeGreaterThanOrEqual(2)
      expect(footerContent).toMatch(/>\s*Blog\s*<\/Link>/)
    })
  })

  describe('Flow Pages & Sub-navbars consistency', () => {
    const reportSales = readSource('src/components/report/ReportSalesPage.tsx')
    const reportUpload = readSource('src/components/report/ReportUploadPage.tsx')
    const paidReady = readSource('src/components/report/PaidReportReadyPage.tsx')
    const caFlow = readSource('src/app/questions/CanadaFlow.tsx')
    const usFlow = readSource('src/app/questions/USFlow.tsx')

    it('ReportSalesPage top nav does not contain "Get the app" or "Blog"', () => {
      expect(reportSales).not.toMatch(/triggerGetApp/)
      // Check nav section specifically
      const navSection = reportSales.substring(reportSales.indexOf('<nav'), reportSales.indexOf('</nav>'))
      expect(navSection).not.toMatch(/Blog/)
      expect(navSection).not.toMatch(/Get the app/)
    })

    it('ReportUploadPage top nav does not contain "Get the app" or "Blog"', () => {
      const navSection = reportUpload.substring(reportUpload.indexOf('<nav'), reportUpload.indexOf('</nav>'))
      expect(navSection).not.toMatch(/Blog/)
      expect(navSection).not.toMatch(/Get the app/)
    })

    it('PaidReportReadyPage top nav does not contain "Get the app" or "Blog"', () => {
      const navSection = paidReady.substring(paidReady.indexOf('<nav'), paidReady.indexOf('</nav>'))
      expect(navSection).not.toMatch(/Blog/)
      expect(navSection).not.toMatch(/Get the app/)
    })

    it('CanadaFlow and USFlow top nav bars do not contain "Get the app" or "Blog"', () => {
      const caNav = caFlow.substring(caFlow.indexOf('aria-label="Site"'), caFlow.indexOf('aria-label="Site"') + 500)
      expect(caNav).not.toMatch(/Blog/)
      expect(caNav).not.toMatch(/Get the app/)

      const usNav = usFlow.substring(usFlow.indexOf('{/* Desktop Nav */}'), usFlow.indexOf('{/* Desktop Nav */}') + 500)
      expect(usNav).not.toMatch(/Blog/)
      expect(usNav).not.toMatch(/Get the app/)
    })
  })

  describe('Accessibility functionality preservation', () => {
    it('AccessibilityDialog and FloatingActions are intact', () => {
      const floatingActions = readSource('src/components/landing/FloatingActions.tsx')
      const accessibilityDialog = readSource('src/components/accessibility/AccessibilityDialog.tsx')

      expect(floatingActions).toMatch(/aria-label="Accessibility options"/)
      expect(accessibilityDialog).toMatch(/ACCESSIBILITY/)
    })
  })
})
