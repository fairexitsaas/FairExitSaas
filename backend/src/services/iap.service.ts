/**
 * In-app purchase verification (no SDKs).
 * iOS: StoreKit 2 transactionId -> App Store Server API "Get Transaction Info" (JWT ES256).
 * Android: purchaseToken -> Android Publisher purchases.products.get (service-account JWT RS256),
 *          then acknowledge. The app consumes the (consumable) product after we answer 200.
 */
import crypto from 'crypto'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const pem = (k: string) => k.replace(/\\n/g, '\n')

function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, key: string, alg: 'ES256' | 'RS256') {
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = alg === 'ES256'
    ? crypto.sign('sha256', Buffer.from(data), { key: pem(key), dsaEncoding: 'ieee-p1363' })
    : crypto.sign('sha256', Buffer.from(data), pem(key))
  return `${data}.${b64url(sig)}`
}

function decodeJws<T = any>(jws: string): T {
  const part = jws.split('.')[1]
  if (!part) throw new Error('Bad JWS')
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T
}

export const iapService = {
  async verifyApple(transactionId: string) {
    const { APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID } = env
    if (!APPLE_ISSUER_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY || !APPLE_BUNDLE_ID) throw ApiError.internal('Apple IAP is not configured (APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID)')
    const now = Math.floor(Date.now() / 1000)
    const jwt = signJwt({ alg: 'ES256', kid: APPLE_KEY_ID, typ: 'JWT' }, { iss: APPLE_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1', bid: APPLE_BUNDLE_ID }, APPLE_PRIVATE_KEY, 'ES256')
    const host = env.APPLE_ENVIRONMENT === 'production' ? 'https://api.storekit.itunes.apple.com' : 'https://api.storekit-sandbox.itunes.apple.com'
    const res = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, { headers: { authorization: `Bearer ${jwt}` } })
    if (res.status === 404) throw ApiError.badRequest('Apple does not know this transaction')
    if (!res.ok) throw new ApiError(502, `App Store Server API ${res.status}`)
    const body = (await res.json()) as { signedTransactionInfo: string }
    const tx = decodeJws<{ transactionId: string; bundleId: string; productId: string; revocationDate?: number; price?: number; currency?: string; environment?: string }>(body.signedTransactionInfo)
    if (tx.bundleId !== APPLE_BUNDLE_ID) throw ApiError.badRequest('Transaction is for another app')
    if (tx.productId !== env.APPLE_IAP_PRODUCT_ID) throw ApiError.badRequest('Transaction is for another product')
    if (tx.revocationDate) throw ApiError.badRequest('This purchase was refunded or revoked')
    // StoreKit 2 price is in milli-units of the currency
    return { ref: tx.transactionId, amountCents: tx.price != null ? Math.round(tx.price / 10) : null, currency: tx.currency || null, raw: { environment: tx.environment, productId: tx.productId } }
  },

  async googleAccessToken() {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = env
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) throw ApiError.internal('Google Play is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)')
    const now = Math.floor(Date.now() / 1000)
    const assertion = signJwt({ alg: 'RS256', typ: 'JWT' }, { iss: GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, 'RS256')
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
    })
    if (!res.ok) throw new ApiError(502, `Google OAuth ${res.status}`)
    return ((await res.json()) as { access_token: string }).access_token
  },

  async verifyGoogle(purchaseToken: string, productId = env.GOOGLE_IAP_PRODUCT_ID) {
    if (!env.GOOGLE_PACKAGE_NAME) throw ApiError.internal('GOOGLE_PACKAGE_NAME is not set')
    if (productId !== env.GOOGLE_IAP_PRODUCT_ID) throw ApiError.badRequest('Purchase is for another product')
    const token = await this.googleAccessToken()
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(env.GOOGLE_PACKAGE_NAME)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`
    const res = await fetch(base, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new ApiError(res.status === 404 || res.status === 400 ? 400 : 502, `Google Play rejected this purchase (${res.status})`)
    const p = (await res.json()) as { purchaseState: number; acknowledgementState: number; orderId?: string; regionCode?: string }
    if (p.purchaseState !== 0) throw ApiError.badRequest('Purchase is not complete (pending or cancelled)')
    if (p.acknowledgementState === 0) {
      await fetch(`${base}:acknowledge`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: '{}' }).catch(() => undefined)
    }
    return { ref: p.orderId || purchaseToken, amountCents: null, currency: null, raw: { regionCode: p.regionCode, productId } }
  },
}
