-- ===========================================================================
-- FairExit Phase 1: Document Processing, Analysis Runs & Fact Management
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- analysis_runs: records each Claude Call A extraction execution
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  document_ids uuid[] default '{}',
  call_version text not null default 'v0.6',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  duration_ms int,
  raw_response jsonb,
  normalized_json jsonb,
  error_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_runs_case on public.analysis_runs(case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- extracted_facts: the immutable original facts returned by Claude Call A
-- ---------------------------------------------------------------------------
create table if not exists public.extracted_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete cascade,
  fact_key text not null,
  value text,
  document_kind text check (document_kind in ('letter', 'contract', 'agreement')),
  quote text,
  where_location text,
  confidence text check (confidence in ('high', 'low')),
  created_at timestamptz not null default now()
);

create index if not exists idx_extracted_facts_case on public.extracted_facts(case_id, fact_key);

-- ---------------------------------------------------------------------------
-- corrected_facts: user-reviewed & corrected facts (saved independently)
-- ---------------------------------------------------------------------------
create table if not exists public.corrected_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.cases(id) on delete cascade,
  fact_key text not null,
  user_value jsonb not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'corrected', 'not_in_docs', 'not_sure')),
  change_ack boolean not null default false,
  change_ack_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, fact_key)
);

create index if not exists idx_corrected_facts_case on public.corrected_facts(case_id);

-- Enable Row Level Security (RLS)
alter table public.analysis_runs enable row level security;
alter table public.extracted_facts enable row level security;
alter table public.corrected_facts enable row level security;

