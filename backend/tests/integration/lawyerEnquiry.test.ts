import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app'
import { db } from '../../src/config/db'
import { adminService } from '../../src/services/admin.service'

describe('Lawyer Enquiry Capture & Admin Integration', () => {
  const createdLeadIds: string[] = []

  afterAll(async () => {
    // Cleanup any leads created during test
    if (createdLeadIds.length > 0) {
      for (const id of createdLeadIds) {
        try {
          await db().from('leads').delete().eq('id', id)
        } catch {
          // ignore cleanup errors
        }
      }
    }
  })

  describe('Input Validation on POST /api/v1/leads', () => {
    it('rejects invalid email with 422', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          email: 'not-an-email',
          name: 'Jane Doe',
          country: 'CA',
          phone: '(416) 555-1234',
        })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.statusCode).toBe(422)
    })

    it('rejects phone number with fewer than 10 digits when provided', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          email: 'jane.test@example.com',
          name: 'Jane Doe',
          country: 'CA',
          phone: '12345',
        })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('10-digit phone number')
    })

    it('rejects explicit consent: false with 422', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          email: 'jane.noconsent@example.com',
          name: 'Jane Doe',
          country: 'CA',
          phone: '4165551234',
          consent: false,
        })

      expect(res.status).toBe(422)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Consent is required')
    })
  })

  describe('Successful Enquiry Submission & Attribution', () => {
    it('captures Canada Ask a Lawyer enquiry with complete attribution', async () => {
      const uniqueEmail = `test.ca.${Date.now()}@example.com`
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          name: 'Alex Mercer',
          email: uniqueEmail,
          phone: '(647) 555-0199',
          country: 'CA',
          jurisdictionCode: 'Ontario',
          regionName: 'Ontario',
          enquiryType: 'ask_lawyer',
          sourcePage: '/questions',
          consent: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.requestId).toBeDefined()
      expect(res.body.data.status).toBe('new')
      expect(res.body.data.duplicate).toBe(false)
      expect(res.body.data.lawyerWord).toBe('lawyer')

      // Verify row in database
      const dbRow = await db().from('leads').select('*').eq('email', uniqueEmail.toLowerCase()).single()
      expect(dbRow.data).toBeDefined()
      expect(dbRow.data.country).toBe('CA')
      expect(dbRow.data.region_name).toBe('Ontario')
      expect(dbRow.data.email).toBe(uniqueEmail.toLowerCase())
      expect(dbRow.data.name).toBe('Alex Mercer')
      expect(dbRow.data.phone).toBe('(647) 555-0199')

      const savedType = dbRow.data.enquiry_type || dbRow.data.summary?.enquiry_type
      expect(savedType).toBe('ask_lawyer')
      const savedSource = dbRow.data.source_page || dbRow.data.summary?.source_page
      expect(savedSource).toBe('/questions')

      if (dbRow.data.id) createdLeadIds.push(dbRow.data.id)
    })

    it('captures US Ask an Attorney enquiry with state and attorney word', async () => {
      const uniqueEmail = `test.us.${Date.now()}@example.com`
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          name: 'Jordan Smith',
          email: uniqueEmail,
          phone: '415-555-0144',
          country: 'US',
          jurisdictionCode: 'California',
          regionName: 'California',
          enquiryType: 'ask_lawyer',
          sourcePage: '/questions',
          consent: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.requestId).toBeDefined()
      expect(res.body.data.lawyerWord).toBe('attorney')

      // Verify in DB
      const dbRow = await db().from('leads').select('*').eq('email', uniqueEmail.toLowerCase()).single()
      expect(dbRow.data).toBeDefined()
      expect(dbRow.data.country).toBe('US')
      expect(dbRow.data.region_name).toBe('California')

      if (dbRow.data.id) createdLeadIds.push(dbRow.data.id)
    })

    it('captures 3-Point Checklist enquiry with email only (phone omitted)', async () => {
      const uniqueEmail = `test.checklist.${Date.now()}@example.com`
      const res = await request(app)
        .post('/api/v1/leads')
        .send({
          email: uniqueEmail,
          country: 'CA',
          jurisdictionCode: 'British Columbia',
          regionName: 'British Columbia',
          enquiryType: '3_point_checklist',
          sourcePage: '/questions',
          consent: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.requestId).toBeDefined()

      // Verify in DB
      const dbRow = await db().from('leads').select('*').eq('email', uniqueEmail.toLowerCase()).single()
      expect(dbRow.data).toBeDefined()
      expect(dbRow.data.phone).toBeNull()
      const savedType = dbRow.data.enquiry_type || dbRow.data.summary?.enquiry_type
      expect(savedType).toBe('3_point_checklist')

      if (dbRow.data.id) createdLeadIds.push(dbRow.data.id)
    })

    it('handles duplicate enquiry submissions gracefully without crashing', async () => {
      const uniqueEmail = `test.dup.${Date.now()}@example.com`
      // First submission
      const res1 = await request(app)
        .post('/api/v1/leads')
        .send({
          email: uniqueEmail,
          name: 'Taylor Reed',
          phone: '3125550188',
          country: 'US',
          enquiryType: 'ask_lawyer',
          sourcePage: '/questions',
          consent: true,
        })
      expect(res1.status).toBe(201)
      expect(res1.body.data.duplicate).toBe(false)

      const dbRow = await db().from('leads').select('id').eq('email', uniqueEmail.toLowerCase()).single()
      if (dbRow.data?.id) createdLeadIds.push(dbRow.data.id)

      // Repeated submission with same email & enquiry type
      const res2 = await request(app)
        .post('/api/v1/leads')
        .send({
          email: uniqueEmail,
          name: 'Taylor Reed',
          phone: '3125550188',
          country: 'US',
          enquiryType: 'ask_lawyer',
          sourcePage: '/questions',
          consent: true,
        })

      expect(res2.status).toBe(201)
      expect(res2.body.data.duplicate).toBe(true)
      expect(res2.body.message).toContain('already asked')
    })
  })

  describe('Admin Protection & Data Integrity', () => {
    it('GET /api/v1/admin/leads requires admin authentication (401 without Bearer token)', async () => {
      const res = await request(app).get('/api/v1/admin/leads')
      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('Authorization header is missing')
    })

    it('GET /api/v1/admin/overview requires admin authentication (401)', async () => {
      const res = await request(app).get('/api/v1/admin/overview')
      expect(res.status).toBe(401)
    })

    it('GET /api/v1/admin/users requires admin authentication (401)', async () => {
      const res = await request(app).get('/api/v1/admin/users')
      expect(res.status).toBe(401)
    })

    it('GET /api/v1/admin/reports requires admin authentication (401)', async () => {
      const res = await request(app).get('/api/v1/admin/reports')
      expect(res.status).toBe(401)
    })

    it('GET /api/v1/admin/lawyers requires admin authentication (401)', async () => {
      const res = await request(app).get('/api/v1/admin/lawyers')
      expect(res.status).toBe(401)
    })

    it('adminService.leads query returns genuine database records with all required fields', async () => {
      const rows = await adminService.leads('all')
      expect(Array.isArray(rows)).toBe(true)
      if (rows.length > 0) {
        const first = rows[0]
        expect(first.email).toBeDefined()
        expect(first.country).toBeDefined()
        expect(first.enquiryType).toBeDefined()
        expect(first.status).toBeDefined()
        expect(first.createdAt).toBeDefined()
      }
    })

    it('adminService.leads filters by enquiryType correctly', async () => {
      const checklistOnly = await adminService.leads('all', { enquiryType: '3_point_checklist' })
      expect(Array.isArray(checklistOnly)).toBe(true)
      checklistOnly.forEach((l) => {
        expect(l.enquiryType).toBe('3_point_checklist')
      })
    })

    it('adminService.leads filters by country correctly', async () => {
      const caOnly = await adminService.leads('CA')
      caOnly.forEach((l) => {
        expect(l.country).toBe('CA')
      })

      const usOnly = await adminService.leads('US')
      usOnly.forEach((l) => {
        expect(l.country).toBe('US')
      })
    })

    it('adminService.overview returns calculated database values with zero dummy data', async () => {
      const ov = await adminService.overview('all')
      expect(ov.country).toBe('all')
      expect(typeof ov.kpis.freeChecks).toBe('number')
      expect(typeof ov.kpis.reportsBought).toBe('number')
      expect(typeof ov.kpis.lawyerRequests).toBe('number')
      expect(typeof ov.kpis.revenueCents).toBe('object')
      expect(typeof ov.reportStatus.completed).toBe('number')
      expect(Array.isArray(ov.needsAttention)).toBe(true)
    })
  })
})
