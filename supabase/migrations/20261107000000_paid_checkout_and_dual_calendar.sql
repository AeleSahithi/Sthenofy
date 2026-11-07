-- PayU hosted checkout with server-side verification, two Google Calendars, and
-- service-specific questionnaires.
--
-- Requires 20261101000000_booking_notifications_and_google_calendar.sql (run it first).
--
-- Booking flow for website customers (payment_provider = 'payu'):
--   hold (10 min, unpaid)
--     -> PayU returns / webhook, verified on the server: payment_status = 'paid', still 'hold'
--        (the slot stays reserved until the session ends)
--     -> worker creates the event in every connected Google Calendar
--     -> status = 'confirmed' -> one confirmation email (guarded by confirmation_sent_at)
-- Admin "Confirm payment" and admin-created bookings keep working as before.
-- Non-destructive: only adds columns, constraints, functions and replaces functions.

begin;

-- --- Questionnaire per service (Google Form link, set in Admin -> Services & Pricing) ---
alter table public.service_types
  add column if not exists questionnaire_url text;

alter table public.service_types
  drop constraint if exists service_types_questionnaire_url_check;
alter table public.service_types
  add constraint service_types_questionnaire_url_check
  check (questionnaire_url is null or questionnaire_url ~ '^https://(docs\.google\.com/forms/|forms\.gle/)');

-- --- Booking columns -------------------------------------------------------------
alter table public.bookings
  add column if not exists google_event_id_2 text,       -- event in Google Calendar 2 (google_event_id is calendar 1)
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_gateway_id text,      -- PayU mihpayid
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists calendar_sync_error text;

-- One verified PayU transaction can only ever pay for one booking.
create unique index if not exists bookings_payment_gateway_id_key
  on public.bookings (payment_gateway_id) where payment_gateway_id is not null;

-- --- Two Google Calendar connections (id 1 and id 2) --------------------------------
do $$
declare
  item record;
begin
  for item in
    select conname from pg_constraint
    where conrelid = 'public.google_connection'::regclass and contype = 'c'
  loop
    execute format('alter table public.google_connection drop constraint %I', item.conname);
  end loop;
end;
$$;

alter table public.google_connection
  add constraint google_connection_slot_check check (id in (1, 2)),
  add column if not exists watch_channel_id text,
  add column if not exists watch_resource_id text,
  add column if not exists watch_token text,
  add column if not exists watch_expires_at timestamptz,
  add column if not exists sync_requested_at timestamptz;

create unique index if not exists google_connection_email_key on public.google_connection (lower(email));

-- Busy times are kept per calendar.
alter table public.calendar_busy
  add column if not exists connection_id integer not null default 1
  references public.google_connection(id) on delete cascade;
alter table public.calendar_busy alter column connection_id drop default;
create index if not exists calendar_busy_connection_idx on public.calendar_busy (connection_id);

drop function if exists public.replace_calendar_busy(jsonb);
create or replace function public.replace_calendar_busy(
  p_connection_id integer,
  p_intervals jsonb,
  p_synced_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.calendar_busy where connection_id = p_connection_id;
  insert into public.calendar_busy (connection_id, starts_at, ends_at)
  select p_connection_id, (item->>'starts_at')::timestamptz, (item->>'ends_at')::timestamptz
  from jsonb_array_elements(coalesce(p_intervals, '[]'::jsonb)) item
  where (item->>'ends_at')::timestamptz > (item->>'starts_at')::timestamptz;
  update public.google_connection
  set last_busy_sync_at = p_synced_at, last_error = null
  where id = p_connection_id;
end;
$$;
revoke all on function public.replace_calendar_busy(integer, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.replace_calendar_busy(integer, jsonb, timestamptz) to service_role;

drop function if exists public.get_google_connection_status();
create function public.get_google_connection_status()
returns table(id integer, email text, connected_at timestamptz, last_busy_sync_at timestamptz, last_error text, watch_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admins only.';
  end if;
  return query
  select g.id, g.email, g.connected_at, g.last_busy_sync_at, g.last_error, g.watch_expires_at
  from public.google_connection g order by g.id;
end;
$$;
revoke all on function public.get_google_connection_status() from public, anon;
grant execute on function public.get_google_connection_status() to authenticated;

drop function if exists public.disconnect_google_calendar();
create or replace function public.disconnect_google_calendar(p_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admins only.';
  end if;
  delete from public.google_connection where id = p_id; -- its busy times are removed with it
end;
$$;
revoke all on function public.disconnect_google_calendar(integer) from public, anon;
grant execute on function public.disconnect_google_calendar(integer) to authenticated;

-- --- Event queue: new 'paid' event ------------------------------------------------
alter table public.booking_events drop constraint if exists booking_events_kind_check;
alter table public.booking_events
  add constraint booking_events_kind_check
  check (kind in ('reserved', 'payment_submitted', 'paid', 'confirmed', 'rescheduled', 'cancelled'));

create or replace function public.queue_booking_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  queued boolean := false;
begin
  if new.status = 'blocked' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'hold' then
      insert into public.booking_events (booking_id, kind) values (new.id, 'reserved');
      queued := true;
    elsif new.status = 'confirmed' then
      insert into public.booking_events (booking_id, kind) values (new.id, 'confirmed');
      queued := true;
    end if;
  else
    if old.payment_submitted_at is null and new.payment_submitted_at is not null then
      insert into public.booking_events (booking_id, kind) values (new.id, 'payment_submitted');
      queued := true;
    end if;
    -- Payment verified by the server: create the calendar events, then confirm.
    if new.status = 'hold' and new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
      insert into public.booking_events (booking_id, kind) values (new.id, 'paid');
      queued := true;
    end if;
    if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
      insert into public.booking_events (booking_id, kind) values (new.id, 'confirmed');
      queued := true;
    elsif new.status = 'confirmed' and old.status = 'confirmed' and new.starts_at is distinct from old.starts_at then
      insert into public.booking_events (booking_id, kind, previous_starts_at) values (new.id, 'rescheduled', old.starts_at);
      queued := true;
    end if;
    if new.status = 'cancelled' and old.status in ('hold', 'confirmed') then
      insert into public.booking_events (booking_id, kind) values (new.id, 'cancelled');
      queued := true;
    end if;
  end if;

  if queued then
    perform private.call_booking_worker();
  end if;
  return new;
end;
$$;
revoke all on function public.queue_booking_events() from public, anon, authenticated;

-- 'paid' events keep retrying for about an hour (Google outage), others 5 times.
create or replace function public.claim_booking_events(p_limit integer default 20)
returns setof public.booking_events
language sql
security definer
set search_path = public
as $$
  update public.booking_events e
  set locked_until = now() + interval '2 minutes', attempts = e.attempts + 1
  where e.id in (
    select id from public.booking_events
    where processed_at is null
      and attempts < case when kind = 'paid' then 30 else 5 end
      and (locked_until is null or locked_until < now())
    order by id
    limit p_limit
    for update skip locked
  )
  returning e.*;
$$;
revoke all on function public.claim_booking_events(integer) from public, anon, authenticated;
grant execute on function public.claim_booking_events(integer) to service_role;

-- Worker: claims the single confirmation email for a booking (true at most once).
create or replace function public.claim_confirmation_email(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings set confirmation_sent_at = now()
  where id = p_booking_id and confirmation_sent_at is null;
  return found;
end;
$$;
revoke all on function public.claim_confirmation_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_confirmation_email(uuid) to service_role;

-- --- Checkout (called by the booking-checkout Edge Function with the service role) ---
-- Same checks as create_booking, but the hold belongs to the PayU checkout, so no
-- "pay with the link" email is sent for it.
create or replace function public.create_checkout_hold(
  p_service_type_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_starts_at timestamptz,
  p_customer_phone text,
  p_notes text,
  p_hold_minutes integer
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bookings;
begin
  result := public.create_booking(
    p_service_type_id, p_customer_name, p_customer_email, p_starts_at,
    p_customer_phone, p_notes, p_hold_minutes, null
  );
  update public.bookings set payment_provider = 'payu' where id = result.id
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_checkout_hold(uuid, text, text, timestamptz, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_checkout_hold(uuid, text, text, timestamptz, text, text, integer) to service_role;

-- Called by payu-payment after the PayU response hash (and PayU's verify API) checked out.
-- Idempotent: a second call for the same transaction returns the same result.
-- Returns 'paid' (slot reserved, confirmation follows), 'already_paid', 'slot_taken'
-- (paid after the hold lapsed and someone else booked the time: admin reschedules or refunds),
-- or 'amount_mismatch'.
create or replace function public.record_verified_payment(
  p_booking_id uuid,
  p_txnid text,
  p_gateway_id text,
  p_amount numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  booking public.bookings;
begin
  select * into booking from public.bookings
  where id = p_booking_id and payment_transaction_id = p_txnid
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'No booking for this PayU transaction.';
  end if;

  if booking.payment_status = 'paid' then
    return 'already_paid';
  end if;
  if booking.amount is not null and abs(booking.amount - p_amount) > 0.01 then
    update public.bookings
    set calendar_sync_error = format('PayU amount %s does not match the booking amount %s. Check PayU before confirming.', p_amount, booking.amount),
        payment_reference = p_txnid, payment_gateway_id = p_gateway_id, updated_at = now()
    where id = booking.id;
    return 'amount_mismatch';
  end if;

  -- One update, so the trigger sees the hold become paid and queues the 'paid' event.
  -- Keeps (or takes back) the slot until the session ends while the calendars are updated.
  begin
    update public.bookings
    set payment_status = 'paid', payment_verified_at = now(), payment_reference = p_txnid,
        payment_gateway_id = p_gateway_id, status = 'hold', hold_expires_at = ends_at,
        calendar_sync_error = null, updated_at = now()
    where id = booking.id and status in ('hold', 'expired');
    if found then
      return 'paid';
    end if;
  exception
    when exclusion_violation then
      null; -- the hold lapsed and someone else booked the time
  end;

  update public.bookings
  set payment_status = 'paid', payment_verified_at = now(), payment_reference = p_txnid,
      payment_gateway_id = p_gateway_id, updated_at = now(),
      calendar_sync_error = 'Paid after the reservation ended and the time is no longer free. Reschedule or refund.'
  where id = booking.id;
  return 'slot_taken';
end;
$$;
revoke all on function public.record_verified_payment(uuid, text, text, numeric) from public, anon, authenticated;
grant execute on function public.record_verified_payment(uuid, text, text, numeric) to service_role;

-- Failed or cancelled PayU payment: free the slot at once (status 'expired', so no
-- "Cancelled" email). Never touches a paid booking.
create or replace function public.record_failed_payment(p_booking_id uuid, p_txnid text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
  set status = 'expired', payment_status = 'failed', updated_at = now()
  where id = p_booking_id and payment_transaction_id = p_txnid
    and status = 'hold' and payment_status = 'pending';
$$;
revoke all on function public.record_failed_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.record_failed_payment(uuid, text) to service_role;

-- Public: what the customer's browser needs after returning from PayU. The booking ID is a
-- random UUID only the customer has; no personal details are returned. The questionnaire
-- link is only returned once the payment has been verified.
create or replace function public.get_booking_status(p_booking_id uuid)
returns table(
  status text,
  payment_status text,
  starts_at timestamptz,
  ends_at timestamptz,
  service_name text,
  questionnaire_url text,
  needs_attention boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select b.status, b.payment_status, b.starts_at, b.ends_at, s.name,
    case when b.payment_status = 'paid' then s.questionnaire_url end,
    b.calendar_sync_error is not null
  from public.bookings b
  left join public.service_types s on s.id = b.service_type_id
  where b.id = p_booking_id and b.status <> 'blocked';
$$;
revoke all on function public.get_booking_status(uuid) from public;
grant execute on function public.get_booking_status(uuid) to anon, authenticated;

commit;
