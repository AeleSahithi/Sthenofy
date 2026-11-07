// PayU return URL (surl/furl) and PayU webhook. Verifies every payment on the server:
//  1. the response hash (signed with the merchant salt, so it cannot be forged),
//  2. PayU's verify_payment API (server to server) for the status and amount,
//  3. the amount against the price the database saved on the booking.
// Only then is the booking marked paid; the booking-worker then creates the Google Calendar
// events and confirms it.
//
//  POST (browser, from PayU)        -> redirects to /services/?payment=...&booking=...
//  POST ?source=webhook (PayU S2S)  -> 200 "ok" (covers customers who close the tab after paying)
// Deploy with: supabase functions deploy payu-payment --no-verify-jwt (PayU cannot send a Supabase JWT).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { payuConfig, responseHashValid, verifyTransaction } from '../_shared/payu.ts';

const SITE = (Deno.env.get('SITE_URL') || 'https://sthenofy.com').replace(/\/$/, '');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function backToSite(result: string, bookingId?: string) {
  const params = new URLSearchParams({ payment: result });
  if (bookingId && UUID.test(bookingId)) params.set('booking', bookingId);
  return new Response(null, { status: 303, headers: { Location: `${SITE}/services/?${params}#appointment-booking` } });
}

type Outcome = 'success' | 'pending' | 'failed' | 'invalid';

async function processPayment(form: FormData): Promise<{ outcome: Outcome; bookingId: string }> {
  const config = payuConfig();
  const txnid = String(form.get('txnid') || '');
  const bookingId = String(form.get('udf1') || '');
  if (!config || !txnid || !UUID.test(bookingId)) return { outcome: 'invalid', bookingId };

  if (!(await responseHashValid(config, form))) {
    console.error(`PayU response hash mismatch for ${txnid}`);
    return { outcome: 'invalid', bookingId };
  }

  // The hash proves the post came from PayU; the verify API is the final word on status and amount.
  const verified = await verifyTransaction(config, txnid);
  if (verified && verified.bookingId && verified.bookingId !== bookingId) {
    console.error(`PayU verify: ${txnid} belongs to booking ${verified.bookingId}, not ${bookingId}`);
    return { outcome: 'invalid', bookingId };
  }
  const status = verified?.status ?? String(form.get('status') || '').toLowerCase();
  const amount = verified?.amount ?? Number(form.get('amount'));
  const gatewayId = verified?.mihpayid || String(form.get('mihpayid') || '') || txnid;

  if (status === 'success') {
    const { data, error } = await supabase.rpc('record_verified_payment', {
      p_booking_id: bookingId, p_txnid: txnid, p_gateway_id: gatewayId, p_amount: amount,
    });
    if (error) throw error;
    console.log(`PayU ${txnid}: ${data}`);
    // 'slot_taken' / 'amount_mismatch' are paid but need the admin; the customer sees a holding message.
    return { outcome: data === 'paid' || data === 'already_paid' ? 'success' : 'pending', bookingId };
  }
  if (status === 'pending') return { outcome: 'pending', bookingId };

  await supabase.rpc('record_failed_payment', { p_booking_id: bookingId, p_txnid: txnid });
  return { outcome: 'failed', bookingId };
}

Deno.serve(async (request) => {
  const isWebhook = new URL(request.url).searchParams.get('source') === 'webhook';
  if (request.method !== 'POST') return isWebhook ? new Response('ok') : backToSite('failed');

  try {
    const form = await request.formData();
    const { outcome, bookingId } = await processPayment(form);
    if (isWebhook) return new Response(outcome === 'invalid' ? 'invalid' : 'ok', { status: outcome === 'invalid' ? 400 : 200 });
    return backToSite(outcome, bookingId);
  } catch (error) {
    console.error('PayU response handling failed:', error);
    // Ask PayU to retry the webhook; the customer is told we are checking the payment.
    if (isWebhook) return new Response('error', { status: 500 });
    return backToSite('pending');
  }
});
