// Booking worker: called by the database right after a booking changes (pg_net) and every minute (pg_cron).
// 1. Sends queued booking emails and creates/moves/deletes Google Calendar events with Meet links.
// 2. Sends 24h and 1h reminders.
// 3. Every 10 minutes, copies busy times from the connected Google Calendar into calendar_busy.
// Deploy with: supabase functions deploy booking-worker --no-verify-jwt (it checks its own shared secret).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  adminPaymentEmail, adminReservedEmail, cancelledEmail, confirmedEmail, emailConfigured, reminderEmail,
  rescheduledEmail, reservedEmail, sendEmail, type MailBooking,
} from '../_shared/email.ts';
import { accessToken, createEvent, deleteEvent, GoogleAuthError, listBusy, moveEvent } from '../_shared/google.ts';

const BUSY_SYNC_MINUTES = 10;
const BUSY_WINDOW_DAYS = 60;

interface BookingEvent { id: number; booking_id: string; kind: string; previous_starts_at: string | null }
interface BookingRow extends Omit<MailBooking, 'service_name'> {
  status: string;
  confirmed_at: string | null;
  google_event_id: string | null;
  service_types: { name: string } | null;
}

const supabase: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let workerSecret: string | null = null;

async function authorised(request: Request): Promise<boolean> {
  if (!workerSecret) {
    const { data, error } = await supabase.rpc('get_worker_secret');
    if (error || !data) return false;
    workerSecret = data as string;
  }
  return request.headers.get('Authorization') === `Bearer ${workerSecret}`;
}

async function loadBooking(id: string): Promise<BookingRow & { service_name: string }> {
  const { data, error } = await supabase.from('bookings').select('*, service_types(name)').eq('id', id).single();
  if (error || !data) throw new Error(`Booking ${id} not found: ${error?.message}`);
  const row = data as BookingRow;
  return { ...row, service_name: row.service_types?.name || 'Session' };
}

// --- Google ---------------------------------------------------------------
interface GoogleConnection { refresh_token: string; email: string; last_busy_sync_at: string | null }
async function googleConnection(): Promise<GoogleConnection | null> {
  const { data } = await supabase.from('google_connection').select('refresh_token, email, last_busy_sync_at').maybeSingle();
  return data as GoogleConnection | null;
}
async function recordGoogleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Google Calendar:', message);
  await supabase.from('google_connection').update({ last_error: message.slice(0, 500) }).eq('id', 1);
}

/** Runs a Google step without blocking the email if Google fails; the error shows in the admin dashboard. */
async function withGoogle<T>(step: (token: string) => Promise<T>): Promise<T | null> {
  const connection = await googleConnection();
  if (!connection || !Deno.env.get('GOOGLE_CLIENT_ID')) return null;
  try {
    return await step(await accessToken(connection.refresh_token));
  } catch (error) {
    await recordGoogleError(error);
    return null;
  }
}

// --- Events -----------------------------------------------------------------
async function handleEvent(event: BookingEvent) {
  const booking = await loadBooking(event.booking_id);
  const hasCustomerEmail = Boolean(booking.customer_email);

  switch (event.kind) {
    case 'reserved':
      if (hasCustomerEmail) await sendEmail(reservedEmail(booking));
      await sendEmail(adminReservedEmail(booking));
      break;

    case 'payment_submitted':
      await sendEmail(adminPaymentEmail(booking));
      break;

    case 'confirmed': {
      if (booking.status !== 'confirmed') break; // changed again since it was queued
      if (!booking.google_event_id) {
        const created = await withGoogle((token) => createEvent(token, {
          id: booking.id,
          summary: `STHENOFY: ${booking.service_name} — ${booking.customer_name}`,
          description: [`Booking reference ${booking.id.slice(0, 8).toUpperCase()}`, booking.customer_phone ? `Phone: ${booking.customer_phone}` : '', booking.notes ? `Notes: ${booking.notes}` : ''].filter(Boolean).join('\n'),
          startsAt: booking.starts_at, endsAt: booking.ends_at,
          attendeeEmail: booking.customer_email, attendeeName: booking.customer_name,
        }));
        if (created) {
          await supabase.from('bookings').update({ google_event_id: created.eventId, meet_link: created.meetLink }).eq('id', booking.id);
          booking.google_event_id = created.eventId;
          booking.meet_link = created.meetLink;
        }
      }
      if (hasCustomerEmail) await sendEmail(confirmedEmail(booking));
      break;
    }

    case 'rescheduled':
      if (booking.status !== 'confirmed') break;
      if (booking.google_event_id) await withGoogle((token) => moveEvent(token, booking.google_event_id!, booking.starts_at, booking.ends_at));
      if (hasCustomerEmail) await sendEmail(rescheduledEmail(booking, event.previous_starts_at));
      break;

    case 'cancelled': {
      const wasConfirmed = Boolean(booking.confirmed_at);
      if (booking.google_event_id) {
        await withGoogle((token) => deleteEvent(token, booking.google_event_id!));
        await supabase.from('bookings').update({ google_event_id: null }).eq('id', booking.id);
      }
      if (hasCustomerEmail) await sendEmail(cancelledEmail(booking, wasConfirmed));
      break;
    }
  }
}

async function processEvents(report: Record<string, unknown>) {
  if (!emailConfigured()) {
    report.events = 'skipped: RESEND_API_KEY not set (events stay queued)';
    return;
  }
  const { data, error } = await supabase.rpc('claim_booking_events', { p_limit: 20 });
  if (error) throw error;
  let done = 0;
  for (const event of (data ?? []) as BookingEvent[]) {
    try {
      await handleEvent(event);
      await supabase.from('booking_events').update({ processed_at: new Date().toISOString(), last_error: null }).eq('id', event.id);
      done += 1;
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      console.error(`booking event ${event.id} (${event.kind}) failed:`, message);
      // The lease expires after 2 minutes and the event is retried (up to 5 attempts).
      await supabase.from('booking_events').update({ last_error: message.slice(0, 1000) }).eq('id', event.id);
    }
  }
  report.events = done;
}

async function processReminders(report: Record<string, unknown>) {
  if (!emailConfigured()) return;
  const { data, error } = await supabase.rpc('claim_due_reminders');
  if (error) throw error;
  let sent = 0;
  for (const due of (data ?? []) as { booking_id: string; kind: '24h' | '1h' }[]) {
    try {
      const booking = await loadBooking(due.booking_id);
      if (booking.customer_email) await sendEmail(reminderEmail(booking, due.kind));
      sent += 1;
    } catch (failure) {
      console.error(`reminder ${due.kind} for ${due.booking_id} failed:`, failure);
      // Release the claim so the next run retries it.
      const column = due.kind === '24h' ? 'reminder_24h_sent_at' : 'reminder_1h_sent_at';
      await supabase.from('bookings').update({ [column]: null }).eq('id', due.booking_id);
    }
  }
  report.reminders = sent;
}

async function syncBusy(report: Record<string, unknown>) {
  const connection = await googleConnection();
  if (!connection || !Deno.env.get('GOOGLE_CLIENT_ID')) return;
  if (connection.last_busy_sync_at && Date.now() - new Date(connection.last_busy_sync_at).getTime() < BUSY_SYNC_MINUTES * 60_000) return;
  try {
    const token = await accessToken(connection.refresh_token);
    const now = new Date();
    const busy = await listBusy(token, now, new Date(now.getTime() + BUSY_WINDOW_DAYS * 86_400_000));
    const { error } = await supabase.rpc('replace_calendar_busy', { p_intervals: busy });
    if (error) throw error;
    report.busy = busy.length;
  } catch (error) {
    // Revoked access: drop stale busy times so customers are not blocked by outdated data
    // (before recording the error, because replacing busy times clears last_error).
    if (error instanceof GoogleAuthError) await supabase.rpc('replace_calendar_busy', { p_intervals: [] });
    await recordGoogleError(error);
  }
}

Deno.serve(async (request) => {
  if (!(await authorised(request))) return new Response('Unauthorized', { status: 401 });
  const report: Record<string, unknown> = {};
  for (const [name, step] of [['events', processEvents], ['reminders', processReminders], ['busy', syncBusy]] as const) {
    try {
      await step(report);
    } catch (error) {
      console.error(`${name} step failed:`, error);
      report[`${name}_error`] = error instanceof Error ? error.message : String(error);
    }
  }
  return new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' } });
});
