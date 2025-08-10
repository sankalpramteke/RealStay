-- Robust migration for listings + storage policies

-- 1) Create table
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  category text not null check (category in ('home','experience','service')),
  status text not null default 'draft' check (status in ('draft','published')),
  property_type text,
  room_type text,
  address text,
  coordinates jsonb default '{}'::jsonb,
  guests integer not null default 1,
  bedrooms integer not null default 0,
  beds integer not null default 0,
  bathrooms integer not null default 0,
  amenities text[] default '{}'::text[],
  photos text[] default '{}'::text[],
  title text,
  description text,
  pricing jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RLS
alter table public.listings enable row level security;

-- Policies wrapped to be idempotent
do $$ begin
  create policy "Owners can view own listings" on public.listings
  for select using (auth.uid() = host_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners can insert own listings" on public.listings
  for insert with check (auth.uid() = host_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Owners can update own listings" on public.listings
  for update using (auth.uid() = host_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Published listings are viewable by everyone" on public.listings
  for select using (status = 'published');
exception when duplicate_object then null; end $$;

-- 3) Indexes
create index if not exists idx_listings_host_id on public.listings(host_id);
create index if not exists idx_listings_status on public.listings(status);

-- 4) updated_at trigger
-- Ensure function exists (provided in project as public.update_updated_at_column)

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_listings_updated_at'
  ) then
    create trigger update_listings_updated_at
    before update on public.listings
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- 5) Storage bucket
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- 6) Storage policies (idempotent via exception handling)
-- Public read
do $$ begin
  create policy "Public read listing photos" on storage.objects
  for select using (bucket_id = 'listing-photos');
exception when duplicate_object then null; end $$;

-- Insert/Update/Delete by owner based on folder prefix (user_id)
-- Expect path: {user_id}/{listing_id}/{filename}

do $$ begin
  create policy "Users can upload their own listing photos" on storage.objects
  for insert with check (
    bucket_id = 'listing-photos' and (auth.uid())::text = (storage.foldername(name))[1]
  );
exception when duplicate_object then null; end $$;


do $$ begin
  create policy "Users can update their own listing photos" on storage.objects
  for update using (
    bucket_id = 'listing-photos' and (auth.uid())::text = (storage.foldername(name))[1]
  );
exception when duplicate_object then null; end $$;


do $$ begin
  create policy "Users can delete their own listing photos" on storage.objects
  for delete using (
    bucket_id = 'listing-photos' and (auth.uid())::text = (storage.foldername(name))[1]
  );
exception when duplicate_object then null; end $$;
