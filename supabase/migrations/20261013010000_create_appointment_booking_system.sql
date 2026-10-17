create extension if not exists btree_gist;

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  price numeric(12, 2) not null default 0 check (price >= 0),
  currency text not null default 'INR' check (char_length(currency) = 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes > 0 and slot_interval_minutes <= 1440),
  is_active boolean not null default true,
  constraint working_hours_valid_range check (end_time > start_time)
);

create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  exception_date date not null,
  is_closed boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint schedule_exceptions_valid_range check (
    (is_closed and start_time is null and end_time is null)
    or (not is_closed and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references public.service_types(id),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'hold' check (status in ('hold', 'confirmed', 'cancelled', 'expired')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider text not null default 'payu' check (payment_provider in ('payu')),
  payment_reference text,
  payment_transaction_id text,
  hold_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_range check (ends_at > starts_at),
  constraint bookings_hold_expiry check (status <> 'hold' or hold_expires_at is not null)
);

create unique index if not exists working_hours_day_start_idx
  on public.working_hours (day_of_week, start_time);
create unique index if not exists schedule_exceptions_date_idx
  on public.schedule_exceptions (exception_date);
create index if not exists bookings_service_start_idx
  on public.bookings (service_type_id, starts_at);
create index if not exists bookings_customer_email_idx
  on public.bookings (lower(customer_email));
create unique index if not exists bookings_payment_transaction_idx
  on public.bookings (payment_transaction_id)
  where payment_transaction_id is not null;

alter table public.bookings
  drop constraint if exists bookings_no_active_overlap;
alter table public.bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('hold', 'confirmed'));

alter table public.service_types enable row level security;
alter table public.working_hours enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.bookings enable row level security;

create policy "Anyone can read active appointment services"
  on public.service_types for select
  to anon, authenticated
  using (is_active);

create policy "Anyone can read active working hours"
  on public.working_hours for select
  to anon, authenticated
  using (is_active);

create policy "Anyone can read schedule exceptions"
  on public.schedule_exceptions for select
  to anon, authenticated
  using (true);

create policy "Admins can manage appointment services"
  on public.service_types for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage working hours"
  on public.working_hours for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can manage schedule exceptions"
  on public.schedule_exceptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can read their own bookings"
  on public.bookings for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage bookings"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
  where b.status in ('hold', 'confirmed')
    and (b.status <> 'hold' or b.hold_expires_at > now())
    and b.starts_at < p_ends_at
    and b.ends_at > p_starts_at;
$$;

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
  if p_hold_minutes < 1 or p_hold_minutes > 1440 then
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
    starts_at, ends_at, status, payment_status, hold_expires_at, notes
  )
  values (
    service.id, case when p_user_id = auth.uid() then p_user_id else auth.uid() end,
    btrim(p_customer_name), lower(btrim(p_customer_email)), nullif(btrim(p_customer_phone), ''),
    p_starts_at, requested_end, 'hold', 'pending', now() + make_interval(mins => p_hold_minutes), p_notes
  )
  returning * into result;

  return result;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'The requested appointment time is no longer available.';
end;
$$;

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
    and status in ('hold', 'confirmed')
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

revoke all on table public.bookings from anon;
grant select, insert, update, delete on table public.bookings to authenticated;
grant insert, update, delete on table public.service_types, public.working_hours, public.schedule_exceptions to authenticated;
grant select on table public.service_types, public.working_hours, public.schedule_exceptions to anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, timestamptz, text, text, integer, uuid) to anon, authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.get_booked_intervals(timestamptz, timestamptz) to anon, authenticated;
