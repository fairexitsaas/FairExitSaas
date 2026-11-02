-- FairExit Profiles Table Migration
-- Creates the profiles table with ADMIN / USER role separation, RLS policies, and auto-creation trigger.

-- 1. Create profiles table
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

-- 2. Create index on role and email for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Role helpers (SECURITY DEFINER so policies never query profiles under RLS -> no recursion)
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

-- 5. RLS Policies (drop old ones first; safe to re-run)
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

-- A user can edit their own profile but can NEVER change their own role.
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = public.current_role_of(id));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Users may only create their own row, and only as USER.
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'USER');

-- 6. New sign-ups always start as USER.
--    Role is never taken from user_metadata (anyone can set that at sign-up). Only app_metadata
--    (server-side only) or the set_user_role() function below can make an ADMIN.
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

-- 7. Keep the role in the login token: profiles.role -> auth.users.app_metadata.role
--    (so the web/app can read user.app_metadata.role to show or hide the admin dashboard).
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

-- 8. Make someone an admin (or back to user) by email. Run in the Supabase SQL editor or with
--    `npm run set-role -- someone@example.com ADMIN`. Not callable by app users.
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

-- 9. Backfill existing auth users (as USER unless app_metadata already says ADMIN)
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
