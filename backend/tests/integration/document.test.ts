import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app'

describe('Document Processing & Fact Extraction Endpoints (/api/v1/documents)', () => {
  let createdCaseId: string
  let createdCaseToken: string
  let documentId: string

  it('rejects upload with unsupported MIME type with 422', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .send({
        kind: 'letter',
        fileName: 'malicious.exe',
        mimeType: 'application/x-msdownload',
      })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.errors?.some((e: any) => e.field === 'mimeType')).toBe(true)
  })

  it('rejects document exceeding 15MB size limit with 422', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .send({
        kind: 'letter',
        fileName: 'huge.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 16 * 1024 * 1024, // 16 MB > 15 MB
      })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.errors?.some((e: any) => e.field === 'sizeBytes')).toBe(true)
  })

  it('POST /api/v1/documents creates an upload slot for a valid PDF document', async () => {
    const res = await request(app)
      .post('/api/v1/documents')
      .send({
        kind: 'letter',
        fileName: 'severance-letter.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 100,
        country: 'CA',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.document).toBeDefined()
    expect(res.body.data.document.kind).toBe('letter')
    expect(res.body.data.uploadSlot).toBeDefined()
    expect(res.body.data.uploadSlot.url).toBeDefined()
    expect(res.body.data.caseId).toBeDefined()
    expect(res.body.data.caseToken).toBeDefined()

    createdCaseId = res.body.data.caseId
    createdCaseToken = res.body.data.caseToken
    documentId = res.body.data.document.id
  })

  it('POST /api/v1/documents accepts base64 document upload directly', async () => {
    // 1-pixel transparent PNG as test base64
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    const res = await request(app)
      .post('/api/v1/documents')
      .set('X-Case-Token', createdCaseToken)
      .send({
        caseId: createdCaseId,
        kind: 'contract',
        fileName: 'employment-contract.png',
        mimeType: 'image/png',
        dataBase64: sampleBase64,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.document.kind).toBe('contract')
    expect(res.body.data.document.status).toBe('uploaded')
  })

  it('GET /api/v1/documents/:id retrieves document metadata and status', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${documentId}`)
      .set('X-Case-Token', createdCaseToken)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.document.id).toBe(documentId)
    expect(res.body.data.caseId).toBe(createdCaseId)
  })

  it('runs Call A extraction and retrieves original extracted facts', async () => {
    // Process document via POST /api/v1/documents/:id/process
    const processRes = await request(app)
      .post(`/api/v1/documents/${createdCaseId}/process`)
      .set('X-Case-Token', createdCaseToken)

    expect(processRes.status).toBe(200)
    expect(processRes.body.success).toBe(true)
    expect(Array.isArray(processRes.body.data.facts)).toBe(true)

    // Retrieve original extracted facts via /api/v1/documents/:id/extracted-facts
    const factsRes = await request(app)
      .get(`/api/v1/documents/${createdCaseId}/extracted-facts`)
      .set('X-Case-Token', createdCaseToken)

    expect(factsRes.status).toBe(200)
    expect(factsRes.body.success).toBe(true)
    expect(Array.isArray(factsRes.body.data.facts)).toBe(true)
    expect(factsRes.body.data.count).toBeGreaterThan(0)

    // Verify key fields in original extraction
    const facts = factsRes.body.data.facts
    const offerFact = facts.find((f: any) => f.key === 'offer_amount')
    expect(offerFact).toBeDefined()
    expect(offerFact.quote).toBeDefined()
    expect(offerFact.where).toBeDefined()
  }, 30000)

  it('GET /api/v1/documents/:id/review retrieves current review state', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${createdCaseId}/review`)
      .set('X-Case-Token', createdCaseToken)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.originalExtractedFacts).toBeDefined()
    expect(res.body.data.reviewModel).toBeDefined()
  })

  it('PUT /api/v1/documents/:id/review saves user correction without altering original extracted facts', async () => {
    // 1. Get original extracted facts
    const initialFactsRes = await request(app)
      .get(`/api/v1/documents/${createdCaseId}/extracted-facts`)
      .set('X-Case-Token', createdCaseToken)
    const originalOffer = initialFactsRes.body.data.facts.find((f: any) => f.key === 'offer_amount')?.value

    // 2. Submit user correction for offer_amount
    const userCorrectedValue = 35000
    const updateRes = await request(app)
      .put(`/api/v1/documents/${createdCaseId}/review`)
      .set('X-Case-Token', createdCaseToken)
      .send({
        key: 'offer_amount',
        action: 'change',
        value: userCorrectedValue,
      })

    expect(updateRes.status).toBe(200)
    expect(updateRes.body.success).toBe(true)

    // 3. Confirm original extracted fact remains UNCHANGED
    const verifyFactsRes = await request(app)
      .get(`/api/v1/documents/${createdCaseId}/extracted-facts`)
      .set('X-Case-Token', createdCaseToken)
    const verifiedOriginalOffer = verifyFactsRes.body.data.facts.find((f: any) => f.key === 'offer_amount')?.value
    expect(verifiedOriginalOffer).toBe(originalOffer)

    // 4. Confirm user correction is saved independently
    const reviewRes = await request(app)
      .get(`/api/v1/documents/${createdCaseId}/review`)
      .set('X-Case-Token', createdCaseToken)
    expect(reviewRes.body.data.correctedFacts?.offer_amount).toBeDefined()
  })

  it('rejects access to unknown document with 404', async () => {
    const res = await request(app).get('/api/v1/documents/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})
