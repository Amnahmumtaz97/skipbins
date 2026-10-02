create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  full_name text not null,
  email text not null,
  normalized_email text not null unique,
  phone text not null,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  bin_size text not null,
  postcode text not null,
  waste_type text not null,
  delivery_date date not null,
  pickup_date date not null,
  hire_period text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  street_address text not null,
  placement text not null default '',
  access text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists reference text;
alter table public.bookings add column if not exists pickup_date date;
alter table public.bookings add column if not exists hire_period text;
alter table public.bookings add column if not exists full_name text;
alter table public.bookings add column if not exists email text;
alter table public.bookings add column if not exists phone text;
alter table public.bookings add column if not exists street_address text;
alter table public.bookings add column if not exists placement text not null default '';
alter table public.bookings add column if not exists access text not null default '';
alter table public.bookings add column if not exists notes text not null default '';
alter table public.bookings add column if not exists status text not null default 'pending';
alter table public.bookings add column if not exists amount_cents integer not null default 0;
alter table public.bookings add column if not exists stripe_session_id text;
alter table public.bookings add column if not exists customer_id uuid references public.customers (id);

create unique index if not exists bookings_reference_key on public.bookings (reference);
create unique index if not exists bookings_stripe_session_id_key on public.bookings (stripe_session_id) where stripe_session_id is not null;
create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create unique index if not exists customers_normalized_email_key on public.customers (normalized_email);
create unique index if not exists customers_stripe_customer_id_key on public.customers (stripe_customer_id) where stripe_customer_id is not null;

alter table public.bookings enable row level security;
alter table public.customers enable row level security;

-- Customer records contain private contact details. Only the server-side
-- Supabase secret/service-role key may read or write them.
revoke all on public.customers from anon, authenticated;

-- Inserts go through /api/bookings after validation. Prefer SUPABASE_SECRET_KEY
-- (bypasses RLS). The insert policy lets the server publishable key persist
-- bookings when a secret key is not configured. Direct table reads stay closed.
grant insert on public.bookings to anon, authenticated;
revoke update, delete on public.bookings from anon, authenticated;

drop policy if exists "Anyone can create a booking" on public.bookings;
drop policy if exists "Create bookings" on public.bookings;
create policy "Create bookings"
  on public.bookings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "No public booking reads" on public.bookings;
create policy "No public booking reads"
  on public.bookings
  for select
  to anon, authenticated
  using (false);
