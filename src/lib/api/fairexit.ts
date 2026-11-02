/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FairExit API client for the web app (same contract as backend/docs/API.md).
 * Case tokens are kept in localStorage (no account needed).
 */
export type Country = 'CA' | 'US'
export type Platform = 'web' | 'ios' | 'android'

export class FairExitApiError extends Error {
  constructor(public status: number, message: string, public errors?: Array<{ field?: string; message?: string; code?: string }>) {
    super(message)
  }
}

export interface FairExitClientOptions {
  baseUrl: string // e.g. process.env.NEXT_PUBLIC_API_URL ("http://localhost:5000/api/v1")
  platform?: Platform
  getCaseToken?: (caseId: string) => string | null | undefined
  getAccessToken?: () => string | null | undefined // Supabase session, optional
}

export function createFairExitClient(opts: FairExitClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '')

  async function call<T>(method: string, path: string, body?: unknown, caseId?: string): Promise<T> {
    const headers: Record<string, string> = { 'X-Platform': opts.platform || 'web' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const ct = caseId && opts.getCaseToken?.(caseId)
    if (ct) headers['X-Case-Token'] = ct
    const at = opts.getAccessToken?.()
    if (at) headers.Authorization = `Bearer ${at}`
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.success === false) throw new FairExitApiError(res.status, json.message || res.statusText, json.errors)
    return json.data as T
  }
  const c = (id: string) => `/cases/${id}`

  return {
    // reference
    config: () => call<any>('GET', '/config'),
    jurisdictions: (country?: Country) => call<any[]>('GET', `/jurisdictions${country ? `?country=${country}` : ''}`),
    jurisdiction: (code: string) => call<any>('GET', `/jurisdictions/${encodeURIComponent(code)}`),
    estimate: (country: Country, answers: Record<string, unknown>) => call<any>('POST', '/rules/estimate', { country, answers }),

    // case
    createCase: (country: Country, answers: Record<string, unknown>, industry?: string) =>
      call<{ caseId: string; caseToken: string; case: any }>('POST', '/cases', { country, answers, industry, platform: opts.platform || 'web' }),
    getCase: (id: string) => call<any>('GET', c(id), undefined, id),
    updateAnswers: (id: string, answers: Record<string, unknown>) => call<any>('PATCH', `${c(id)}/answers`, { answers }, id),
    claimCase: (id: string) => call<any>('POST', `${c(id)}/claim`, {}, id),
    deleteCase: (id: string) => call<any>('DELETE', c(id), undefined, id),

    // lawyer request
    askLawyer: (body: { caseId?: string; country?: Country; jurisdictionCode?: string; name: string; email: string; phone: string; bestTime?: string; consent: true }) =>
      call<any>('POST', '/leads', { ...body, platform: opts.platform || 'web' }, body.caseId),

    // payment
    price: (id: string) => call<any>('GET', `${c(id)}/price`, undefined, id),
    prepareCheckout: (id: string, body: { email: string; remind?: boolean; termsAccepted: true }) => call<any>('POST', `${c(id)}/checkout/prepare`, body, id),
    stripeCheckout: (id: string, body: { successUrl?: string; cancelUrl?: string; mode?: 'checkout' | 'payment_intent' } = {}) =>
      call<{ url?: string; sessionId?: string; clientSecret?: string }>('POST', `${c(id)}/checkout/stripe`, body, id),
    stripeConfirm: (id: string, body: { sessionId?: string; paymentIntentId?: string }) => call<{ paid: boolean; case: any }>('POST', `${c(id)}/checkout/stripe/confirm`, body, id),
    applePurchase: (id: string, transactionId: string) => call<any>('POST', `${c(id)}/checkout/apple`, { transactionId }, id),
    googlePurchase: (id: string, purchaseToken: string, productId?: string) => call<any>('POST', `${c(id)}/checkout/google`, { purchaseToken, productId }, id),
    mockPay: (id: string) => call<any>('POST', `${c(id)}/checkout/mock`, {}, id),

    // documents
    documents: (id: string) => call<any>('GET', `${c(id)}/documents`, undefined, id),
    /** Direct upload: slot -> PUT -> complete. */
    async uploadFile(id: string, kind: 'letter' | 'contract', file: Blob & { name?: string; type: string }) {
      const slot = await call<any>('POST', `${c(id)}/documents/upload-url`, { kind, fileName: file.name, mimeType: file.type, sizeBytes: file.size }, id)
      const put = await fetch(slot.upload.url, { method: 'PUT', headers: slot.upload.headers, body: file })
      if (!put.ok) throw new FairExitApiError(put.status, 'Upload failed')
      return call<any>('POST', `${c(id)}/documents/${slot.document.id}/complete`, {}, id)
    },
    removeDocument: (id: string, docId: string) => call<any>('DELETE', `${c(id)}/documents/${docId}`, undefined, id),
    setContractStatus: (id: string, status: 'never' | 'missing') => call<any>('PUT', `${c(id)}/contract-status`, { status }, id),

    // AI read
    startRead: (id: string) => call<any>('POST', `${c(id)}/read`, {}, id),
    readStatus: (id: string) => call<any>('GET', `${c(id)}/read`, undefined, id),

    // check page
    checkPage: (id: string) => call<any>('GET', `${c(id)}/check`, undefined, id),
    rowAction: (id: string, key: string, action: string, extra: { value?: unknown; agreed?: boolean } = {}) =>
      call<{ row: string; secondLook: any; page: any }>('POST', `${c(id)}/check/rows/${key}`, { action, ...extra }, id),
    resolveConflict: (id: string, key: string, choice: 'document' | 'answers' | 'other' | 'not_sure', value?: unknown) =>
      call<any>('POST', `${c(id)}/check/conflicts/${key}`, { choice, value }, id),
    attest: (id: string) => call<any>('POST', `${c(id)}/check/attest`, { agreed: true }, id),

    // report
    buildReport: (id: string) => call<any>('POST', `${c(id)}/report`, {}, id),
    reportStatus: (id: string) => call<any>('GET', `${c(id)}/report/status`, undefined, id),
    report: (id: string) => call<any>('GET', `${c(id)}/report`, undefined, id),
    /** Link usable in <a href> / WebView (token in the query string). */
    reportPdfUrl: (id: string, token: string) => `${base}${c(id)}/report/pdf?t=${encodeURIComponent(token)}`,
    reportHtmlUrl: (id: string, token: string) => `${base}${c(id)}/report/html?t=${encodeURIComponent(token)}`,

    // deadlines
    deadlines: (id: string) => call<any>('GET', `${c(id)}/deadlines`, undefined, id),
    setReminders: (id: string, email: boolean) => call<any>('PUT', `${c(id)}/reminders`, { email }, id),
    registerDevice: (id: string, platform: Platform, pushToken: string) => call<any>('POST', `${c(id)}/devices`, { platform, pushToken }, id),

    // recovery
    recoverStart: (email: string, orderNumber?: string) => call<any>('POST', '/recover/start', { email, orderNumber }),
    recoverVerify: (email: string, code: string, orderNumber?: string) => call<{ cases: any[] }>('POST', '/recover/verify', { email, code, orderNumber }),

    /** Polls until reading/building is over (every 3 s). */
    async waitFor(id: string, until: (status: string) => boolean, timeoutMs = 6 * 60_000) {
      const end = Date.now() + timeoutMs
      for (;;) {
        const cs = await call<any>('GET', c(id), undefined, id)
        if (until(cs.status) || cs.status === 'failed') return cs
        if (Date.now() > end) throw new FairExitApiError(408, 'Timed out waiting')
        await new Promise((r) => setTimeout(r, 3000))
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Web helpers: one shared client + case token storage
// ---------------------------------------------------------------------------
const TOKENS_KEY = 'fx_case_tokens_v1'
const LAST_KEY = 'fx_last_case_v1'

function readTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}')
  } catch {
    return {}
  }
}

export const caseStore = {
  get(caseId: string): string | null {
    return readTokens()[caseId] || null
  },
  set(caseId: string, token: string) {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [caseId]: token }))
      localStorage.setItem(LAST_KEY, caseId)
    } catch {
      /* private mode: token lives only in memory for this tab */
    }
  },
  last(): string | null {
    try {
      return localStorage.getItem(LAST_KEY)
    } catch {
      return null
    }
  },
}

export const FAIREXIT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

export const fairexit = createFairExitClient({
  baseUrl: FAIREXIT_API_URL,
  platform: 'web',
  getCaseToken: (id) => (typeof window === 'undefined' ? null : caseStore.get(id)),
})

/** Free-check state from CanadaFlow / USFlow -> API answers (field names are kept as they are). */
export function answersFromFlowState(state: Record<string, unknown>): Record<string, unknown> {
  const { agreed, ...rest } = state
  void agreed
  return rest
}

/** Called from the free check results: saves the case and remembers its token. */
export async function saveFreeCheck(country: Country, state: Record<string, unknown>): Promise<string> {
  const r = await fairexit.createCase(country, answersFromFlowState(state))
  caseStore.set(r.caseId, r.caseToken)
  return r.caseId
}
