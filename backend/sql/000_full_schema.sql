-- ============================================================================
-- FairExit Complete Schema Migration
-- Includes:
--   1. Profiles table, admin/user role separation, RLS policies, auth triggers
--   2. Core FairExit tables: cases, case_documents, ai_calls, payments, lawyers,
--      leads, recovery_codes, devices, RLS policies, and private storage buckets.
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PART 1: PROFILES & ROLES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  country TEXT DEFAULT 'US' CHECK (country IN ('CA', 'US')),
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'ADMIN');
$$;

CREATE OR REPLACE FUNCTION public.current_role_of(uid UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.current_role_of(id));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'USER');

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, country, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    CASE WHEN UPPER(COALESCE(new.raw_user_meta_data->>'country', '')) IN ('CA', 'US') THEN UPPER(new.raw_user_meta_data->>'country') ELSE 'US' END,
    CASE WHEN UPPER(COALESCE(new.raw_app_meta_data->>'role', '')) = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_role_to_auth()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
   WHERE id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_auth();

CREATE OR REPLACE FUNCTION public.set_user_role(user_email TEXT, new_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF UPPER(new_role) NOT IN ('ADMIN', 'USER') THEN
    RAISE EXCEPTION 'role must be ADMIN or USER';
  END IF;
  UPDATE public.profiles SET role = UPPER(new_role), updated_at = timezone('utc'::text, now())
   WHERE LOWER(email) = LOWER(user_email);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'No profile with email % (the person must sign up first)', user_email;
  END IF;
  RETURN user_email || ' is now ' || UPPER(new_role);
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_role(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

INSERT INTO public.profiles (id, email, full_name, phone, country, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'phone', ''),
  CASE WHEN UPPER(COALESCE(raw_user_meta_data->>'country', '')) IN ('CA', 'US') THEN UPPER(raw_user_meta_data->>'country') ELSE 'US' END,
  CASE WHEN UPPER(COALESCE(raw_app_meta_data->>'role', '')) = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- PART 2: FAIREXIT CORE (CASES, DOCUMENTS, CALLS, PAYMENTS, LEADS, LAWYERS)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.fx_user_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.fx_request_seq START 1;

CREATE OR REPLACE FUNCTION public.fx_random_code(n int) RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  FROM generate_series(1, n);
$$;

CREATE TABLE IF NOT EXISTS public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE NOT NULL DEFAULT ('FX-' || lpad(nextval('public.fx_user_seq')::text, 4, '0')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token_hashes text[] NOT NULL DEFAULT '{}',
  platform text NOT NULL DEFAULT 'web' CHECK (platform in ('web', 'ios', 'android')),

  country text NOT NULL CHECK (country in ('CA', 'US')),
  jurisdiction_code text,
  jurisdiction jsonb,
  covered boolean NOT NULL DEFAULT false,
  industry text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  free_result jsonb,

  status text NOT NULL DEFAULT 'free_check' CHECK (status in (
    'free_check', 'pending_payment', 'paid', 'reading', 'checking', 'building', 'ready', 'failed')),
  status_detail text,
  job_started_at timestamptz,

  email text,
  consent jsonb,
  remind boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  payment_provider text CHECK (payment_provider in ('stripe', 'apple', 'google', 'mock')),
  amount_cents int,
  currency text,

  contract_status text CHECK (contract_status in ('added', 'never', 'missing')),
  call_a jsonb,
  call_a_at timestamptz,
  check_state jsonb NOT NULL DEFAULT '{"rows":{},"attested":false,"attested_at":null}'::jsonb,
  attested_at timestamptz,

  report_id text UNIQUE,
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

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_user ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_email ON public.cases(lower(email));
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created ON public.cases(created_at desc);
CREATE INDEX IF NOT EXISTS idx_cases_docs_delete ON public.cases(docs_delete_after) WHERE docs_deleted_at is null;
CREATE INDEX IF NOT EXISTS idx_cases_report_delete ON public.cases(report_delete_after);

CREATE TABLE IF NOT EXISTS public.case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind in ('letter', 'contract')),
  page int NOT NULL DEFAULT 1,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes int,
  original_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status in ('pending', 'uploaded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_case_documents_case ON public.case_documents(case_id);

CREATE TABLE IF NOT EXISTS public.ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  call text NOT NULL CHECK (call in ('A', 'A2', 'B')),
  model text,
  status text NOT NULL CHECK (status in ('ok', 'error')),
  input_tokens int,
  output_tokens int,
  duration_ms int,
  error text,
  output jsonb,
  prompt_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_calls_case ON public.ai_calls(case_id, call, created_at desc);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider in ('stripe', 'apple', 'google', 'mock')),
  provider_ref text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status in ('pending', 'paid', 'refunded', 'failed')),
  amount_cents int,
  currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_ref)
);
CREATE INDEX IF NOT EXISTS idx_payments_case ON public.payments(case_id);

CREATE TABLE IF NOT EXISTS public.lawyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  firm text,
  contact_name text,
  address text,
  jurisdiction_code text NOT NULL,
  country text NOT NULL CHECK (country in ('CA', 'US')),
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status in ('active', 'paused', 'inactive')),
  agreement_signed_on date,
  monthly_max int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lawyers_jurisdiction ON public.lawyers(jurisdiction_code, status);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text UNIQUE NOT NULL DEFAULT ('REQ-' || lpad(nextval('public.fx_request_seq')::text, 4, '0')),
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  name text,
  email text,
  phone text,
  best_time text,
  country text NOT NULL CHECK (country in ('CA', 'US')),
  jurisdiction_code text,
  region_name text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_text text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  platform text NOT NULL DEFAULT 'web' CHECK (platform in ('web', 'ios', 'android')),
  status text NOT NULL DEFAULT 'new' CHECK (status in ('new', 'sent', 'call_happened', 'retained', 'closed_no_response')),
  lawyer_id uuid REFERENCES public.lawyers(id) ON DELETE SET NULL,
  sent_at timestamptz,
  sent_how text,
  sent_by text,
  notes text,
  closed_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status, created_at desc);
CREATE INDEX IF NOT EXISTS idx_leads_case ON public.leads(case_id);

CREATE TABLE IF NOT EXISTS public.recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recovery_email ON public.recovery_codes(lower(email), created_at desc);

CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform in ('ios', 'android', 'web')),
  push_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fx_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN new.updated_at = now(); return new; end $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY array['cases', 'payments', 'lawyers', 'leads', 'devices'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.fx_touch_updated_at()', t);
  END LOOP;
END $$;

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fairexit-documents', 'fairexit-documents', false), ('fairexit-reports', 'fairexit-reports', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Grants on public schema to Supabase API roles
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

