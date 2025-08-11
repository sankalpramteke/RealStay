-- Phase 3: Add optional wallet signature fields to reviews

ALTER TABLE IF EXISTS public.reviews
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS signature text,
ADD COLUMN IF NOT EXISTS message_hash text;

-- Helpful index for verifying signatures by address
CREATE INDEX IF NOT EXISTS idx_reviews_wallet_address ON public.reviews(wallet_address);

-- No RLS change required: insert policy from Phase 1 still applies.
-- Clients may optionally populate wallet_address, signature, message_hash when inserting reviews.
