-- Drop any legacy unique constraint/index enforcing (user_id, hotel_id)
-- Some environments may have a custom name: uniq_review_user_hotel

-- Try dropping as a table constraint
ALTER TABLE IF EXISTS public.reviews
  DROP CONSTRAINT IF EXISTS uniq_review_user_hotel;

-- Also drop as a standalone unique index if it was created that way
DROP INDEX IF EXISTS uniq_review_user_hotel;
