-- FairExit Phase 1 core schema: free check -> pay $59 -> upload -> AI reads (Call A)
-- -> check page (+ second look, Call A2) -> build report (Call B) -> ready (PDF).
-- Plus lawyer requests ("Ask a lawyer to contact me"), the lawyers list, and ops data.
--
-- Every table has RLS ON and NO policies: only the backend (service-role key) reads/writes.
-- Clients never talk to these tables directly; they go through /api/v1.
-- Safe to re-run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Public, human-friendly IDs used by the ops dashboard: FX-0420, REQ-0029, RPT-7Q4K2M
-- ---------------------------------------------------------------------------
create sequence if not exists public.fx_user_seq start 1;
create sequence if not exists public.fx_request_seq start 1;

create or replace function public.fx_random_code(n int) returns text
language sql volatile as $$
  select string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, n);
$$;

-- ---------------------------------------------------------------------------
-- cases: one person's journey (free check through report). Anonymous by default;
-- access is by a secret case token (only its SHA-256 is stored) or by the signed-in owner.
-- ---------------------------------------------------------------------------
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default ('FX-' || lpad(nextval('public.fx_user_seq')::text, 4, '0')),
  user_id uuid references auth.users(id) on delete set null,
  token_hashes text[] not null default '{}',
  platform text not null default 'web' check (platform in ('web', 'ios', 'android')),

  country text not null check (country in ('CA', 'US')),
  jurisdiction_code text,
  jurisdiction jsonb,
  covered boolean not null default false,
  industry text,
  answers jsonb not null default '{}'::jsonb,
  free_result jsonb,

  status text not null default 'free_check' check (status in (
    'free_check', 'pending_payment', 'paid', 'reading', 'checking', 'building', 'ready', 'failed')),
  status_detail text,
  job_started_at timestamptz,

  email text,
  consent jsonb,
  remind boolean not null default false,
  paid_at timestamptz,
  payment_provider text check (payment_provider in ('stripe', 'apple', 'google', 'mock')),
  amount_cents int,
  currency text,

  contract_status text check (contract_status in ('added', 'never', 'missing')),
  call_a jsonb,
  call_a_at timestamptz,
  check_state jsonb not null default '{"rows":{},"attested":false,"attested_at":null}'::jsonb,
  attested_at timestamptz,

  report_id text unique,
  report jsonb,
  report_inputs jsonb,
  report_ready_at timestamptz,
  report_pdf_path text,

  docs_delete_after timestamptz,
  docs_deleted_at timestamptz,
  report_delete_after timestamptz,

  rules_version text,
  prompt_version text,
  prompt_sha256 text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cases_user on public.cases(user_id);
create index if not exists idx_cases_email on public.cases(lower(email));
create index if not exists idx_cases_status on public.cases(status);
create index if not exists idx_cases_created on public.cases(created_at desc);
create index if not exists idx_cases_docs_delete on public.cases(docs_delete_after) where docs_deleted_at is null;
create index if not exists idx_cases_report_delete on public.cases(report_delete_after);

-- ---------------------------------------------------------------------------
-- case_documents: only two kinds (spec v2 round 2): the severance letter / separation agreement
-- and the employment contract. A scanned document may have several pages (one file per page).
-- ---------------------------------------------------------------------------
create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  kind text not null check (kind in ('letter', 'contract')),
  page int not null default 1,
  storage_path text not null,
  mime_type text not null,
  size_bytes int,
  original_name text,
  status text not null default 'pending' check (status in ('pending', 'uploaded')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_case_documents_case on public.case_documents(case_id);

-- ---------------------------------------------------------------------------
-- ai_calls: one row per Claude call (A, A2, B) for cost tracking and "failed build" triage.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  call text not null check (call in ('A', 'A2', 'B')),
  model text,
  status text not null check (status in ('ok', 'error')),
  input_tokens int,
  output_tokens int,
  duration_ms int,
  error text,
  output jsonb,
  prompt_sha256 text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_calls_case on public.ai_calls(case_id, call, created_at desc);

-- ---------------------------------------------------------------------------
-- payments: Stripe (web), Apple In-App Purchase (iOS), Google Play Billing (Android), mock (dev).
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'apple', 'google', 'mock')),
  provider_ref text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  amount_cents int,
  currency text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index if not exists idx_payments_case on public.payments(case_id);

-- ---------------------------------------------------------------------------
-- lawyers: kept by hand by the ops team (no lawyer logins in phase 1).
-- ---------------------------------------------------------------------------
create table if not exists public.lawyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  firm text,
  contact_name text,
  address text,
  jurisdiction_code text not null,
  country text not null check (country in ('CA', 'US')),
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  agreement_signed_on date,
  monthly_max int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lawyers_jurisdiction on public.lawyers(jurisdiction_code, status);

-- ---------------------------------------------------------------------------
-- leads: "Ask a lawyer to contact me". The team routes each one by hand.
-- Only name, email, phone, region and a summary of answers are ever shared; never documents.
-- Contact details are deleted 12 months after the request closes.
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default ('REQ-' || lpad(nextval('public.fx_request_seq')::text, 4, '0')),
  case_id uuid references public.cases(id) on delete set null,
  name text,
  email text,
  phone text,
  best_time text,
  country text not null check (country in ('CA', 'US')),
  jurisdiction_code text,
  region_name text,
  summary jsonb not null default '{}'::jsonb,
  consent_text text not null,
  consent_at timestamptz not null default now(),
  platform text not null default 'web' check (platform in ('web', 'ios', 'android')),
  status text not null default 'new' check (status in ('new', 'sent', 'call_happened', 'retained', 'closed_no_response')),
  lawyer_id uuid references public.lawyers(id) on delete set null,
  sent_at timestamptz,
  sent_how text,
  sent_by text,
  notes text,
  closed_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_status on public.leads(status, created_at desc);
create index if not exists idx_leads_case on public.leads(case_id);

-- ---------------------------------------------------------------------------
-- recovery_codes: "Bring your report in" (email I paid with -> 6-digit code).
-- ---------------------------------------------------------------------------
create table if not exists public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_recovery_email on public.recovery_codes(lower(email), created_at desc);

-- ---------------------------------------------------------------------------
-- devices: push tokens for "Deadlines & reminders" (APNs / FCM).
-- ---------------------------------------------------------------------------
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.fx_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['cases', 'payments', 'lawyers', 'leads', 'devices'] loop
    execute format('drop trigger if exists trg_%1$s_touch on public.%1$s', t);
    execute format('create trigger trg_%1$s_touch before update on public.%1$s for each row execute function public.fx_touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS on, no policies: service role only.
-- ---------------------------------------------------------------------------
alter table public.cases enable row level security;
alter table public.case_documents enable row level security;
alter table public.ai_calls enable row level security;
alter table public.payments enable row level security;
alter table public.lawyers enable row level security;
alter table public.leads enable row level security;
alter table public.recovery_codes enable row level security;
alter table public.devices enable row level security;

-- ---------------------------------------------------------------------------
-- Private storage buckets (documents are deleted 30 days after the report is ready).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fairexit-documents', 'fairexit-documents', false), ('fairexit-reports', 'fairexit-reports', false)
on conflict (id) do nothing;
