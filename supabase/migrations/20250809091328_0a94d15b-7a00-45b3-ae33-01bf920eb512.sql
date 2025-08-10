-- Create listings table for host onboarding
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

-- Enable RLS
alter table public.listings enable row level security;

-- Policies: owners can manage their listings
create policy if not exists "Owners can view own listings" on public.listings
for select using (auth.uid() = host_id);

create policy if not exists "Owners can insert own listings" on public.listings
for insert with check (auth.uid() = host_id);

create policy if not exists "Owners can update own listings" on public.listings
for update using (auth.uid() = host_id);

-- Public can view published listings
create policy if not exists "Published listings are viewable by everyone" on public.listings
for select using (status = 'published');

-- Indexes
create index if not exists idx_listings_host_id on public.listings(host_id);
create index if not exists idx_listings_status on public.listings(status);

-- Trigger to update updated_at
create trigger if not exists update_listings_updated_at
before update on public.listings
for each row execute function public.update_updated_at_column();

-- Create storage bucket for listing photos
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Storage policies
-- Public can view images in listing-photos
create policy if not exists "Public read listing photos" on storage.objects
for select using (bucket_id = 'listing-photos');

-- Owners can manage their own files under a folder named by their user id
-- Expect file paths like: {user_id}/{listing_id}/{filename}
create policy if not exists "Users can upload their own listing photos" on storage.objects
for insert with check (
  bucket_id = 'listing-photos' and
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy if not exists "Users can update their own listing photos" on storage.objects
for update using (
  bucket_id = 'listing-photos' and
  (auth.uid())::text = (storage.foldername(name))[1]
);

create policy if not exists "Users can delete their own listing photos" on storage.objects
for delete using (
  bucket_id = 'listing-photos' and
  (auth.uid())::text = (storage.foldername(name))[1]
);
