-- ============================================================
-- GTM Unbound – Disable Auth Roadblock
-- Run this to allow direct access without login
-- ============================================================

-- Disable RLS
ALTER TABLE public.lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop constraints that require a valid auth.users id for now
-- Or just realize that without RLS, as long as we provide *some* UUID, it might work 
-- But auth.users is special. Let's make created_by optional for now.

ALTER TABLE public.lists ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.chat_history ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;

-- Also allow anyone to execute the duplicate marking function
GRANT EXECUTE ON FUNCTION public.mark_duplicates(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_duplicates(UUID) TO authenticated;
