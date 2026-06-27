-- ============================================================
--  SRMS – Supabase Schema
--  Run this in the Supabase SQL Editor for your project.
--  Tables: srms_users, srms_activity, srms_training,
--           srms_college_profile
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
-- Mirrors the localStorage USERS map keyed by email.
CREATE TABLE IF NOT EXISTS public.srms_users (
  email          TEXT PRIMARY KEY,
  data           JSONB       NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security: anyone with the anon key can read/write
-- (auth is handled by the app itself, not Supabase auth)
ALTER TABLE public.srms_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_srms_users" ON public.srms_users
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.srms_users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.srms_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Activity Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.srms_activity (
  id             TEXT PRIMARY KEY,
  data           JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.srms_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_srms_activity" ON public.srms_activity
  FOR ALL USING (true) WITH CHECK (true);

-- ── Training Content ──────────────────────────────────────────
-- One row per key: 'aptitude' | 'coding' | 'company'
CREATE TABLE IF NOT EXISTS public.srms_training (
  key            TEXT PRIMARY KEY,
  data           JSONB       NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.srms_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_srms_training" ON public.srms_training
  FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_training_updated_at ON public.srms_training;
CREATE TRIGGER trg_training_updated_at
  BEFORE UPDATE ON public.srms_training
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── College Profile ───────────────────────────────────────────
-- Single-row settings table (key = 'profile')
CREATE TABLE IF NOT EXISTS public.srms_college_profile (
  key            TEXT PRIMARY KEY DEFAULT 'profile',
  data           JSONB       NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.srms_college_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_srms_college_profile" ON public.srms_college_profile
  FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_college_updated_at ON public.srms_college_profile;
CREATE TRIGGER trg_college_updated_at
  BEFORE UPDATE ON public.srms_college_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
