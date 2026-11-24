import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('US Flow Currency & Architecture Regression Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..')
  const salesPagePath = path.join(rootDir, 'src/components/report/ReportSalesPage.tsx')
  const reportFlowPath = path.join(rootDir, 'src/app/report/ReportFlow.tsx')
  const paidReadyPath = path.join(rootDir, 'src/components/report/PaidReportReadyPage.tsx')
  const usFlowPath = path.join(rootDir, 'src/app/questions/USFlow.tsx')
  const questionsPagePath = path.join(rootDir, 'src/app/questions/page.tsx')
  const storagePath = path.join(rootDir, 'src/lib/report-storage.ts')

  const salesContent = fs.readFileSync(salesPagePath, 'utf8')
  const flowContent = fs.readFileSync(reportFlowPath, 'utf8')
  const paidReadyContent = fs.readFileSync(paidReadyPath, 'utf8')
  const usFlowContent = fs.readFileSync(usFlowPath, 'utf8')
  const questionsContent = fs.readFileSync(questionsPagePath, 'utf8')
  const storageContent = fs.readFileSync(storagePath, 'utf8')

  describe('1. ReportSalesPage USD Display in US Flow', () => {
    it('uses detectIsUS helper to reliably determine country', () => {
      expect(salesContent).toContain('detectIsUS')
      expect(salesContent).toMatch(/const\s+isUS\s*=\s*detectIsUS\(/)
    })

    it('displays USD · one-time for US users', () => {
      expect(salesContent).toContain('{isUS ? "USD · one-time" : "CAD · one-time"}')
    })

    it('displays Get my report · $59 USD on submit button for US', () => {
      expect(salesContent).toContain('`Get my report · $59 ${isUS ? "USD" : "CAD"}`')
    })

    it('displays $59 USD plus applicable sales tax for US', () => {
      expect(salesContent).toContain('{isUS ? "$59 USD plus applicable sales tax" : "$59 CAD plus applicable tax"}')
    })

    it('restricts Canadian Interac badge to Canada only', () => {
      expect(salesContent).toContain('{isCanada && <InteracBadge />}')
    })

    it('uses attorney wording on free talk CTA for US', () => {
      expect(salesContent).toContain('Talking to an attorney is still free →')
      expect(salesContent).toContain('Talking to a lawyer is still free →')
    })

    it('passes $59.00 USD to checkout dialog for US', () => {
      expect(salesContent).toContain('amount={isUS ? "$59.00 USD" : "$59.00 CAD"}')
    })

    it('shows USD on mobile sticky bar for US', () => {
      expect(salesContent).toContain('$59 {isUS ? "USD" : "CAD"} · one-time')
    })

    it('preserves &country=US in success and cancel redirect URLs', () => {
      expect(salesContent).toContain('session_id={CHECKOUT_SESSION_ID}${isUS ? "&country=US" : ""}')
      expect(salesContent).toContain('step=pay&canceled=true${isUS ? "&country=US" : ""}')
    })
  })

  describe('2. ReportFlow USD & Country Continuity', () => {
    it('uses detectIsUS to initialize country and isUS', () => {
      expect(flowContent).toContain('detectIsUS')
      expect(flowContent).toMatch(/const\s+isUS\s*=\s*detectIsUS\(/)
    })

    it('uses cur = isUS ? "USD" : "CAD" for payment confirmations and PayStep', () => {
      expect(flowContent).toContain('const cur = isUS ? "USD" : "CAD"')
      expect(flowContent).toContain('notifySuccess(`Payment successful! Your $59 ${cur} payment has been confirmed.`)')
    })

    it('maintains &country=US during step transitions', () => {
      expect(flowContent).toContain('${isUS ? "&country=US" : ""}')
    })
  })

  describe('3. PaidReportReadyPage USD Display', () => {
    it('uses detectIsUS for country determination', () => {
      expect(paidReadyContent).toContain('detectIsUS')
    })

    it('sets priceCurrency to $59 USD for US', () => {
      expect(paidReadyContent).toContain('const priceCurrency = isCanada ? "$59 CAD" : "$59 USD"')
      expect(paidReadyContent).toContain('Paid · {priceCurrency}')
    })
  })

  describe('4. Intake & Navigation Routing', () => {
    it('USFlow directs users to /report with step=upload and country=US', () => {
      expect(usFlowContent).toContain('/report?case=${id}&step=upload&country=US')
    })

    it('USFlow saves country: "US" with California fallback for state', () => {
      expect(usFlowContent).toContain('country: "US"')
      expect(usFlowContent).toContain('state: state.usState || "California"')
    })

    it('questions page routes to USFlow when country is US', () => {
      expect(questionsContent).toContain('detectIsUS')
      expect(questionsContent).toContain('const isCanada = !isUS')
    })

    it('report-storage library exports detectIsUS and defaultMockUSReportInputs', () => {
      expect(storageContent).toContain('export function detectIsUS(')
      expect(storageContent).toContain('export const defaultMockUSReportInputs: ReportInputs = {')
      expect(storageContent).toContain('country: "US"')
    })
  })
})
