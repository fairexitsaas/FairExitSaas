/**
 * AI_MODE=mock: canned Claude outputs so web/iOS/Android can build the whole flow without an API
 * key. Values follow the prototype's sample documents (Ontario letter + contract, California
 * agreement). Never used when AI_MODE=live.
 */
import type { CallAOutput, CallA2Output } from './types'
import type { Jurisdiction } from './jurisdictions'

export function mockCallA(j: Jurisdiction, hasContract: boolean): CallAOutput {
  if (j.country === 'US') {
    return {
      facts: [
        { key: 'offer_amount', value: '$22,154', document: 'agreement', quote: 'a severance payment of $22,154, equal to about 9 weeks of your base pay', where: 'page 1, section 2', confidence: 'high' },
        { key: 'release_required', value: 'Yes', document: 'agreement', quote: 'In exchange for the severance payment, you release the Company from all claims', where: 'page 2, section 4', confidence: 'high' },
        { key: 'days_to_decide', value: '14 days', document: 'agreement', quote: 'You have fourteen (14) days to consider this Agreement', where: 'page 2, section 6', confidence: 'high' },
        { key: 'take_back', value: 'not mentioned', document: 'agreement', quote: null, where: 'page 2, section 6', confidence: 'high' },
        { key: 'attorney_line', value: 'not mentioned', document: 'agreement', quote: null, where: 'page 2', confidence: 'high' },
        { key: 'age_list', value: 'missing', document: 'agreement', quote: null, where: 'page 3', confidence: 'high' },
        { key: 'non_compete', value: 'No', document: 'agreement', quote: null, where: 'all pages', confidence: 'high' },
        { key: 'advance_notice', value: '12 days', document: 'agreement', quote: "This Agreement confirms you received 12 days' notice before your layoff date", where: 'page 1, section 1', confidence: 'high' },
      ],
      missing: ['last_day', 'final_pay_date', 'unused_vacation_payout'],
    }
  }
  const facts: CallAOutput['facts'] = [
    { key: 'offer_amount', value: '$24,000', document: 'letter', quote: 'a lump sum of $24,000, less required deductions', where: 'page 1, paragraph 2', confidence: 'high' },
    { key: 'notice_weeks', value: '8 weeks', document: 'letter', quote: 'equal to 8 weeks of your base salary, in place of notice', where: 'page 1, paragraph 2', confidence: 'high' },
    { key: 'vacation_on_notice', value: 'not mentioned', document: 'letter', quote: null, where: 'page 1', confidence: 'high' },
    { key: 'last_day', value: 'October 31, 2026', document: 'letter', quote: 'your employment will end effective October 31, 2026', where: 'page 1, paragraph 1', confidence: 'high' },
    { key: 'sign_by', value: '14 days from your last day', document: 'letter', quote: 'this offer remains open for 14 days from your last day', where: 'page 2, last paragraph', confidence: 'high' },
    { key: 'release_required', value: 'Yes, a full and final release', document: 'letter', quote: 'you agree to sign a full and final release of all claims', where: 'page 2, last paragraph', confidence: 'high' },
    { key: 'benefits_end', value: 'October 31, 2026', document: 'letter', quote: 'your group benefits will end on October 31, 2026', where: 'page 1, paragraph 3', confidence: 'high' },
  ]
  if (hasContract) {
    facts.push(
      { key: 'min_only_clause', value: 'Yes', document: 'contract', quote: '...you will receive only the minimum required by the ESA...', where: 'section 8', confidence: 'high' },
      { key: 'contract_start', value: 'March 4, 2013', document: 'contract', quote: 'your employment will begin on March 4, 2013', where: 'page 1', confidence: 'high' },
      { key: 'job_title_contract', value: 'Senior Analyst', document: 'contract', quote: 'the position of Senior Analyst', where: 'page 1', confidence: 'high' },
    )
  }
  return { facts, missing: ['working_notice_weeks', 'bonus_amount'] }
}

export function mockCallA2(input: { person_value: unknown; first_reading: { value: unknown; quote: string | null; where: string | null } }): CallA2Output {
  return {
    found_value: input.first_reading.value == null ? null : String(input.first_reading.value),
    quote: input.first_reading.quote,
    where: input.first_reading.where,
    matches_person: false,
    confidence: 'high',
  }
}

export function mockCallB(input: Record<string, any>) {
  const j = input.jurisdiction as Jurisdiction
  const rows = input.confirmed_facts?.rows || {}
  const ids: string[] = (input.sources || []).map((s: any) => s.id)
  const first = ids[0] || null
  const date = String(input.confirmed_facts?.attested_at || new Date().toISOString()).slice(0, 10)
  const longDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const role = rows.role?.value || rows.job_title_contract?.value || 'Your role'
  const years = rows.years?.value
  return {
    cover: { role_line: `${role} · ${years ?? '?'} years of service`, place_line: j.name },
    glance: `[MOCK REPORT] This is sample text so the app can be built without the AI. A real report reads your confirmed details for ${j.name}.`,
    ...(input.contract !== 'added' ? { contract_note: '[MOCK] Your contract was not added.' } : {}),
    confirmed_line: `Built on the details you confirmed on ${longDate}.`,
    checks: [
      { topic: 'Money offered', letter_says: rows.offer_amount ? String(rows.offer_amount.value) : 'Not found', contract_says: '', rule_says: j.country === 'CA' ? `${j.statute_short} minimum: ${input.minimum?.weeks ?? '?'} weeks` : 'No legal minimum in the US', status: 'info', why: '[MOCK] Sample row.', source_id: first, from_answers: false },
    ],
    ...(j.country === 'CA'
      ? { factors: { service: 0.6, age: 0.5, job_level: 0.5, similar_jobs: 0.5, reasons: { service: '[MOCK]', age: '[MOCK]', job_level: '[MOCK]', similar_jobs: '[MOCK]' } } }
      : { release_check: [{ status: 'ask', point: '[MOCK] Time to decide', detail: '[MOCK] Sample release check.', source_id: first }] }),
    myths: [],
    clauses: [],
    questions: ['[MOCK] Can you confirm the offer amount in writing?'],
    next_steps: ['[MOCK] Read your report.'],
    citations_used: first ? [first] : [],
  }
}
