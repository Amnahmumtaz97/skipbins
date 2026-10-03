-- Run this file once in Supabase SQL Editor if operations-migration.sql was
-- already applied before supplier applications were introduced.

create table if not exists public.supplier_applications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  abn text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists supplier_applications_email_unique
  on public.supplier_applications (lower(email));
create index if not exists supplier_applications_status_idx
  on public.supplier_applications (status, created_at desc);

alter table public.supplier_applications enable row level security;
revoke all on public.supplier_applications from anon, authenticated;
