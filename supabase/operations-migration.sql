-- Run this file once in Supabase SQL Editor to enable the admin/supplier portals.
-- It only adds operations and supplier-management fields.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  service_area text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  bin_inventory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;
alter table public.bookings add column if not exists operation_status text not null default 'payment_pending';
alter table public.bookings add column if not exists supplier_notes text not null default '';
alter table public.bookings add column if not exists assigned_at timestamptz;
alter table public.bookings add column if not exists updated_at timestamptz not null default now();

alter table public.bookings alter column operation_status set default 'payment_pending';

update public.bookings
set operation_status = case when status = 'paid' then 'unassigned' else 'payment_pending' end
where supplier_id is null and operation_status in ('unassigned', 'payment_pending');

create index if not exists bookings_supplier_id_idx on public.bookings (supplier_id);
create index if not exists bookings_operation_status_idx on public.bookings (operation_status);

alter table public.suppliers enable row level security;
revoke all on public.suppliers from anon, authenticated;

-- Supplier account setup after creating the user in Authentication:
-- 1. Add the supplier in /admin/suppliers and copy its supplier UUID.
-- 2. Link public.suppliers.auth_user_id to the Auth user's UUID.
-- 3. In Authentication > Users > App metadata, set:
--    { "role": "supplier", "supplier_id": "SUPPLIER_UUID" }
