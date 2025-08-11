-- Phase 1: Only allow reviews from users who completed a booking for the same hotel
-- This migration updates RLS policies on public.reviews

-- Ensure RLS remains enabled (no-op if already enabled)
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='reviews' AND policyname='Allow public read access to reviews'
  ) THEN
    CREATE POLICY "Allow public read access to reviews" ON public.reviews FOR SELECT USING (true);
  END IF;
END $$;

-- Replace prior insert policy with stricter rule: must own a completed booking for the same hotel
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='reviews' AND policyname='Users can insert own reviews'
  ) THEN
    DROP POLICY "Users can insert own reviews" ON public.reviews;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='reviews' AND policyname='Users with completed booking can insert review'
  ) THEN
    CREATE POLICY "Users with completed booking can insert review"
    ON public.reviews
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.user_id = auth.uid()
          AND b.hotel_id = reviews.hotel_id
          AND (
            -- consider booking complete if checkout has passed
            (b.check_out_date IS NOT NULL AND b.check_out_date < now())
            OR b.status IN ('completed')
          )
      )
    );
  END IF;
END $$;

-- Keep update/delete policies as-is for now (Phase 2 will make reviews immutable)
