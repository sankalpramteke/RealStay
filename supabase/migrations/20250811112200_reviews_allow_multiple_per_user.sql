-- Allow multiple reviews by the same user for the same hotel
-- Drop the unique constraint (user_id, hotel_id) created in the initial table migration.
-- The default name for this constraint is typically: reviews_user_id_hotel_id_key

ALTER TABLE IF EXISTS public.reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_hotel_id_key;

-- Optional: keep helpful indexes
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_id_created_at ON public.reviews(hotel_id, created_at DESC);
