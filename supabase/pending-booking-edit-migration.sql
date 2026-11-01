-- Run after stripe-checkout-reliability-migration.sql.
-- Allow an unpaid checkout retry to update its existing order atomically.
begin;

create or replace function public.update_pending_booking_for_checkout(payload jsonb)
returns table(id uuid, reference text)
language plpgsql security definer set search_path = public
as $$
declare
  booking_id uuid := (payload->>'id')::uuid;
  b public.bookings%rowtype;
  rate jsonb;
  capacity integer;
  cooldown integer;
  drop_date date := (payload->>'delivery_date')::date;
  back_date date := (payload->>'pickup_date')::date;
  peak integer;
begin
  select * into b from public.bookings where bookings.id = booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'pending' then raise exception 'Only pending bookings can be changed'; end if;

  perform pg_advisory_xact_lock(hashtextextended(payload->>'bin_size', 0));
  select data into rate from public.bin_rates
    where bin_rates.id = (payload->>'bin_size') || '-' || (payload->>'waste_type');
  if rate is not null and coalesce((rate->>'active')::boolean, true) = false then raise exception 'Bin unavailable'; end if;
  capacity := nullif(rate->>'stock', '')::integer;
  cooldown := coalesce(nullif(rate->>'turnaround', '')::integer, 1);

  if capacity is not null then
    select coalesce(max(daily.used), 0) into peak from (
      select d.day::date as day, count(other.id)::integer as used
      from generate_series(drop_date, back_date + cooldown, interval '1 day') d(day)
      left join public.bookings other on other.bin_size = payload->>'bin_size'
        and other.id <> booking_id
        and other.operation_status <> 'cancelled'
        and (other.status = 'paid' or (other.status = 'pending' and other.reserved_until > now()))
        and other.delivery_date <= d.day::date
        and other.pickup_date + other.booking_turnaround >= d.day::date
      group by d.day
    ) daily;
    if peak >= capacity then raise exception 'Bin stock is no longer available for these dates'; end if;
  end if;

  update public.bookings set
    bin_size = payload->>'bin_size',
    postcode = payload->>'postcode',
    waste_type = payload->>'waste_type',
    delivery_date = drop_date,
    pickup_date = back_date,
    hire_period = payload->>'hire_period',
    full_name = payload->>'full_name',
    email = payload->>'email',
    phone = payload->>'phone',
    street_address = payload->>'street_address',
    placement = coalesce(payload->>'placement', ''),
    access = coalesce(payload->>'access', ''),
    notes = coalesce(payload->>'notes', ''),
    amount_cents = (payload->>'amount_cents')::integer,
    customer_id = coalesce(nullif(payload->>'customer_id', '')::uuid, b.customer_id),
    reserved_until = now() + interval '31 minutes',
    booking_turnaround = cooldown,
    operation_status = 'payment_pending',
    stripe_session_id = null,
    stripe_payment_intent_id = null,
    updated_at = now()
  where bookings.id = booking_id and bookings.status = 'pending';

  return query select booking_id, b.reference;
end;
$$;
revoke all on function public.update_pending_booking_for_checkout(jsonb) from public, anon, authenticated;
grant execute on function public.update_pending_booking_for_checkout(jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
