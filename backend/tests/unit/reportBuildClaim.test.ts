import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbState = vi.hoisted(() => ({ status: 'checking' as string }))

vi.mock('../../src/config/db', () => ({
  db: () => ({
    from: () => {
      let allowedStatuses: string[] = []
      const query: any = {
        update: () => query,
        eq: () => query,
        in: (_column: string, values: string[]) => { allowedStatuses = values; return query },
        select: () => query,
        maybeSingle: async () => {
          if (!allowedStatuses.includes(dbState.status)) return { data: null, error: null }
          dbState.status = 'building'
          return { data: { id: 'case-1', status: dbState.status }, error: null }
        },
      }
      return query
    },
  }),
  check: (result: any) => result.data,
}))

import { caseService } from '../../src/services/case.service'

describe('database-backed report build claim', () => {
  beforeEach(() => { dbState.status = 'checking' })

  it('allows only one concurrent claimant for a case', async () => {
    const patch = { status: 'building' as const, report_id: 'RPT-ONE' }
    const claims = await Promise.all([
      caseService.claimBuild('case-1', patch),
      caseService.claimBuild('case-1', patch),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(dbState.status).toBe('building')
  })
})
