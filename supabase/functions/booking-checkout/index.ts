// Public booking endpoint used by the Services page.
//  POST { action: 'availability', from, to }  -> live busy times from every connected Google Calendar
//  POST { action: 'checkout', serviceTypeId, name, email, phone, notes, startsAt }
//       -> re-checks both calendars live, holds the slot, and returns the signed PayU form
// Deploy with: supabase functions deploy booking-checkout --no-verify-jwt
// (public endpoint; it validates everything itself and never trusts prices from the browser).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { accessToken, freeBusy, googleConfigured, type Interval } from '../_shared/google.ts';
import { checkoutFields, payuConfig } from '../_shared/payu.ts';

const SITE = (Deno.env.get('SITE_URL') || 'https://sthenofy.com').replace(/\/$/, '');
const HOLD_MINUTES = 10;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

function cors(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [SITE, 'https://www.sthenofy.com', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173', 'http://127.0.0.1:5199'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : SITE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const overlaps = (a: Interval, from: Date, to: Date) => new Date(a.starts_at) < to && new Date(a.ends_at) > from;

/**
 * Live busy times from every connected calendar. A calendar that cannot be reached is skipped
 * (its last synced busy times still block slots in the database) and flagged for a resync.
 */
async function liveBusy(from: Date, to: Date): Promise<Interval[]> {
  if (!googleConfigured()) return [];
  const { data } = await supabase.from('google_connection').select('id, refresh_token');
  const results = await Promise.all((data ?? []).map(async (connection: { id: number; refresh_token: string }) => {
    try {
      return await freeBusy(await accessToken(connection.refresh_token), from, to);
    } catch (error) {
      console.error(`Live check of calendar ${connection.id} failed:`, error);
      await supabase.from('google_connection').update({ sync_requested_at: new Date().toISOString() }).eq('id', connection.id);
      return [];
    }
  }));
  return results.flat();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(request) });
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(request), 'Content-Type': 'application/json' } });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    const input = await request.json().catch(() => ({}));

    if (input.action === 'availability') {
      const from = new Date(input.from);
      const to = new Date(input.to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > 2 * 86_400_000) {
        return json(400, { error: 'Invalid range.' });
      }
      // Only start/end times are returned, never event details.
      return json(200, { busy: await liveBusy(from, to) });
    }

    if (input.action === 'checkout') {
      const payu = payuConfig();
      if (!payu) return json(503, { error: 'Online payment is not set up yet. Please contact us on WhatsApp to book.' });

      const name = String(input.name || '').trim().slice(0, 100);
      const email = String(input.email || '').trim().toLowerCase().slice(0, 254);
      const phone = String(input.phone || '').trim().slice(0, 20);
      const notes = String(input.notes || '').trim().slice(0, 1000);
      const startsAt = new Date(input.startsAt);
      if (!name || !/^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(email) || !phone || !input.serviceTypeId || Number.isNaN(startsAt.getTime())) {
        return json(400, { error: 'Please choose a service and time and fill in your name, email and phone.' });
      }

      const { data: service } = await supabase.from('service_types').select('id, name, duration_minutes').eq('id', input.serviceTypeId).eq('is_active', true).maybeSingle();
      if (!service) return json(404, { error: 'This service is no longer available. Please refresh the page.' });
      const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);

      // Re-check both Google Calendars right before reserving.
      if ((await liveBusy(startsAt, endsAt)).some((busy) => overlaps(busy, startsAt, endsAt))) {
        return json(409, { error: 'That time has just been booked. Please choose another slot.' });
      }

      // The database checks working-hour overlaps, synced busy times and other bookings, and copies the price.
      const { data: booking, error } = await supabase.rpc('create_checkout_hold', {
        p_service_type_id: service.id, p_customer_name: name, p_customer_email: email, p_starts_at: startsAt.toISOString(),
        p_customer_phone: phone, p_notes: notes || null, p_hold_minutes: HOLD_MINUTES,
      });
      if (error) {
        const taken = error.code === '23P01' || /no longer available/i.test(error.message);
        return json(taken ? 409 : 400, { error: taken ? 'That time has just been booked. Please choose another slot.' : error.message });
      }

      const txnid = `STH${booking.id.replace(/-/g, '').slice(0, 16)}${Date.now().toString(36)}`.toUpperCase();
      const { error: txnError } = await supabase.from('bookings').update({ payment_transaction_id: txnid, updated_at: new Date().toISOString() }).eq('id', booking.id).eq('status', 'hold');
      if (txnError) throw txnError;

      const fields = await checkoutFields(payu, {
        txnid,
        amount: Number(booking.amount).toFixed(2),
        productinfo: service.name.replace(/[|]/g, ' ').slice(0, 100),
        firstname: name.split(/\s+/)[0].replace(/[|]/g, '').slice(0, 60),
        email,
        phone,
        bookingId: booking.id,
        returnUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payu-payment`,
      });
      return json(200, { bookingId: booking.id, holdExpiresAt: booking.hold_expires_at, action: payu.checkoutUrl, fields });
    }

    return json(400, { error: 'Unknown action.' });
  } catch (error) {
    console.error('booking-checkout failed:', error);
    return json(500, { error: 'Our booking system had a problem. Please try again in a minute.' });
  }
});
