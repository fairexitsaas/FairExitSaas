import { describe, it, expect } from 'vitest'
import { CALL_A_KEYS, getPromptHash, getCallASystemPrompt } from '../../src/prompts/call-a.prompt'
import { callAOutputSchema } from '../../src/validators/document.validator'
import { mockCallA } from '../../src/fairexit/mocks'
import { buildJurisdiction } from '../../src/fairexit/jurisdictions'

describe('Claude Call A Prompt and Extraction Unit Tests', () => {
  it('verifies Call A prompt file integrity and SHA-256 hash', () => {
    const hash = getPromptHash()
    expect(hash).toBe('e914ac5878fa8ad1a26d1ca4058edad0aa1cb9d1c70a0bd5cf483849311b7724')
  })

  it('verifies that Call A prompt replaces jurisdiction words correctly', () => {
    const ontario = buildJurisdiction('CA-ON')
    const promptCA = getCallASystemPrompt(ontario)
    expect(promptCA).toContain('severance letter')
    expect(promptCA).toContain('employment contract')

    const georgia = buildJurisdiction('US-GA')
    const promptUS = getCallASystemPrompt(georgia)
    expect(promptUS).toContain('separation agreement')
    expect(promptUS).toContain('offer letter or employment contract')
  })

  it('contains all 26 required Call A extraction keys', () => {
    expect(CALL_A_KEYS).toContain('offer_amount')
    expect(CALL_A_KEYS).toContain('notice_weeks')
    expect(CALL_A_KEYS).toContain('severance_weeks')
    expect(CALL_A_KEYS).toContain('last_day')
    expect(CALL_A_KEYS).toContain('sign_by')
    expect(CALL_A_KEYS).toContain('benefits_end')
    expect(CALL_A_KEYS).toContain('release_required')
    expect(CALL_A_KEYS).toContain('min_only_clause')
    expect(CALL_A_KEYS).toContain('contract_start')
    expect(CALL_A_KEYS).toContain('job_title_contract')
    expect(CALL_A_KEYS).toContain('working_notice_weeks')
    expect(CALL_A_KEYS).toContain('days_to_decide')
    expect(CALL_A_KEYS).toContain('attorney_line')
    expect(CALL_A_KEYS).toContain('non_compete')
    expect(CALL_A_KEYS).toContain('contract_mentioned')
    expect(CALL_A_KEYS.length).toBe(26)
  })

  it('validates a valid Call A JSON response with Zod schema', () => {
    const validResponse = {
      facts: [
        {
          key: 'offer_amount',
          value: '$24,000',
          document: 'letter',
          quote: 'a lump sum of $24,000',
          where: 'page 1, paragraph 2',
          confidence: 'high',
        },
        {
          key: 'release_required',
          value: 'Yes',
          document: 'letter',
          quote: 'in exchange for signing the release',
          where: 'page 2',
          confidence: 'high',
        },
      ],
      missing: ['working_notice_weeks'],
    }

    const result = callAOutputSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.facts.length).toBe(2)
      expect(result.data.missing).toEqual(['working_notice_weeks'])
    }
  })

  it('rejects a malformed Call A output that lacks facts or has invalid document kind', () => {
    const invalidKind = {
      facts: [
        {
          key: 'offer_amount',
          value: '1000',
          document: 'unknown_source', // invalid document kind
        },
      ],
      missing: [],
    }

    const result = callAOutputSchema.safeParse(invalidKind)
    expect(result.success).toBe(false)
  })

  it('confirms Canada mock Call A output validates against schema', () => {
    const j = buildJurisdiction('CA-ON')
    const mockOutput = mockCallA(j, true)
    const result = callAOutputSchema.safeParse(mockOutput)
    expect(result.success).toBe(true)
    expect(mockOutput.facts.some((f) => f.key === 'offer_amount')).toBe(true)
    expect(mockOutput.facts.some((f) => f.key === 'min_only_clause')).toBe(true)
  })

  it('confirms US mock Call A output validates against schema', () => {
    const j = buildJurisdiction('US-GA')
    const mockOutput = mockCallA(j, false)
    const result = callAOutputSchema.safeParse(mockOutput)
    expect(result.success).toBe(true)
    expect(mockOutput.facts.some((f) => f.key === 'offer_amount')).toBe(true)
    expect(mockOutput.facts.some((f) => f.key === 'days_to_decide')).toBe(true)
  })
})

