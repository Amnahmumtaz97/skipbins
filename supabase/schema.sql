create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  bin_size text not null,
  postcode text not null,
  waste_type text not null,
  delivery_date date not null,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Anyone can create a booking"
  on public.bookings
  for insert
  to anon, authenticated
  with check (true);

create policy "No public booking reads"
  on public.bookings
  for select
  to anon, authenticated
  using (false);
