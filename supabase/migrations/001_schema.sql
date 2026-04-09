-- ============================================================
-- GTM Unbound – Core Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── LISTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lists: owner full access"
  ON public.lists
  FOR ALL
  USING  (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ─── RECORDS ────────────────────────────────────────────────
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
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_records_list_id  ON public.records(list_id);
CREATE INDEX IF NOT EXISTS idx_records_email    ON public.records(email);
CREATE INDEX IF NOT EXISTS idx_records_tags     ON public.records USING GIN(tags);

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "records: owner full access"
  ON public.records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = records.list_id
        AND lists.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = records.list_id
        AND lists.created_by = auth.uid()
    )
  );

-- ─── CHAT HISTORY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  list_id    UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_history: owner full access"
  ON public.chat_history
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── USER ROLES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member'))
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can read roles (needed to check admin status)
CREATE POLICY "user_roles: read all"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can write roles
CREATE POLICY "user_roles: admin write"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- ─── AUTO-INSERT ROLE ON SIGNUP ─────────────────────────────
-- First registered user becomes admin; rest become members.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN (SELECT COUNT(*) FROM public.user_roles) = 0 THEN 'admin' ELSE 'member' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
