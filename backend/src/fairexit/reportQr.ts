import QRCode from 'qrcode'
import { env } from '../config/env'

const DEFAULT_SITE_ORIGIN = 'https://fairexit.io'

/**
 * Resolves the canonical public web origin used in QR destinations.
 * Defaults to https://fairexit.io per Round 2 QR specification.
 */
export function getQrSiteOrigin(): string {
  const configured = String(env.APP_WEB_URL || '').trim().replace(/\/$/, '')
  if (!configured || /localhost|127\.0\.0\.1/i.test(configured)) {
    return DEFAULT_SITE_ORIGIN
  }
  return configured
}

/**
 * Builds the QR destination URL for a specific report ID:
 *   https://fairexit.io/r/[actual-report-id]
 */
export function reportLawyerUrl(reportId: string): string {
  const id = String(reportId ?? '').trim()
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(id)) {
    throw new Error(`Invalid report id for QR URL: "${reportId}"`)
  }
  return `${getQrSiteOrigin()}/r/${encodeURIComponent(id)}`
}

/**
 * Synchronously builds a crisp inline vector SVG QR code encoding the dynamic report URL.
 * Used inside PDF/HTML report rendering so every report receives its own QR code.
 */
export function reportQrSvg(reportId: string, sizePx = 76): string {
  const url = reportLawyerUrl(reportId)
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const count = qr.modules.size
  const margin = 2
  const viewSize = count + margin * 2
  const cells: string[] = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.modules.get(r, c)) {
        cells.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1"/>`)
      }
    }
  }
  const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="QR code for ${safeUrl}" data-qr-url="${safeUrl}"><rect width="${viewSize}" height="${viewSize}" fill="#ffffff"/><g fill="#062C55">${cells.join('')}</g></svg>`
}

/**
 * Generates a PNG data URL QR code for client/web usage.
 */
export async function reportQrDataUrl(reportId: string): Promise<string> {
  return QRCode.toDataURL(reportLawyerUrl(reportId), {
    margin: 1,
    width: 360,
    errorCorrectionLevel: 'M',
  })
}
