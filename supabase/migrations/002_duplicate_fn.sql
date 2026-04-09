-- ============================================================
-- GTM Unbound – Duplicate Detection Function
-- Run AFTER 001_schema.sql
-- ============================================================

-- Marks is_duplicate=true for all records in a list that share
-- the same email OR the same (full_name + company) combination.
-- The first occurrence (by created_at asc) is kept as non-duplicate.
CREATE OR REPLACE FUNCTION public.mark_duplicates(p_list_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset all duplicates for this list first
  UPDATE public.records
  SET is_duplicate = false
  WHERE list_id = p_list_id;

  -- Mark duplicates by email (non-empty emails only)
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(email)
             ORDER BY created_at
           ) AS rn
    FROM public.records
    WHERE list_id = p_list_id
      AND email <> ''
  )
  UPDATE public.records r
  SET is_duplicate = true
  FROM ranked
  WHERE r.id = ranked.id
    AND ranked.rn > 1;

  -- Mark duplicates by name + company (only where not already marked)
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(full_name), LOWER(company)
             ORDER BY created_at
           ) AS rn
    FROM public.records
    WHERE list_id = p_list_id
      AND full_name <> ''
      AND company <> ''
      AND is_duplicate = false
  )
  UPDATE public.records r
  SET is_duplicate = true
  FROM ranked
  WHERE r.id = ranked.id
    AND ranked.rn > 1;
END;
$$;

-- Grant execute to authenticated users (RLS on records ensures data isolation)
GRANT EXECUTE ON FUNCTION public.mark_duplicates(UUID) TO authenticated;
