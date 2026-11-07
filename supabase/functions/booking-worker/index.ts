// Booking worker: called by the database right after a booking changes (pg_net), by the Google
// Calendar webhook, and every minute (pg_cron).
// 1. Paid online bookings: creates the event in every connected Google Calendar, then confirms the
//    booking (which sends the single confirmation email with the questionnaire link).
// 2. Sends queued booking emails and moves/deletes the events in both calendars.
// 3. Sends 24h and 1h reminders.
// 4. Keeps each calendar's busy times in calendar_busy (on push notifications, and every 5 minutes)
//    and renews the push-notification channels before they expire.
// Deploy with: supabase functions deploy booking-worker --no-verify-jwt (it checks its own shared secret).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  adminPaidEmail, adminPaymentEmail, adminReservedEmail, cancelledEmail, confirmedEmail, emailConfigured, reminderEmail,
  rescheduledEmail, reservedEmail, sendEmail, type MailBooking,
} from '../_shared/email.ts';
import {
  accessToken, deleteEvent, GoogleAuthError, googleConfigured, listBusy, moveEvent, stopChannel, upsertEvent, watchCalendar,
} from '../_shared/google.ts';

const BUSY_SYNC_MINUTES = 5;
const BUSY_WINDOW_DAYS = 60;
const WATCH_RENEW_BEFORE_MS = 24 * 3_600_000;

interface BookingEvent { id: number; booking_id: string; kind: string; previous_starts_at: string | null }
interface BookingRow extends Omit<MailBooking, 'service_name' | 'questionnaire_url'> {
  status: string;
  payment_status: string;
  payment_provider: string;
  confirmed_at: string | null;
  google_event_id: string | null;
  google_event_id_2: string | null;
  service_types: { name: string; questionnaire_url: string | null } | null;
}
type Booking = BookingRow & { service_name: string; questionnaire_url: string | null };

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

async function loadBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.from('bookings').select('*, service_types(name, questionnaire_url)').eq('id', id).single();
  if (error || !data) throw new Error(`Booking ${id} not found: ${error?.message}`);
  const row = data as BookingRow;
  return { ...row, service_name: row.service_types?.name || 'Session', questionnaire_url: row.service_types?.questionnaire_url ?? null };
}

// --- Google ---------------------------------------------------------------
interface GoogleConnection {
  id: number;
  email: string;
  refresh_token: string;
  last_busy_sync_at: string | null;
  sync_requested_at: string | null;
  watch_channel_id: string | null;
  watch_resource_id: string | null;
  watch_expires_at: string | null;
}
const eventColumn = (slot: number) => (slot === 1 ? 'google_event_id' : 'google_event_id_2') as 'google_event_id' | 'google_event_id_2';

async function connections(): Promise<GoogleConnection[]> {
  if (!googleConfigured()) return [];
  const { data } = await supabase.from('google_connection').select('*').order('id');
  return (data ?? []) as GoogleConnection[];
}

// Access tokens are valid for an hour; one per account per worker run is enough.
const tokens = new Map<number, Promise<string>>();
function tokenFor(connection: GoogleConnection): Promise<string> {
  if (!tokens.has(connection.id)) {
    const pending = accessToken(connection.refresh_token);
    pending.catch(() => tokens.delete(connection.id));
    tokens.set(connection.id, pending);
  }
  return tokens.get(connection.id)!;
}

async function recordGoogleError(connectionId: number, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Google Calendar ${connectionId}:`, message);
  await supabase.from('google_connection').update({ last_error: message.slice(0, 500) }).eq('id', connectionId);
}

/**
 * Makes sure the booking has an event in every connected calendar. Event IDs are derived from
 * the booking ID, so retries never create duplicates. The first calendar creates the Meet link
 * and the second reuses it. Returns the calendars that failed.
 */
async function ensureEvents(booking: Booking): Promise<string[]> {
  const failures: string[] = [];
  for (const connection of await connections()) {
    const column = eventColumn(connection.id);
    if (booking[column]) continue;
    try {
      const created = await upsertEvent(await tokenFor(connection), connection.id, {
        id: booking.id,
        summary: `STHENOFY: ${booking.service_name} — ${booking.customer_name}`,
        description: [`Booking reference ${booking.id.slice(0, 8).toUpperCase()}`, booking.customer_email ? `Email: ${booking.customer_email}` : '', booking.customer_phone ? `Phone: ${booking.customer_phone}` : '', booking.notes ? `Notes: ${booking.notes}` : ''].filter(Boolean).join('\n'),
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        attendeeEmail: booking.customer_email,
        attendeeName: booking.customer_name,
        meetLink: booking.meet_link,
      });
      booking[column] = created.eventId;
      booking.meet_link = booking.meet_link ?? created.meetLink;
      const { error } = await supabase.from('bookings').update({ [column]: created.eventId, meet_link: booking.meet_link }).eq('id', booking.id);
      if (error) throw error;
    } catch (error) {
      await recordGoogleError(connection.id, error);
      failures.push(`calendar ${connection.id} (${connection.email}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}

/** Runs a step for every calendar that has an event for this booking; failures are recorded, not thrown. */
async function forEachEvent(booking: Booking, step: (token: string, eventId: string, slot: number) => Promise<void>) {
  for (const connection of await connections()) {
    const eventId = booking[eventColumn(connection.id)];
    if (!eventId) continue;
    try {
      await step(await tokenFor(connection), eventId, connection.id);
    } catch (error) {
      await recordGoogleError(connection.id, error);
    }
  }
}

// --- Events -----------------------------------------------------------------
async function sendConfirmation(booking: Booking) {
  // Claimed in the database first, so the confirmation can never be sent twice.
  const { data: claimed, error } = await supabase.rpc('claim_confirmation_email', { p_booking_id: booking.id });
  if (error) throw error;
  if (!claimed) return;
  try {
    if (booking.customer_email) await sendEmail(confirmedEmail(booking));
  } catch (failure) {
    await supabase.from('bookings').update({ confirmation_sent_at: null }).eq('id', booking.id); // retry later
    throw failure;
  }
  if (booking.payment_provider === 'payu') await sendEmail(adminPaidEmail(booking)).catch((e) => console.error('Admin email failed:', e));
}

async function handleEvent(event: BookingEvent) {
  const booking = await loadBooking(event.booking_id);
  const hasCustomerEmail = Boolean(booking.customer_email);

  switch (event.kind) {
    case 'reserved':
      // Online checkout holds go straight to PayU; only payment-link holds get the "pay now" emails.
      if (booking.payment_provider === 'payu') break;
      if (hasCustomerEmail) await sendEmail(reservedEmail(booking));
      await sendEmail(adminReservedEmail(booking));
      break;

    case 'payment_submitted':
      await sendEmail(adminPaymentEmail(booking));
      break;

    case 'paid': {
      // Payment verified by payu-payment. Confirm only once every connected calendar has the event.
      if (booking.status !== 'hold' || booking.payment_status !== 'paid') break;
      const failures = await ensureEvents(booking);
      if (failures.length) {
        const message = `Paid, waiting for Google Calendar: ${failures.join('; ')}`.slice(0, 1000);
        await supabase.from('bookings').update({ calendar_sync_error: message }).eq('id', booking.id);
        throw new Error(message); // retried every ~2 minutes for about an hour
      }
      const { error } = await supabase.from('bookings')
        .update({ status: 'confirmed', hold_expires_at: null, calendar_sync_error: null, updated_at: new Date().toISOString() })
        .eq('id', booking.id).eq('status', 'hold');
      if (error) throw error;
      break; // the 'confirmed' event that this queues sends the email
    }

    case 'confirmed': {
      if (booking.status !== 'confirmed') break; // changed again since it was queued
      // Admin-confirmed and admin-created bookings: add any missing calendar events, but never hold back the email.
      const failures = await ensureEvents(booking);
      if (failures.length) await supabase.from('bookings').update({ calendar_sync_error: `Google Calendar: ${failures.join('; ')}`.slice(0, 1000) }).eq('id', booking.id);
      await sendConfirmation(booking);
      break;
    }

    case 'rescheduled':
      if (booking.status !== 'confirmed') break;
      await forEachEvent(booking, (token, eventId) => moveEvent(token, eventId, booking.starts_at, booking.ends_at));
      if (hasCustomerEmail) await sendEmail(rescheduledEmail(booking, event.previous_starts_at));
      break;

    case 'cancelled': {
      const wasConfirmed = Boolean(booking.confirmed_at);
      await forEachEvent(booking, (token, eventId) => deleteEvent(token, eventId));
      await supabase.from('bookings').update({ google_event_id: null, google_event_id_2: null }).eq('id', booking.id);
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
      // The lease expires after 2 minutes and the event is retried.
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

/** Push notifications: renews the channel a day before Google expires it (channels last up to 7 days). */
async function ensureWatch(connection: GoogleConnection, token: string) {
  if (connection.watch_expires_at && new Date(connection.watch_expires_at).getTime() - Date.now() > WATCH_RENEW_BEFORE_MS) return;
  const channelId = crypto.randomUUID();
  const channelToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const { resourceId, expiresAt } = await watchCalendar(token, channelId, channelToken);
  // Save the new channel before stopping the old one, so no change is missed in between.
  const { error } = await supabase.from('google_connection')
    .update({ watch_channel_id: channelId, watch_resource_id: resourceId, watch_token: channelToken, watch_expires_at: expiresAt })
    .eq('id', connection.id);
  if (error) throw error;
  if (connection.watch_channel_id && connection.watch_resource_id) {
    await stopChannel(token, connection.watch_channel_id, connection.watch_resource_id).catch(() => undefined);
  }
}

async function syncCalendars(report: Record<string, unknown>) {
  const synced: Record<number, number | string> = {};
  for (const connection of await connections()) {
    const last = connection.last_busy_sync_at ? new Date(connection.last_busy_sync_at).getTime() : 0;
    const requested = connection.sync_requested_at ? new Date(connection.sync_requested_at).getTime() : 0;
    const watchDue = !connection.watch_expires_at || new Date(connection.watch_expires_at).getTime() - Date.now() <= WATCH_RENEW_BEFORE_MS;
    const syncDue = !last || requested > last || Date.now() - last >= BUSY_SYNC_MINUTES * 60_000;
    if (!syncDue && !watchDue) continue;
    try {
      const token = await tokenFor(connection);
      if (watchDue) {
        // Push notifications are an optimisation; the periodic sync still works without them.
        await ensureWatch(connection, token).catch((error) => console.error(`Calendar ${connection.id} watch failed:`, error));
      }
      if (syncDue) {
        const startedAt = new Date();
        const busy = await listBusy(token, startedAt, new Date(startedAt.getTime() + BUSY_WINDOW_DAYS * 86_400_000));
        const { error } = await supabase.rpc('replace_calendar_busy', { p_connection_id: connection.id, p_intervals: busy, p_synced_at: startedAt.toISOString() });
        if (error) throw error;
        synced[connection.id] = busy.length;
      }
    } catch (error) {
      // Revoked access: drop this calendar's stale busy times so customers are not blocked by outdated
      // data (before recording the error, because replacing busy times clears last_error).
      if (error instanceof GoogleAuthError) await supabase.rpc('replace_calendar_busy', { p_connection_id: connection.id, p_intervals: [] });
      await recordGoogleError(connection.id, error);
      synced[connection.id] = 'error';
    }
  }
  report.busy = synced;
}

Deno.serve(async (request) => {
  if (!(await authorised(request))) return new Response('Unauthorized', { status: 401 });
  tokens.clear();
  const report: Record<string, unknown> = {};
  // Busy times first, so a change pushed by Google is applied before anything else.
  for (const [name, step] of [['busy', syncCalendars], ['events', processEvents], ['reminders', processReminders]] as const) {
    try {
      await step(report);
    } catch (error) {
      console.error(`${name} step failed:`, error);
      report[`${name}_error`] = error instanceof Error ? error.message : String(error);
    }
  }
  return new Response(JSON.stringify(report), { headers: { 'Content-Type': 'application/json' } });
});
