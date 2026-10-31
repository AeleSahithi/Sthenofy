-- Booking emails, reminders, Google Calendar + Meet, and Google "busy" blocking.
--
-- * Every customer-facing booking change is queued in booking_events by a trigger.
-- * The booking-worker Edge Function (called right away via pg_net, and every minute by
--   pg_cron) sends emails, creates/updates/deletes Google Calendar events with Meet links,
--   sends 24h/1h reminders, and copies busy times from Google Calendar into calendar_busy.
-- * calendar_busy blocks those times for customers (get_booked_intervals, create_booking).
-- Non-destructive: only adds columns, tables, functions and a cron job.

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- --- Booking columns -------------------------------------------------------
alter table public.bookings
  add column if not exists confirmed_at timestamptz,
  add column if not exists google_event_id text,
  add column if not exists meet_link text,
  add column if not exists reminder_24h_sent_at timestamptz,
  add column if not exists reminder_1h_sent_at timestamptz;

update public.bookings set confirmed_at = updated_at
where status = 'confirmed' and confirmed_at is null;

-- --- Private settings (not exposed through the API) ------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_settings (
  key text primary key,
  value text not null
);

insert into private.app_settings (key, value)
values
  ('worker_secret', encode(extensions.gen_random_bytes(32), 'hex')),
  ('worker_url', 'https://fmexlqqgdrdkboefeguk.supabase.co/functions/v1/booking-worker')
on conflict (key) do nothing;

-- The Edge Functions read the shared secret with the service role key.
create or replace function public.get_worker_secret()
returns text
language sql
security definer
set search_path = private
stable
as $$
  select value from private.app_settings where key = 'worker_secret';
$$;
revoke all on function public.get_worker_secret() from public, anon, authenticated;
grant execute on function public.get_worker_secret() to service_role;

-- Fire-and-forget call to the worker (pg_net is asynchronous, so it never blocks a booking).
create or replace function private.call_booking_worker()
returns void
language plpgsql
security definer
set search_path = private, extensions
as $$
declare
  worker_url text;
  secret text;
begin
  select value into worker_url from private.app_settings where key = 'worker_url';
  select value into secret from private.app_settings where key = 'worker_secret';
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

-- --- Event queue ------------------------------------------------------------
create table if not exists public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('reserved', 'payment_submitted', 'confirmed', 'rescheduled', 'cancelled')),
  previous_starts_at timestamptz,
  created_at timestamptz not null default now(),
  locked_until timestamptz,
  attempts integer not null default 0,
  processed_at timestamptz,
  last_error text
);
create index if not exists booking_events_pending_idx on public.booking_events (id) where processed_at is null;
alter table public.booking_events enable row level security;
-- No policies: only the service role (Edge Functions) reads or writes the queue.

-- Keeps confirmed_at and reminder flags correct before the row is saved.
create or replace function public.bookings_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    new.confirmed_at := now();
  end if;
  if tg_op = 'UPDATE' and new.starts_at is distinct from old.starts_at then
    new.reminder_24h_sent_at := null;
    new.reminder_1h_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_before_write on public.bookings;
create trigger bookings_before_write
  before insert or update on public.bookings
  for each row execute function public.bookings_before_write();

-- Queues one event per customer-visible change. Admin "blocked" time is never queued.
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

drop trigger if exists bookings_queue_events on public.bookings;
create trigger bookings_queue_events
  after insert or update on public.bookings
  for each row execute function public.queue_booking_events();

-- Worker: claim a batch of pending events (safe if two runs overlap).
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
    where processed_at is null and attempts < 5 and (locked_until is null or locked_until < now())
    order by id
    limit p_limit
    for update skip locked
  )
  returning e.*;
$$;

-- Worker: claim confirmed bookings that are due a reminder. Each reminder is sent at most once.
create or replace function public.claim_due_reminders()
returns table(booking_id uuid, kind text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.bookings b
  set reminder_24h_sent_at = now()
  where b.status = 'confirmed'
    and b.reminder_24h_sent_at is null
    and b.starts_at > now() + interval '2 hours'
    and b.starts_at <= now() + interval '24 hours'
    and b.starts_at - coalesce(b.confirmed_at, b.created_at) > interval '24 hours'
  returning b.id, '24h'::text;

  return query
  update public.bookings b
  set reminder_1h_sent_at = now()
  where b.status = 'confirmed'
    and b.reminder_1h_sent_at is null
    and b.starts_at > now()
    and b.starts_at <= now() + interval '1 hour'
    and b.starts_at - coalesce(b.confirmed_at, b.created_at) > interval '1 hour'
  returning b.id, '1h'::text;
end;
$$;

revoke all on function public.claim_booking_events(integer) from public, anon, authenticated;
revoke all on function public.claim_due_reminders() from public, anon, authenticated;
revoke all on function public.queue_booking_events() from public, anon, authenticated;
revoke all on function public.bookings_before_write() from public, anon, authenticated;
grant execute on function public.claim_booking_events(integer) to service_role;
grant execute on function public.claim_due_reminders() to service_role;

-- --- Google Calendar connection ---------------------------------------------
create table if not exists public.google_connection (
  id integer primary key default 1 check (id = 1),
  email text not null,
  refresh_token text not null,
  connected_at timestamptz not null default now(),
  last_busy_sync_at timestamptz,
  last_error text
);
alter table public.google_connection enable row level security;
-- No policies: the refresh token is only readable by the service role.

create or replace function public.get_google_connection_status()
returns table(email text, connected_at timestamptz, last_busy_sync_at timestamptz, last_error text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admins only.';
  end if;
  return query select g.email, g.connected_at, g.last_busy_sync_at, g.last_error from public.google_connection g;
end;
$$;

create or replace function public.disconnect_google_calendar()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admins only.';
  end if;
  delete from public.google_connection;
  delete from public.calendar_busy;
end;
$$;

-- --- Busy times copied from Google Calendar ----------------------------------
create table if not exists public.calendar_busy (
  id bigint generated always as identity primary key,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  synced_at timestamptz not null default now(),
  constraint calendar_busy_valid_range check (ends_at > starts_at)
);
create index if not exists calendar_busy_range_idx on public.calendar_busy (starts_at, ends_at);
alter table public.calendar_busy enable row level security;

drop policy if exists "Admins can read Google busy times" on public.calendar_busy;
create policy "Admins can read Google busy times"
  on public.calendar_busy for select
  to authenticated
  using (public.is_admin());

-- Replaces all synced busy times in one step (called by the worker).
create or replace function public.replace_calendar_busy(p_intervals jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.calendar_busy;
  insert into public.calendar_busy (starts_at, ends_at)
  select (item->>'starts_at')::timestamptz, (item->>'ends_at')::timestamptz
  from jsonb_array_elements(coalesce(p_intervals, '[]'::jsonb)) item
  where (item->>'ends_at')::timestamptz > (item->>'starts_at')::timestamptz;
  update public.google_connection set last_busy_sync_at = now(), last_error = null;
end;
$$;

revoke all on function public.get_google_connection_status() from public, anon;
revoke all on function public.disconnect_google_calendar() from public, anon;
revoke all on function public.replace_calendar_busy(jsonb) from public, anon, authenticated;
grant execute on function public.get_google_connection_status() to authenticated;
grant execute on function public.disconnect_google_calendar() to authenticated;
grant execute on function public.replace_calendar_busy(jsonb) to service_role;

-- Customers see Google busy times as booked.
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
    and b.ends_at > p_starts_at
  union all
  select c.starts_at, c.ends_at
  from public.calendar_busy c
  where c.starts_at < p_ends_at
    and c.ends_at > p_starts_at;
$$;

-- Same as before, plus: customers cannot reserve a time that is busy in Google Calendar.
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

  if exists (
    select 1 from public.calendar_busy c
    where c.starts_at < requested_end and c.ends_at > p_starts_at
  ) then
    raise exception using errcode = '23P01', message = 'The requested appointment time is no longer available.';
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

-- --- Schedule: run the worker every minute ------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'booking-worker';
select cron.schedule('booking-worker', '* * * * *', $$select private.call_booking_worker();$$);

commit;
