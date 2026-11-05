/**
 * Production diagnostics. Every line starts with a [TAG] so you can filter in Vercel → Logs.
 *
 *   [BOOT][CONFIG]        once per cold start: platform, limits, which settings/packages exist (never secret values)
 *   [PROCESS][...]        crashes and shutdowns that would otherwise be silent on Vercel
 *   [JOB][START|END|...]  background jobs (Call A, Call B + PDF): duration, waitUntil used or not
 *   [CLAUDE][STREAM_*]    first token, progress every 20 s, and where a stream stopped
 *   [JOB][MARKED_STALE]   why a job was turned into "timed out"
 *   [PDF][...]            which browser was used and why another one failed
 */
import { logger } from './logger'

const BOOT_AT = Date.now()

function has(mod: string): boolean {
  try {
    require.resolve(mod)
    return true
  } catch {
    return false
  }
}

/** Host only, token hidden: "wss://production-sfo.browserless.io?token=***" */
export function maskUrl(u?: string | null): string | null {
  if (!u) return null
  return u.replace(/([?&](token|key|apiKey)=)[^&]+/gi, '$1***')
}

export function configSnapshot() {
  const e = process.env
  const maxDuration = Number(e.FUNCTION_MAX_DURATION_SECONDS || 0) || null
  return {
    platform: e.VERCEL ? 'vercel' : e.AWS_LAMBDA_FUNCTION_NAME ? 'lambda' : 'server',
    vercelEnv: e.VERCEL_ENV || null,
    region: e.VERCEL_REGION || e.AWS_REGION || null,
    commit: (e.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    node: process.version,
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    uptimeS: Math.round((Date.now() - BOOT_AT) / 1000),
    nodeEnv: e.NODE_ENV,
    ai: {
      mode: e.AI_MODE || 'live',
      model: e.ANTHROPIC_MODEL || null,
      keySet: !!e.ANTHROPIC_API_KEY,
      callAMaxTokens: e.CALL_A_MAX_TOKENS || 'default',
      callBMaxTokens: e.CALL_B_MAX_TOKENS || 'default',
    },
    jobs: {
      staleMinutes: Number(e.JOB_STALE_MINUTES) || 12,
      waitUntilInstalled: has('@vercel/functions'),
      cronSecretSet: !!e.CRON_SECRET,
      maxDurationHintS: maxDuration,
    },
    pdf: {
      forced: e.PDF_BROWSER || null,
      remoteEndpoint: maskUrl(e.PDF_BROWSER_WS_ENDPOINT),
      puppeteerCore: has('puppeteer-core'),
      sparticuz: has('@sparticuz/chromium'),
      playwright: has('playwright'),
    },
    payments: { mode: e.PAYMENTS_MODE || 'mock', stripeKeySet: !!e.STRIPE_SECRET_KEY, webhookSecretSet: !!e.STRIPE_WEBHOOK_SECRET },
    supabase: { urlSet: !!(e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL), serviceRoleSet: !!e.SUPABASE_SERVICE_ROLE_KEY },
  }
}

/** Problems you can see from the settings alone. */
export function configWarnings(c = configSnapshot()): string[] {
  const w: string[] = []
  if (c.platform === 'vercel' && !c.jobs.waitUntilInstalled) w.push('@vercel/functions is not installed: Vercel will stop Call B right after the response (reports "time out")')
  if (c.ai.mode === 'live' && !c.ai.keySet) w.push('ANTHROPIC_API_KEY is not set')
  if (!c.supabase.serviceRoleSet) w.push('SUPABASE_SERVICE_ROLE_KEY is not set')
  if (c.platform === 'vercel' && !c.pdf.remoteEndpoint && !c.pdf.sparticuz) w.push('No PDF browser for Vercel: set PDF_BROWSER_WS_ENDPOINT (Browserless) or install @sparticuz/chromium')
  if (c.pdf.remoteEndpoint && !c.pdf.puppeteerCore) w.push('PDF_BROWSER_WS_ENDPOINT is set but puppeteer-core is not installed')
  if (c.platform === 'vercel' && !c.jobs.cronSecretSet) w.push('CRON_SECRET is not set: daily cleanup/reminder cron will be rejected')
  if (c.jobs.staleMinutes < 6) w.push(`JOB_STALE_MINUTES=${c.jobs.staleMinutes} is shorter than a real report (2-5 min): live jobs will be marked "timed out"`)
  if (c.payments.mode === 'live' && (!c.payments.stripeKeySet || !c.payments.webhookSecretSet)) w.push('PAYMENTS_MODE=live but a Stripe key or webhook secret is missing')
  return w
}

let booted = false
export function logBootOnce() {
  if (booted) return
  booted = true
  const c = configSnapshot()
  logger.info('[BOOT][CONFIG]', c)
  for (const w of configWarnings(c)) logger.warn('[BOOT][CONFIG_WARNING]', { warning: w })

  // api/index.ts (Vercel) never runs server.ts, so catch silent failures here too
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('[PROCESS][UNHANDLED_REJECTION]', { message: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : undefined })
  })
  process.on('uncaughtExceptionMonitor', (err: Error) => {
    logger.error('[PROCESS][UNCAUGHT_EXCEPTION]', { message: err.message, stack: err.stack })
  })
  process.on('SIGTERM', () => {
    logger.warn('[PROCESS][SIGTERM] Platform is stopping this instance; running jobs will be cut off', { uptimeS: Math.round((Date.now() - BOOT_AT) / 1000), memoryMb: Math.round(process.memoryUsage().rss / 1048576) })
  })
}

/** Seconds since this instance started (helps spot a cold start in the middle of a job). */
export function instanceAgeS() {
  return Math.round((Date.now() - BOOT_AT) / 1000)
}
