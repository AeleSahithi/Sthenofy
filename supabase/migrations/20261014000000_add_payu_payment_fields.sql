alter table public.bookings
  add column if not exists payment_provider text not null default 'payu'
    check (payment_provider in ('payu')),
  add column if not exists payment_transaction_id text;

create unique index if not exists bookings_payment_transaction_idx
  on public.bookings (payment_transaction_id)
  where payment_transaction_id is not null;
