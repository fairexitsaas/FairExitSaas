import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'

// Attempt loading from backend/.env, process.cwd()/.env, or root .env
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
]

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
  }
}

// Support standard Supabase and NEXT_PUBLIC naming conventions seamlessly
const rawSupabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const rawSupabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  FRONTEND_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional(),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),
  READ_RATE_LIMIT_MAX: z
    .string()
    .default('600')
    .transform((val) => parseInt(val, 10)),
  WRITE_RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),

  // ---------------------------------------------------------------------------
  // FairExit Phase 1 (severance report flow)
  // ---------------------------------------------------------------------------
  /** Public web app URL used in emails ("private link back to your report"). */
  APP_WEB_URL: z.string().url().default('http://localhost:3000'),

  // Claude (prompt v0.6: Opus only, JSON only)
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
  CALL_A_MAX_TOKENS: z.string().default('24000').transform((v) => parseInt(v, 10)),
  CALL_A2_MAX_TOKENS: z.string().default('2000').transform((v) => parseInt(v, 10)),
  CALL_B_MAX_TOKENS: z.string().default('32000').transform((v) => parseInt(v, 10)),
  /** "live" calls Claude. "mock" returns canned JSON (local dev / CI without a key). */
  AI_MODE: z.enum(['live', 'mock']).default('live'),

  // Storage (Supabase Storage buckets, private)
  DOCUMENTS_BUCKET: z.string().default('fairexit-documents'),
  REPORTS_BUCKET: z.string().default('fairexit-reports'),
  MAX_UPLOAD_MB: z.string().default('15').transform((v) => parseInt(v, 10)),

  // Payments: $59 one-time (CAD in Canada, USD in the US), plus applicable tax
  PAYMENTS_MODE: z.enum(['live', 'mock']).default('mock'),
  REPORT_PRICE_CENTS: z.string().default('5900').transform((v) => parseInt(v, 10)),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_AUTOMATIC_TAX: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Apple In-App Purchase (App Store Server API)
  APPLE_IAP_PRODUCT_ID: z.string().default('fairexit.severance_report'),
  APPLE_BUNDLE_ID: z.string().optional(),
  APPLE_ISSUER_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  APPLE_ENVIRONMENT: z.enum(['production', 'sandbox']).default('sandbox'),
  // Google Play Billing (Android Publisher API)
  GOOGLE_IAP_PRODUCT_ID: z.string().default('fairexit.severance_report'),
  GOOGLE_PACKAGE_NAME: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),

  // Email (Resend HTTP API). Without a key, emails are logged instead of sent.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('FairExit <reports@fairexit.io>'),
  OPS_EMAIL: z.string().optional(),

  // Jobs and retention (Notes for Phase 1, item 4)
  CRON_SECRET: z.string().optional(),
  RETENTION_DOCS_DAYS: z.string().default('30').transform((v) => parseInt(v, 10)),
  RETENTION_REPORT_MONTHS: z.string().default('12').transform((v) => parseInt(v, 10)),
  RETENTION_LEADS_MONTHS: z.string().default('12').transform((v) => parseInt(v, 10)),
  RUN_JOBS_IN_PROCESS: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),

  // Abuse limits ("Too many scans today")
  READS_PER_CASE_PER_DAY: z.string().default('5').transform((v) => parseInt(v, 10)),
  SECOND_LOOKS_PER_CASE_PER_DAY: z.string().default('30').transform((v) => parseInt(v, 10)),
  BUILDS_PER_CASE_PER_DAY: z.string().default('3').transform((v) => parseInt(v, 10)),
})

const parsed = envSchema.safeParse({
  ...process.env,
  SUPABASE_URL: rawSupabaseUrl,
  SUPABASE_ANON_KEY: rawSupabaseAnonKey,
})

if (!parsed.success) {
  const formattedErrors = parsed.error.issues
    .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  console.error(`\n❌ Backend configuration validation failed:\n${formattedErrors}\n`)
  process.exit(1)
}

export const env = parsed.data
