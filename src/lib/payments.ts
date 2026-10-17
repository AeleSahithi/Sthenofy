import { requireSupabase } from './supabase';
import type { Booking } from './appointments';

export interface PayUCheckout {
  action: string;
  fields: Record<string, string>;
}

export async function createPayUCheckout(booking: Booking): Promise<PayUCheckout> {
  const { data, error } = await requireSupabase().functions.invoke<PayUCheckout>('payu-payment', {
    body: { bookingId: booking.id },
  });
  if (error) throw error;
  if (!data?.action || !data.fields) throw new Error('PayU checkout could not be prepared.');
  return data;
}
