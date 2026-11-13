import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { db } from '../../src/config/db'

describe('Terms & Conditions Acceptance and Consent Recording', () => {
  let testCaseId: string
  let testCaseToken: string

  afterAll(async () => {
    if (testCaseId) {
      try {
        await db().from('cases').delete().eq('id', testCaseId)
      } catch {
        // ignore cleanup errors
      }
    }
  })

  it('creates a test case via POST /api/v1/documents slot creation', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .send({
        kind: 'letter',
        fileName: 'terms-test-letter.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 50,
        country: 'CA',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.caseId).toBeDefined()
    expect(res.body.data.caseToken).toBeDefined()

    testCaseId = res.body.data.caseId
    testCaseToken = res.body.data.caseToken
  })

  it('rejects POST /checkout/prepare when termsAccepted is missing or false', async () => {
    const res1 = await request(app)
      .post(`/api/v1/cases/${testCaseId}/checkout/prepare`)
      .set('X-Case-Token', testCaseToken)
      .send({
        email: 'user@example.com',
      })

    expect(res1.status).toBe(422)
    expect(res1.body.success).toBe(false)
    expect(res1.body.errors?.some((e: any) => e.field === 'termsAccepted')).toBe(true)

    const res2 = await request(app)
      .post(`/api/v1/cases/${testCaseId}/checkout/prepare`)
      .set('X-Case-Token', testCaseToken)
      .send({
        email: 'user@example.com',
        termsAccepted: false,
      })

    expect(res2.status).toBe(422)
    expect(res2.body.success).toBe(false)
    expect(res2.body.errors?.some((e: any) => e.field === 'termsAccepted')).toBe(true)
  })

  it('succeeds on POST /checkout/prepare when termsAccepted is true and records consent', async () => {
    const consentVer = '2026-09-21'
    const userEmail = 'confirmed-terms-buyer@example.com'

    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/checkout/prepare`)
      .set('X-Case-Token', testCaseToken)
      .send({
        email: userEmail,
        termsAccepted: true,
        consentVersion: consentVer,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('pending_payment')

    // Verify consent record in database
    const { data: caseRow } = await db()
      .from('cases')
      .select('id, status, consent, email')
      .eq('id', testCaseId)
      .single()

    expect(caseRow).toBeDefined()
    expect(caseRow?.status).toBe('pending_payment')
    expect(caseRow?.email).toBe(userEmail)
    expect(caseRow?.consent).toBeDefined()
    expect(caseRow?.consent.version).toBe(consentVer)
    expect(caseRow?.consent.source).toBe('report-checkout')
    expect(caseRow?.consent.at).toBeDefined()
  })
})
