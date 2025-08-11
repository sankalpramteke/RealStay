-- Phase 2: Make reviews immutable (no edits or deletes by users)
-- Drop permissive UPDATE/DELETE policies and add protective triggers

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop prior UPDATE policy if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can update own reviews'
  ) THEN
    DROP POLICY "Users can update own reviews" ON public.reviews;
  END IF;
END $$;

-- Drop prior DELETE policy if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can delete own reviews'
  ) THEN
    DROP POLICY "Users can delete own reviews" ON public.reviews;
  END IF;
END $$;

-- Optional: ensure there are NO other UPDATE/DELETE policies; by default, with RLS, absence means deny

-- Add protective trigger to block UPDATE/DELETE at the database level
CREATE OR REPLACE FUNCTION public.prevent_review_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Reviews are immutable and cannot be %', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Block UPDATEs
DROP TRIGGER IF EXISTS prevent_review_update ON public.reviews;
CREATE TRIGGER prevent_review_update
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_review_mutation();

-- Block DELETEs
DROP TRIGGER IF EXISTS prevent_review_delete ON public.reviews;
CREATE TRIGGER prevent_review_delete
BEFORE DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_review_mutation();
