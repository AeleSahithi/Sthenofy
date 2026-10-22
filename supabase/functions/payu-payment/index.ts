import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('PUBLIC_SITE_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const encoder = new TextEncoder();

async function sha512(value: string) {
  const digest = await crypto.subtle.digest('SHA-512', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function htmlRedirect(origin: string, status: string, bookingId?: string) {
  const path = Deno.env.get('PUBLIC_SITE_PATH') || '/Sthenofy/';
  const target = `${origin}${path.replace(/\/?$/, '/')}services?payment=${encodeURIComponent(status)}${bookingId ? `&booking=${encodeURIComponent(bookingId)}` : ''}`;
  return new Response(`<!doctype html><meta http-equiv="refresh" content="0;url=${target}"><script>location.replace(${JSON.stringify(target)})</script>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const payuKey = Deno.env.get('PAYU_MERCHANT_KEY');
  const payuSalt = Deno.env.get('PAYU_MERCHANT_SALT');
  const siteOrigin = Deno.env.get('PUBLIC_SITE_ORIGIN') || new URL(request.url).origin;
  if (!payuKey || !payuSalt) return response(503, { error: 'PayU is not configured.' });

  const isCheckoutRequest = request.method === 'POST'
    && request.headers.get('content-type')?.includes('application/json');
  if (isCheckoutRequest) {
    const { bookingId } = await request.json();
    if (!bookingId) return response(400, { error: 'bookingId is required.' });
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, service_types(name, price, currency)')
      .eq('id', bookingId)
      .eq('status', 'hold')
      .eq('payment_status', 'pending')
      .single();
    if (error || !booking) return response(404, { error: 'Booking hold not found or expired.' });
    if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= Date.now()) {
      await supabase.from('bookings').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', bookingId);
      return response(409, { error: 'This booking hold has expired. Please select the slot again.' });
    }
    const txnid = `STH_${booking.id.replaceAll('-', '').slice(0, 20)}_${Date.now().toString(36)}`;
    const amount = Number(booking.service_types.price).toFixed(2);
    const productinfo = booking.service_types.name;
    const firstname = booking.customer_name.trim().split(/\s+/)[0];
    const udf1 = booking.id;
    const udf2 = '';
    const udf3 = '';
    const udf4 = '';
    const udf5 = '';
    const udf6 = '';
    const udf7 = '';
    const udf8 = '';
    const udf9 = '';
    const udf10 = '';
    const hash = await sha512(`${payuKey}|${txnid}|${amount}|${productinfo}|${firstname}|${booking.customer_email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}|||||||||||${payuSalt}`);
    const action = Deno.env.get('PAYU_ENVIRONMENT') === 'production'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment';
    const fields = {
      key: payuKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email: booking.customer_email,
      phone: booking.customer_phone || '',
      surl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payu-payment`,
      furl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payu-payment`,
      hash,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      udf6,
      udf7,
      udf8,
      udf9,
      udf10,
    };
    const { error: updateError } = await supabase.from('bookings').update({
      payment_reference: txnid,
      payment_transaction_id: txnid,
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id).eq('status', 'hold');
    if (updateError) return response(500, { error: 'Unable to attach PayU transaction.' });
    return response(200, { action, fields });
  }

  if (request.method === 'POST' || request.method === 'GET') {
    const form = request.method === 'POST'
      ? await request.formData()
      : new URL(request.url).searchParams;
    const status = String(form.get('status') || 'failure');
    const txnid = String(form.get('txnid') || '');
    const bookingId = String(form.get('udf1') || '');
    const receivedHash = String(form.get('hash') || '').toLowerCase();
    const additionalCharges = String(form.get('additionalCharges') || '');
    const udfValues = Array.from({ length: 10 }, (_, index) => String(form.get(`udf${10 - index}`) || ''));
    const reverseHash = await sha512(`${additionalCharges ? `${additionalCharges}|` : ''}${payuSalt}|${status}|${udfValues.join('|')}|${String(form.get('email') || '')}|${String(form.get('firstname') || '')}|${String(form.get('productinfo') || '')}|${String(form.get('amount') || '')}|${txnid}|${payuKey}`);
    const valid = receivedHash === reverseHash;
    if (!valid || !txnid || !bookingId) return htmlRedirect(siteOrigin, 'failed');
    const success = status === 'success';
    await supabase.from('bookings').update({
      status: success ? 'confirmed' : 'cancelled',
      payment_status: success ? 'paid' : 'failed',
      payment_transaction_id: txnid,
      payment_reference: txnid,
      updated_at: new Date().toISOString(),
    }).eq('id', bookingId).eq('payment_transaction_id', txnid).eq('status', 'hold');
    return htmlRedirect(siteOrigin, success ? 'success' : 'failed', bookingId);
  }

  return response(405, { error: 'Method not allowed.' });
});
