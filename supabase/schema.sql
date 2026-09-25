create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  bin_size text not null,
  postcode text not null,
  waste_type text not null,
  delivery_date date not null,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

-- Public writes would bypass API validation and rate limiting. Only a future
-- trusted booking service may insert after authoritative repricing.
drop policy if exists "Anyone can create a booking" on public.bookings;
revoke insert, update, delete on public.bookings from anon, authenticated;

drop policy if exists "No public booking reads" on public.bookings;
create policy "No public booking reads"
  on public.bookings
  for select
  to anon, authenticated
  using (false);
