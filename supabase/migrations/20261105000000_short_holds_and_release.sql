-- Short payment holds.
-- * The website now holds a slot for 10 minutes (PAYMENT_HOLD_MINUTES) instead of 60,
--   so an abandoned payment frees the slot quickly.
-- * release_booking_hold: the customer's "Book another slot" frees their unpaid hold at once.
-- * submit_payment_reference: a customer who pays after the hold lapsed can still submit
--   their PayU transaction ID. The slot is taken back if it is still free; otherwise the
--   reference is recorded for the admin ("Reservation expired · customer submitted payment").

begin;

-- Status 'expired' (not 'cancelled') so no "Cancelled" email is sent for a released hold.
create or replace function public.release_booking_hold(
  p_booking_id uuid,
  p_customer_email text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bookings
  set status = 'expired', updated_at = now()
  where id = p_booking_id
    and customer_email = lower(btrim(p_customer_email))
    and status = 'hold'
    and payment_status = 'pending'
    and payment_submitted_at is null;
$$;

revoke all on function public.release_booking_hold(uuid, text) from public;
grant execute on function public.release_booking_hold(uuid, text) to anon, authenticated;

-- Returns 'held' when the slot is held for verification, or 'slot_taken' when the hold
-- lapsed and someone else booked the time (the reference is still recorded).
drop function if exists public.submit_payment_reference(uuid, text, text);
create function public.submit_payment_reference(
  p_booking_id uuid,
  p_customer_email text,
  p_reference text
)
returns text
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
      payment_submitted_at = coalesce(payment_submitted_at, now()),
      updated_at = now()
  where id = p_booking_id
    and customer_email = lower(btrim(p_customer_email))
    and status in ('hold', 'expired')
    and payment_status = 'pending';
  if not found then
    raise exception using errcode = 'P0002', message = 'This reservation was not found. Please contact us with your payment details.';
  end if;

  -- Keep (or take back) the slot for 24 hours while the admin verifies the payment.
  begin
    update public.bookings
    set status = 'hold',
        hold_expires_at = greatest(coalesce(hold_expires_at, now()), now() + interval '24 hours'),
        updated_at = now()
    where id = p_booking_id;
    return 'held';
  exception
    when exclusion_violation then
      return 'slot_taken';
  end;
end;
$$;

revoke all on function public.submit_payment_reference(uuid, text, text) from public;
grant execute on function public.submit_payment_reference(uuid, text, text) to anon, authenticated;

commit;
