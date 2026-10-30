-- Admin-controlled slots, PayU payment-link payments, and price snapshots.
--
-- * "blocked" bookings: time the admin is unavailable.
-- * Admin-created bookings (payment_provider 'manual').
-- * Customer bookings paid through the static PayU payment link ('payu_link').
--   The link cannot report back which booking was paid, so a booking only
--   becomes paid when an admin confirms it after checking PayU.
-- * bookings.amount/currency are copied from service_types by a trigger, so the
--   saved price always comes from the database, never from the browser.
-- * One-hour appointment blocks.
-- Non-destructive: no rows are deleted.

begin;

-- Blocked slots do not belong to a customer or a service.
alter table public.bookings
  alter column service_type_id drop not null,
  alter column customer_email drop not null;

alter table public.bookings
  add column if not exists amount numeric(12, 2),
  add column if not exists currency text,
  add column if not exists payment_submitted_at timestamptz;

-- Drop the original inline status/provider checks whatever Postgres named them.
do $$
declare
  item record;
begin
  for item in
    select conname from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) like '%''expired''%' or pg_get_constraintdef(oid) like '%''payu''%')
  loop
    execute format('alter table public.bookings drop constraint %I', item.conname);
  end loop;
end;
$$;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('hold', 'confirmed', 'blocked', 'cancelled', 'expired'));

alter table public.bookings
  add constraint bookings_payment_provider_check
  check (payment_provider in ('payu', 'payu_link', 'manual'));

alter table public.bookings
  alter column payment_provider set default 'payu_link';

alter table public.bookings
  drop constraint if exists bookings_customer_required;
alter table public.bookings
  add constraint bookings_customer_required
  check (status = 'blocked' or (service_type_id is not null and customer_email is not null));

-- Blocked time must also prevent overlapping customer bookings.
alter table public.bookings
  drop constraint if exists bookings_no_active_overlap;
alter table public.bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('hold', 'confirmed', 'blocked'));

-- Backfill price snapshots for existing bookings before the trigger exists.
update public.bookings b
set amount = s.price, currency = s.currency
from public.service_types s
where s.id = b.service_type_id and b.amount is null;

-- The booking amount is always the service's database price at booking time.
create or replace function public.set_booking_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.service_type_id is null then
    new.amount := null;
    new.currency := null;
  elsif tg_op = 'INSERT' or new.service_type_id is distinct from old.service_type_id then
    select s.price, s.currency into new.amount, new.currency
    from public.service_types s
    where s.id = new.service_type_id;
  else
    new.amount := old.amount;
    new.currency := old.currency;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_amount on public.bookings;
create trigger bookings_set_amount
  before insert or update of service_type_id, amount, currency on public.bookings
  for each row execute function public.set_booking_amount();

create or replace function public.get_booked_intervals(
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select b.starts_at, b.ends_at
  from public.bookings b
  where b.status in ('hold', 'confirmed', 'blocked')
    and (b.status <> 'hold' or b.hold_expires_at > now())
    and b.starts_at < p_ends_at
    and b.ends_at > p_starts_at;
$$;

-- Same signature as before; customer bookings are now paid via the PayU link.
create or replace function public.create_booking(
  p_service_type_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_starts_at timestamptz,
  p_customer_phone text default null,
  p_notes text default null,
  p_hold_minutes integer default 15,
  p_user_id uuid default auth.uid()
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  service public.service_types;
  result public.bookings;
  requested_end timestamptz;
begin
  if p_customer_name is null or btrim(p_customer_name) = ''
    or p_customer_email is null or btrim(p_customer_email) = '' then
    raise exception using errcode = '22023', message = 'Customer name and email are required.';
  end if;
  if p_hold_minutes < 1 or p_hold_minutes > 120 then
    raise exception using errcode = '22023', message = 'Hold duration is invalid.';
  end if;

  select * into service
  from public.service_types
  where id = p_service_type_id and is_active;
  if not found then
    raise exception using errcode = 'P0002', message = 'Service is not available.';
  end if;

  requested_end := p_starts_at + make_interval(mins => service.duration_minutes);
  if p_starts_at <= now() then
    raise exception using errcode = '22023', message = 'Booking must start in the future.';
  end if;

  update public.bookings
  set status = 'expired', updated_at = now()
  where status = 'hold' and hold_expires_at <= now();

  insert into public.bookings (
    service_type_id, user_id, customer_name, customer_email, customer_phone,
    starts_at, ends_at, status, payment_status, payment_provider, hold_expires_at, notes
  )
  values (
    service.id, case when p_user_id = auth.uid() then p_user_id else auth.uid() end,
    btrim(p_customer_name), lower(btrim(p_customer_email)), nullif(btrim(p_customer_phone), ''),
    p_starts_at, requested_end, 'hold', 'pending', 'payu_link',
    now() + make_interval(mins => p_hold_minutes), nullif(btrim(p_notes), '')
  )
  returning * into result;

  return result;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'The requested appointment time is no longer available.';
end;
$$;

-- A customer reports their PayU transaction ID after paying. This only records
-- the reference and keeps the slot held for verification; it never marks paid.
create or replace function public.submit_payment_reference(
  p_booking_id uuid,
  p_customer_email text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reference is null or btrim(p_reference) = '' then
    raise exception using errcode = '22023', message = 'Enter the PayU transaction ID.';
  end if;
  update public.bookings
  set payment_reference = left(btrim(p_reference), 100),
      payment_submitted_at = now(),
      hold_expires_at = greatest(hold_expires_at, now() + interval '24 hours'),
      updated_at = now()
  where id = p_booking_id
    and customer_email = lower(btrim(p_customer_email))
    and status = 'hold'
    and payment_status = 'pending'
    and hold_expires_at > now();
  if not found then
    raise exception using errcode = 'P0002', message = 'This reservation has expired or was not found. Please contact us with your payment details.';
  end if;
end;
$$;

-- Lets the admin dashboard release stale holds before creating a slot.
create or replace function public.expire_stale_holds()
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
  set status = 'expired', updated_at = now()
  where status = 'hold' and hold_expires_at <= now();
$$;

-- Admins can cancel/unblock any active entry, including blocked slots.
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_customer_email text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bookings;
begin
  update public.bookings
  set status = 'cancelled', updated_at = now()
  where id = p_booking_id
    and status in ('hold', 'confirmed', 'blocked')
    and (
      (auth.uid() is not null and user_id = auth.uid())
      or public.is_admin()
    )
  returning * into result;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking not found or cannot be cancelled.';
  end if;
  return result;
end;
$$;

revoke all on function public.expire_stale_holds() from public;
revoke all on function public.submit_payment_reference(uuid, text, text) from public;
revoke all on function public.set_booking_amount() from public;
grant execute on function public.expire_stale_holds() to authenticated;
grant execute on function public.submit_payment_reference(uuid, text, text) to anon, authenticated;

-- One-hour appointment blocks.
update public.service_types set duration_minutes = 60, updated_at = now() where duration_minutes <> 60;
update public.working_hours set slot_interval_minutes = 60 where slot_interval_minutes <> 60;
alter table public.working_hours alter column slot_interval_minutes set default 60;

commit;
