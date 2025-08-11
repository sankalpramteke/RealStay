-- Allow public to view hotels that are published via linked listings
-- And allow hosts to view their own hotel rows

-- Ensure RLS is enabled
alter table if exists public.hotels enable row level security;

-- Public can view hotels only when the corresponding listing is published
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hotels'
      and policyname = 'Public can view published hotels'
  ) then
    create policy "Public can view published hotels"
    on public.hotels
    for select
    using (
      exists (
        select 1 from public.listings l
        where l.id = hotels.id and l.status = 'published'
      )
    );
  end if;
end $$;

-- Hosts can view their own hotel rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hotels' AND policyname = 'Hosts can view their hotels'
  ) THEN
    CREATE POLICY "Hosts can view their hotels"
    ON public.hotels
    FOR SELECT
    USING (host_id = auth.uid());
  END IF;
END $$;
