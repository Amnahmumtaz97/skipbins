-- Run after schema.sql and operations-migration.sql. No demo data is included.
begin;
create table if not exists public.portal_settings (
 id text primary key check (id = 'main'), data jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.bin_rates (
 id text primary key, data jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.service_suburbs (
 id text primary key, suburb text not null, postcode text not null check (postcode ~ '^\d{4}$'),
 state text not null default 'VIC' check (state = 'VIC'), active boolean not null default true,
 unique (suburb, postcode)
);
alter table public.customers add column if not exists status text not null default 'active' check (status in ('active','inactive'));
alter table public.bookings add column if not exists booking_source text not null default 'direct' check (booking_source in ('direct','ppc','manual'));
alter table public.portal_settings enable row level security;
alter table public.bin_rates enable row level security;
alter table public.service_suburbs enable row level security;
revoke all on public.portal_settings, public.bin_rates, public.service_suburbs from anon, authenticated;
grant all on public.portal_settings, public.bin_rates, public.service_suburbs to service_role;


-- Pending checkouts hold stock for 31 minutes; Stripe checkout expires after 30.
alter table public.bookings add column if not exists reserved_until timestamptz;
alter table public.bookings add column if not exists booking_turnaround integer not null default 1;
create or replace function public.reserve_admin_booking(payload jsonb)
returns table(id uuid, reference text)
language plpgsql security definer set search_path = public
as $$
declare
 rate jsonb;
 capacity integer;
 cooldown integer;
 drop_date date := (payload->>'delivery_date')::date;
 back_date date := (payload->>'pickup_date')::date;
 peak integer;
 booking_id uuid := (payload->>'id')::uuid;
 booking_ref text := payload->>'reference';
begin
 perform pg_advisory_xact_lock(hashtextextended(payload->>'bin_size', 0));
 select data into rate from public.bin_rates where bin_rates.id = (payload->>'bin_size') || '-' || (payload->>'waste_type');
 if rate is not null and coalesce((rate->>'active')::boolean, true) = false then raise exception 'Bin unavailable'; end if;
 capacity := (rate->>'stock')::integer;
 cooldown := coalesce((rate->>'turnaround')::integer, 1);
 if capacity is not null then
  select coalesce(max(used), 0) into peak from (
   select count(b.id) as used
   from generate_series(drop_date, back_date + cooldown, interval '1 day') d
   left join public.bookings b on b.bin_size = payload->>'bin_size'
    and b.operation_status <> 'cancelled'
    and (b.status = 'paid' or (b.status = 'pending' and b.reserved_until > now()))
    and b.delivery_date <= d::date and b.pickup_date + b.booking_turnaround >= d::date
   group by d
  ) capacity_by_day;
  if peak >= capacity then raise exception 'Bin stock is no longer available for these dates'; end if;
 end if;
 insert into public.bookings(id,reference,bin_size,postcode,waste_type,delivery_date,pickup_date,hire_period,full_name,email,phone,street_address,placement,access,notes,status,amount_cents,customer_id,reserved_until,booking_turnaround,booking_source)
 values(booking_id,booking_ref,payload->>'bin_size',payload->>'postcode',payload->>'waste_type',drop_date,back_date,payload->>'hire_period',payload->>'full_name',payload->>'email',payload->>'phone',payload->>'street_address',coalesce(payload->>'placement',''),coalesce(payload->>'access',''),coalesce(payload->>'notes',''),'pending',(payload->>'amount_cents')::integer,nullif(payload->>'customer_id','')::uuid,now()+interval '31 minutes',cooldown,coalesce(payload->>'booking_source','direct'));
 return query select booking_id,booking_ref;
end;
$$;
revoke all on function public.reserve_admin_booking(jsonb) from public, anon, authenticated;
grant execute on function public.reserve_admin_booking(jsonb) to service_role;

alter table public.suppliers add column if not exists abn text not null default '';
alter table public.suppliers add column if not exists rating numeric not null default 0 check (rating between 0 and 5);

revoke insert on public.bookings from anon, authenticated;
drop policy if exists "Create bookings" on public.bookings;
commit;
