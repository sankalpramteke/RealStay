-- Add host linkage and category to hotels, and booking workflow policies for host approvals

-- 1) Schema changes
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS host_id uuid;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'home';

-- Ensure bookings default to pending until host approval
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';

-- 2) RLS policies
-- Hotels: allow hosts to manage their own hotel rows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hotels' AND policyname = 'Hosts can insert their hotels'
  ) THEN
    CREATE POLICY "Hosts can insert their hotels"
    ON public.hotels
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'hotels' AND policyname = 'Hosts can update their hotels'
  ) THEN
    CREATE POLICY "Hosts can update their hotels"
    ON public.hotels
    FOR UPDATE
    USING (auth.uid() = host_id);
  END IF;
END $$;

-- Rooms: allow hosts to insert/update rooms for their hotels
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'Hosts can insert rooms for their hotels'
  ) THEN
    CREATE POLICY "Hosts can insert rooms for their hotels"
    ON public.rooms
    FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.hotels h WHERE h.id = hotel_id AND h.host_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'Hosts can update rooms for their hotels'
  ) THEN
    CREATE POLICY "Hosts can update rooms for their hotels"
    ON public.rooms
    FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.hotels h WHERE h.id = hotel_id AND h.host_id = auth.uid()
    ));
  END IF;
END $$;

-- Bookings: allow hosts to view and manage bookings for their hotels
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Hosts can view bookings for their hotels'
  ) THEN
    CREATE POLICY "Hosts can view bookings for their hotels"
    ON public.bookings
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.hotels h WHERE h.id = hotel_id AND h.host_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Hosts can manage booking status for their hotels'
  ) THEN
    CREATE POLICY "Hosts can manage booking status for their hotels"
    ON public.bookings
    FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM public.hotels h WHERE h.id = hotel_id AND h.host_id = auth.uid()
    ));
  END IF;
END $$;
