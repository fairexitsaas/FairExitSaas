/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FairExit API client for the web app (same contract as backend/docs/API.md).
 * Case tokens are kept in localStorage (no account needed).
 */
import { sanitizeErrorMessage } from '@/lib/notifications'

export type Country = 'CA' | 'US'
export type Platform = 'web' | 'ios' | 'android'

export class FairExitApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Array<{ field?: string; message?: string; code?: string }>,
    public retryAfterSeconds?: number,
    public requestId?: string,
    public stage?: string,
  ) {
    super(message)
    this.name = 'FairExitApiError'
  }
}

export interface FairExitClientOptions {
  baseUrl: string // e.g. process.env.NEXT_PUBLIC_API_URL ("http://localhost:8000/api/v1")
  platform?: Platform
  getCaseToken?: (caseId: string) => string | null | undefined
  getAccessToken?: () => string | null | undefined // Supabase session, optional
}

export function createFairExitClient(opts: FairExitClientOptions) {
  const base = opts.baseUrl.replace(/\/$/, '')

  async function call<T>(
    method: string,
    path: string,
    body?: unknown,
    caseId?: string,
    signal?: AbortSignal,
    stage?: string,
  ): Promise<T> {
    const headers: Record<string, string> = { 'X-Platform': opts.platform || 'web' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const ct = caseId && opts.getCaseToken?.(caseId)
    if (ct) headers['X-Case-Token'] = ct
    const at = opts.getAccessToken?.()
    if (at) headers.Authorization = `Bearer ${at}`

    let res: Response
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal,
      })
    } catch (fetchErr: any) {
      if (fetchErr?.name === 'AbortError') {
        throw fetchErr
      }
      const rawMsg = fetchErr?.message || 'Network request failed'
      const isOffline = rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Load failed')
      throw new FairExitApiError(
        0,
        isOffline
          ? 'Unable to connect to FairExit servers. Please check your internet connection.'
          : sanitizeErrorMessage(rawMsg),
        undefined,
        undefined,
        undefined,
        stage,
      )
    }

    const headerReqId = res.headers.get('x-request-id') || undefined
    const json = await res.json().catch(() => ({}))
    const requestId = json.requestId || headerReqId

    if (!res.ok || json.success === false) {
      const headerRetryAfter = Number(res.headers.get('retry-after'))
      const bodyRetryAfter = Number(json.retryAfterSeconds)
      const retryAfterSeconds =
        Number.isFinite(headerRetryAfter) && headerRetryAfter > 0
          ? headerRetryAfter
          : bodyRetryAfter > 0
          ? bodyRetryAfter
          : undefined

      let safeMessage = json.message ? sanitizeErrorMessage(json.message) : res.statusText || 'Request failed'
      if (res.status === 401) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'Session expired or invalid. Please sign in to continue.'
      } else if (res.status === 403) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'You do not have access to this case or feature.'
      } else if (res.status === 404) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'The requested case or file was not found.'
      } else if (res.status === 422) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'Some required information is incomplete or invalid.'
      } else if (res.status === 429) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'Too many requests. Please wait a moment before trying again.'
      } else if (res.status >= 500) {
        safeMessage = json.message ? sanitizeErrorMessage(json.message) : 'A temporary server error occurred. Please try again.'
      }

      throw new FairExitApiError(
        res.status,
        safeMessage,
        json.errors,
        retryAfterSeconds,
        requestId,
        stage,
      )
    }
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
      call<{ caseId: string; caseToken: string; case: any }>('POST', '/cases', { country, answers, industry, platform: opts.platform || 'web' }, undefined, undefined, 'Case Creation'),
    getCase: (id: string, signal?: AbortSignal) => call<any>('GET', c(id), undefined, id, signal, 'Case Retrieval'),
    updateAnswers: (id: string, answers: Record<string, unknown>) => call<any>('PATCH', `${c(id)}/answers`, { answers }, id, undefined, 'Update Answers'),
    claimCase: (id: string) => call<any>('POST', `${c(id)}/claim`, {}, id, undefined, 'Claim Case'),
    deleteCase: (id: string) => call<any>('DELETE', c(id), undefined, id, undefined, 'Delete Case'),

    // lawyer request
    askLawyer: (body: { caseId?: string; country?: Country; jurisdictionCode?: string; name: string; email: string; phone: string; bestTime?: string; consent: true }) =>
      call<any>('POST', '/leads', { ...body, platform: opts.platform || 'web' }, body.caseId, undefined, 'Lawyer Consultation Request'),

    // payment
    price: (id: string) => call<any>('GET', `${c(id)}/price`, undefined, id, undefined, 'Price Check'),
    prepareCheckout: (id: string, body: { email: string; remind?: boolean; termsAccepted: true }) => call<any>('POST', `${c(id)}/checkout/prepare`, body, id, undefined, 'Prepare Checkout'),
    stripeCheckout: (id: string, body: { successUrl?: string; cancelUrl?: string; mode?: 'checkout' | 'payment_intent' } = {}) =>
      call<{ url?: string; sessionId?: string; clientSecret?: string }>('POST', `${c(id)}/checkout/stripe`, body, id, undefined, 'Stripe Checkout'),
    stripeConfirm: (id: string, body: { sessionId?: string; paymentIntentId?: string }) => call<{ paid: boolean; case: any }>('POST', `${c(id)}/checkout/stripe/confirm`, body, id, undefined, 'Payment Confirmation'),
    applePurchase: (id: string, transactionId: string) => call<any>('POST', `${c(id)}/checkout/apple`, { transactionId }, id, undefined, 'Apple In-App Purchase'),
    googlePurchase: (id: string, purchaseToken: string, productId?: string) => call<any>('POST', `${c(id)}/checkout/google`, { purchaseToken, productId }, id, undefined, 'Google Play Purchase'),
    mockPay: (id: string) => call<any>('POST', `${c(id)}/checkout/mock`, {}, id, undefined, 'Payment'),

    // documents
    documents: (id: string) => call<any>('GET', `${c(id)}/documents`, undefined, id, undefined, 'Document Retrieval'),
    /** Direct upload with base64 fallback. */
    async uploadFile(id: string, kind: 'letter' | 'contract', file: Blob & { name?: string; type: string }) {
      try {
        const slot = await call<any>('POST', `${c(id)}/documents/upload-url`, { kind, fileName: file.name, mimeType: file.type, sizeBytes: file.size }, id, undefined, 'Document Upload')
        const put = await fetch(slot.upload.url, { method: 'PUT', headers: slot.upload.headers, body: file })
        if (put.ok) {
          return await call<any>('POST', `${c(id)}/documents/${slot.document.id}/complete`, {}, id, undefined, 'Document Upload')
        }
      } catch (err) {
        console.warn('Direct upload slot failed, falling back to base64 upload:', err)
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async () => {
          try {
            const dataBase64 = String(reader.result)
            const res = await call<any>('POST', `${c(id)}/documents`, { kind, fileName: file.name, mimeType: file.type, dataBase64 }, id, undefined, 'Document Upload')
            resolve(res)
          } catch (e) {
            reject(e)
          }
        }
        reader.onerror = () => reject(new FairExitApiError(0, 'Failed to read file for upload', undefined, undefined, undefined, 'Document Upload'))
        reader.readAsDataURL(file)
      })
    },
    updateDocumentKind: (id: string, docId: string, kind: 'letter' | 'contract') => call<any>('PATCH', `${c(id)}/documents/${docId}`, { kind }, id, undefined, 'Update Document'),
    removeDocument: (id: string, docId: string) => call<any>('DELETE', `${c(id)}/documents/${docId}`, undefined, id, undefined, 'Remove Document'),
    setContractStatus: (id: string, status: 'never' | 'missing') => call<any>('PUT', `${c(id)}/contract-status`, { status }, id, undefined, 'Contract Status'),

    // facts & review
    getExtractedFacts: (id: string) => call<{ facts: any[]; missing: string[]; count: number }>('GET', `/documents/${id}/extracted-facts`, undefined, id, undefined, 'Facts Review'),
    getReviewData: (id: string) => call<any>('GET', `/documents/${id}/review`, undefined, id, undefined, 'Review Data'),
    saveReviewData: (id: string, payload: { key?: string; value?: unknown; action?: string; agreed?: boolean; corrections?: Record<string, unknown> }) =>
      call<any>('PUT', `/documents/${id}/review`, payload, id, undefined, 'Save Review'),

    // AI read
    startRead: (id: string) => call<any>('POST', `${c(id)}/read`, {}, id, undefined, 'Document Reading'),
    readStatus: (id: string, signal?: AbortSignal) => call<any>('GET', `${c(id)}/read`, undefined, id, signal, 'Document Reading Status'),

    // check page
    checkPage: (id: string) => call<any>('GET', `${c(id)}/check`, undefined, id, undefined, 'Check Page'),
    rowAction: (id: string, key: string, action: string, extra: { value?: unknown; agreed?: boolean } = {}) =>
      call<{ row: string; secondLook: any; page: any }>('POST', `${c(id)}/check/rows/${key}`, { action, ...extra }, id, undefined, 'Check Action'),
    resolveConflict: (id: string, key: string, choice: 'document' | 'answers' | 'other' | 'not_sure', value?: unknown) =>
      call<any>('POST', `${c(id)}/check/conflicts/${key}`, { choice, value }, id, undefined, 'Resolve Conflict'),
    attest: (id: string) => call<any>('POST', `${c(id)}/check/attest`, { agreed: true }, id, undefined, 'Check Attestation'),

    // report
    buildReport: (id: string) => call<any>('POST', `${c(id)}/report`, {}, id, undefined, 'Report Generation'),
    reportStatus: (id: string, signal?: AbortSignal) => call<any>('GET', `${c(id)}/report/status`, undefined, id, signal, 'Report Generation Status'),
    report: (id: string) => call<any>('GET', `${c(id)}/report`, undefined, id, undefined, 'Report Retrieval'),
    /** Link usable in <a href> / WebView (token in the query string). */
    reportPdfUrl: (id: string, token: string) => `${base}${c(id)}/report/pdf?t=${encodeURIComponent(token)}`,
    reportHtmlUrl: (id: string, token: string) => `${base}${c(id)}/report/html?t=${encodeURIComponent(token)}`,

    // deadlines
    deadlines: (id: string) => call<any>('GET', `${c(id)}/deadlines`, undefined, id, undefined, 'Deadlines'),
    setReminders: (id: string, email: boolean) => call<any>('PUT', `${c(id)}/reminders`, { email }, id, undefined, 'Reminders'),
    registerDevice: (id: string, platform: Platform, pushToken: string) => call<any>('POST', `${c(id)}/devices`, { platform, pushToken }, id, undefined, 'Register Device'),

    // recovery
    recoverStart: (email: string, orderNumber?: string) => call<any>('POST', '/recover/start', { email, orderNumber }, undefined, undefined, 'Recovery Start'),
    recoverVerify: (email: string, code: string, orderNumber?: string) => call<{ cases: any[] }>('POST', '/recover/verify', { email, code, orderNumber }, undefined, undefined, 'Recovery Verify'),

    /** Polls until reading/building is over (every 3 s). */
    async waitFor(id: string, until: (status: string) => boolean, timeoutMs = 6 * 60_000) {
      const end = Date.now() + timeoutMs
      for (;;) {
        const cs = await call<any>('GET', c(id), undefined, id, undefined, 'Status Wait')
        if (until(cs.status) || cs.status === 'failed') return cs
        if (Date.now() > end) throw new FairExitApiError(408, 'Timed out waiting for process to finish', undefined, undefined, undefined, 'Status Wait')
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

export const FAIREXIT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
