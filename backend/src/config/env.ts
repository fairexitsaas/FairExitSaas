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
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),
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
