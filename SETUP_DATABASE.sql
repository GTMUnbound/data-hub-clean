-- ============================================================
-- GTM UNBOUND – ONE-CLICK INITIALIZATION
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.lists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID REFERENCES public.lists(id) ON DELETE CASCADE NOT NULL,
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  company      TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',
  city         TEXT NOT NULL DEFAULT '',
  country      TEXT NOT NULL DEFAULT '',
  source       TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id    UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member'))
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_records_list_id  ON public.records(list_id);
CREATE INDEX IF NOT EXISTS idx_records_email    ON public.records(email);
CREATE INDEX IF NOT EXISTS idx_records_tags     ON public.records USING GIN(tags);

-- 3. Duplicate Detection Function
CREATE OR REPLACE FUNCTION public.mark_duplicates(p_list_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.records SET is_duplicate = false WHERE list_id = p_list_id;
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY created_at) AS rn
    FROM public.records WHERE list_id = p_list_id AND email <> ''
  )
  UPDATE public.records r SET is_duplicate = true FROM ranked WHERE r.id = ranked.id AND ranked.rn > 1;
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(full_name), LOWER(company) ORDER BY created_at) AS rn
    FROM public.records WHERE list_id = p_list_id AND full_name <> '' AND company <> '' AND is_duplicate = false
  )
  UPDATE public.records r SET is_duplicate = true FROM ranked WHERE r.id = ranked.id AND ranked.rn > 1;
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.mark_duplicates(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_duplicates(UUID) TO authenticated;

-- 5. Multi-User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT COUNT(*) FROM public.user_roles) = 0 THEN 'admin' ELSE 'member' END);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Disable RLS for "Direct Access" mode (as per local instruction)
ALTER TABLE public.lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
