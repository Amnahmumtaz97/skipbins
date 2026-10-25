-- Run after schema.sql, operations-migration.sql, admin-portal-migration.sql,
-- and order-numbers-migration.sql.
begin;

alter table public.bookings
  add column if not exists stripe_payment_intent_id text;
create unique index if not exists bookings_stripe_payment_intent_id_key
  on public.bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.booking_checkout_attempts (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  status text not null default 'creating'
    check (status in ('creating', 'open', 'processing', 'expired', 'failed', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (booking_id, attempt)
);
insert into public.booking_checkout_attempts(
  booking_id, attempt, stripe_session_id, stripe_payment_intent_id, status
)
select b.id, 1, b.stripe_session_id, b.stripe_payment_intent_id,
  case when b.status = 'paid' then 'paid' else 'open' end
from public.bookings b
where b.stripe_session_id is not null
on conflict (booking_id, attempt) do nothing;
alter table public.booking_checkout_attempts enable row level security;
revoke all on public.booking_checkout_attempts from public, anon, authenticated;
grant all on public.booking_checkout_attempts to service_role;

create or replace function public.reserve_booking_submission(payload jsonb)
returns table(id uuid, reference text)
language plpgsql security definer set search_path = public
as $$
declare
  booking_id uuid := (payload->>'id')::uuid;
  existing_reference text;
begin
  if booking_id is null then raise exception 'Submission ID is required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(booking_id::text, 0));
  select b.reference into existing_reference
    from public.bookings b where b.id = booking_id;
  if found then
    return query select booking_id, existing_reference;
    return;
  end if;
  return query select * from public.reserve_admin_booking(payload);
end;
$$;
revoke all on function public.reserve_booking_submission(jsonb) from public, anon, authenticated;
grant execute on function public.reserve_booking_submission(jsonb) to service_role;

create or replace function public.begin_booking_checkout(p_booking_id uuid, p_expired_session_id text default null)
returns table(attempt integer, stripe_session_id text, attempt_status text, booking_status text, amount_cents integer)
language plpgsql security definer set search_path = public
as $$
declare
  b public.bookings%rowtype;
  latest public.booking_checkout_attempts%rowtype;
  rate jsonb;
  capacity integer;
  cooldown integer;
  peak integer;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'pending' then
    return query select null::integer, null::text, null::text, b.status::text, b.amount_cents;
    return;
  end if;
  select * into latest from public.booking_checkout_attempts a
    where a.booking_id = p_booking_id order by a.attempt desc limit 1;
  if not found then
    insert into public.booking_checkout_attempts(booking_id, attempt, status)
      values (p_booking_id, 1, 'creating') returning * into latest;
  elsif latest.status = 'creating' then
    null;
  elsif p_expired_session_id is not null
      and latest.stripe_session_id = p_expired_session_id
      and latest.status in ('expired', 'failed') then
    if b.reserved_until is not null and b.reserved_until <= now() then
      perform pg_advisory_xact_lock(hashtextextended(b.bin_size, 0));
      select data into rate from public.bin_rates
        where bin_rates.id = b.bin_size || '-' || b.waste_type;
      if rate is not null and coalesce((rate->>'active')::boolean, true) = false then
        raise exception 'Bin unavailable';
      end if;
      capacity := (rate->>'stock')::integer;
      cooldown := coalesce((rate->>'turnaround')::integer, 1);
      if capacity is not null then
        select coalesce(max(used), 0) into peak from (
          select count(other.id) as used
          from generate_series(b.delivery_date, b.pickup_date + cooldown, interval '1 day') days(day)
          left join public.bookings other on other.bin_size = b.bin_size
            and other.id <> b.id
            and other.operation_status <> 'cancelled'
            and (other.status = 'paid' or (other.status = 'pending' and other.reserved_until > now()))
            and other.delivery_date <= days.day::date
            and other.pickup_date + other.booking_turnaround >= days.day::date
          group by days.day
        ) capacity_by_day;
        if peak >= capacity then raise exception 'Bin stock is no longer available for these dates'; end if;
      end if;
      update public.bookings set reserved_until = now() + interval '31 minutes'
        where id = p_booking_id;
    end if;
    insert into public.booking_checkout_attempts(booking_id, attempt, status)
      values (p_booking_id, latest.attempt + 1, 'creating') returning * into latest;
  end if;
  return query select latest.attempt, latest.stripe_session_id, latest.status, b.status::text, b.amount_cents;
end;
$$;
revoke all on function public.begin_booking_checkout(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_booking_checkout(uuid, text) to service_role;

create or replace function public.record_booking_checkout_attempt(
  p_booking_id uuid, p_attempt integer, p_session_id text,
  p_payment_intent_id text, p_status text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  existing public.booking_checkout_attempts%rowtype;
begin
  if p_status not in ('open', 'processing', 'expired', 'failed', 'paid') then
    raise exception 'Invalid checkout attempt status';
  end if;
  select * into existing from public.booking_checkout_attempts
    where booking_id = p_booking_id and attempt = p_attempt for update;
  if not found then raise exception 'Checkout attempt not found'; end if;
  if existing.stripe_session_id is not null and existing.stripe_session_id <> p_session_id then
    raise exception 'Checkout attempt already has a different Stripe session';
  end if;
  update public.booking_checkout_attempts
    set stripe_session_id = p_session_id,
        stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
        status = case
          when status = 'paid' then 'paid'
          when status = 'failed' and p_status <> 'paid' then 'failed'
          else p_status
        end,
        updated_at = now()
    where booking_id = p_booking_id and attempt = p_attempt;
end;
$$;
revoke all on function public.record_booking_checkout_attempt(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.record_booking_checkout_attempt(uuid, integer, text, text, text) to service_role;

commit;
