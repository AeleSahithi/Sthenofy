import { requireSupabase } from './supabase';
import type { Booking } from './appointments';

export interface PayUCheckout {
  action: string;
  fields: Record<string, string>;
}

async function getFunctionError(error: unknown): Promise<Error> {
  const response = typeof error === 'object' && error !== null && 'context' in error
    ? (error as { context?: unknown }).context
    : null;
  if (response instanceof Response) {
    try {
      const body = await response.clone().json() as { error?: string };
      if (body.error) return new Error(body.error);
    } catch {
      // Use the SDK error below when the function did not return JSON.
    }
  }
  if (error instanceof Error && error.message) return error;
  return new Error('Unable to contact the PayU checkout service.');
}

export async function createPayUCheckout(booking: Booking): Promise<PayUCheckout> {
  const { data, error } = await requireSupabase().functions.invoke<PayUCheckout>('payu-payment', {
    body: { bookingId: booking.id },
  });
  if (error) throw await getFunctionError(error);
  if (!data || typeof data.action !== 'string' || !data.action || !data.fields || typeof data.fields !== 'object') {
    throw new Error('PayU checkout could not be prepared. Please try again.');
  }
  const fields = Object.entries(data.fields);
  if (fields.some(([name, value]) => !name || typeof value !== 'string')) {
    throw new Error('PayU returned invalid checkout fields. Please try again.');
  }
  return data;
}
