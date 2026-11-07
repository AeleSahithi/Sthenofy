// Google Calendar helpers (OAuth refresh-token flow). Up to two Google accounts are connected
// (google_connection rows 1 and 2); every helper works on one account's primary calendar.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR = `${API}/calendars/primary/events`;
export const GOOGLE_SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy';
export const TIMEZONE = 'Asia/Kolkata';

export class GoogleAuthError extends Error {}
export type Interval = { starts_at: string; ends_at: string };

function clientCredentials() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.');
  return { clientId, clientSecret };
}

export const googleConfigured = () => Boolean(Deno.env.get('GOOGLE_CLIENT_ID') && Deno.env.get('GOOGLE_CLIENT_SECRET'));

export function googleRedirectUri(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth`;
}

export function googleAuthUrl(state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account', // lets the admin pick a different account for calendar 2
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchanges the OAuth code for tokens; returns the refresh token and the account email. */
export async function exchangeCode(code: string): Promise<{ refreshToken: string; email: string }> {
  const { clientId, clientSecret } = clientCredentials();
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: googleRedirectUri(), grant_type: 'authorization_code' }),
  });
  const body = await response.json();
  if (!response.ok || !body.refresh_token) throw new Error(body.error_description || body.error || 'Google did not return a refresh token.');
  // The ID token comes straight from Google's token endpoint over TLS, so its payload can be read directly.
  const payload = JSON.parse(atob(String(body.id_token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return { refreshToken: body.refresh_token, email: payload.email };
}

/** A fresh access token (Google access tokens last an hour; the refresh token does not expire unless revoked). */
export async function accessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = clientCredentials();
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
  });
  const body = await response.json();
  if (!response.ok) {
    if (body.error === 'invalid_grant') throw new GoogleAuthError('Google Calendar access was revoked or expired. Reconnect it in the admin dashboard.');
    throw new Error(body.error_description || body.error || `Google token error ${response.status}`);
  }
  return body.access_token;
}

type GoogleError = Error & { status?: number; reason?: string };

async function call(token: string, url: string, init: RequestInit = {}, attempt = 0): Promise<any> {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Rate limits and Google-side errors: short backoff, then retry (the worker retries later too).
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      return call(token, url, init, attempt + 1);
    }
    const error = new Error(body?.error?.message || `Google Calendar error ${response.status}`) as GoogleError;
    error.status = response.status;
    error.reason = body?.error?.errors?.[0]?.reason;
    throw error;
  }
  return body;
}

/**
 * Deterministic event ID per booking and calendar (Google allows a-v and 0-9), so a retried
 * create can never make a second event: Google answers 409 and the existing event is reused.
 */
export const eventIdFor = (bookingId: string, slot: number) => `sth${bookingId.replace(/-/g, '').toLowerCase()}c${slot}`;

export interface CalendarBooking {
  id: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  attendeeEmail: string | null;
  attendeeName: string;
  /** Existing Meet link (from the other calendar), or null to create one in this calendar. */
  meetLink: string | null;
}

/**
 * Creates (or, after a retry, reuses) the booking's event with a Google Meet link.
 * Google does not email the customer (sendUpdates=none): the site sends one confirmation
 * email with the calendar invitation itself.
 */
export async function upsertEvent(token: string, slot: number, booking: CalendarBooking): Promise<{ eventId: string; meetLink: string | null }> {
  const eventId = eventIdFor(booking.id, slot);
  const createMeet = !booking.meetLink;
  const body = {
    id: eventId,
    summary: booking.summary,
    description: booking.meetLink ? `${booking.description}\nGoogle Meet: ${booking.meetLink}` : booking.description,
    location: booking.meetLink ?? undefined,
    start: { dateTime: booking.startsAt, timeZone: TIMEZONE },
    end: { dateTime: booking.endsAt, timeZone: TIMEZONE },
    attendees: booking.attendeeEmail ? [{ email: booking.attendeeEmail, displayName: booking.attendeeName }] : [],
    ...(createMeet ? { conferenceData: { createRequest: { requestId: `${booking.id}-${slot}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
    extendedProperties: { private: { sthenofy_booking_id: booking.id } },
    reminders: { useDefault: true },
    status: 'confirmed',
  };
  let event;
  try {
    event = await call(token, `${CALENDAR}?conferenceDataVersion=1&sendUpdates=none`, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    if ((error as GoogleError).status !== 409) throw error;
    // Already created by an earlier attempt: reuse it (keeps its Meet link). If someone deleted
    // it by hand in Google, restore it at the booking's time.
    event = await call(token, `${CALENDAR}/${eventId}`);
    if (event.status === 'cancelled') {
      event = await call(token, `${CALENDAR}/${eventId}?sendUpdates=none`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed', start: body.start, end: body.end }),
      });
    }
  }
  let meetLink: string | null = booking.meetLink ?? event.hangoutLink ?? null;
  if (!meetLink && event.conferenceData?.createRequest?.status?.statusCode === 'pending') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    meetLink = (await call(token, `${CALENDAR}/${eventId}`)).hangoutLink ?? null;
  }
  return { eventId, meetLink };
}

export async function moveEvent(token: string, eventId: string, startsAt: string, endsAt: string): Promise<void> {
  try {
    await call(token, `${CALENDAR}/${eventId}?sendUpdates=none`, {
      method: 'PATCH',
      body: JSON.stringify({ start: { dateTime: startsAt, timeZone: TIMEZONE }, end: { dateTime: endsAt, timeZone: TIMEZONE }, status: 'confirmed' }),
    });
  } catch (error) {
    const status = (error as GoogleError).status;
    if (status !== 404 && status !== 410) throw error; // the calendar was reconnected to another account
  }
}

export async function deleteEvent(token: string, eventId: string): Promise<void> {
  try {
    await call(token, `${CALENDAR}/${eventId}?sendUpdates=none`, { method: 'DELETE' });
  } catch (error) {
    const status = (error as GoogleError).status;
    if (status !== 404 && status !== 410) throw error; // already gone
  }
}

/** Busy times from the events list, excluding events this site created (the database already has those). */
export async function listBusy(token: string, from: Date, to: Date): Promise<Interval[]> {
  const busy: Interval[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '2500',
      fields: 'nextPageToken,items(id,status,transparency,start,end,extendedProperties,attendees(self,responseStatus))',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await call(token, `${CALENDAR}?${params}`);
    for (const item of page.items ?? []) {
      if (item.status === 'cancelled' || item.transparency === 'transparent') continue;
      if (item.extendedProperties?.private?.sthenofy_booking_id) continue;
      if ((item.attendees ?? []).some((a: { self?: boolean; responseStatus?: string }) => a.self && a.responseStatus === 'declined')) continue;
      const start = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00+05:30` : null);
      const end = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00+05:30` : null);
      if (start && end) busy.push({ starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() });
    }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return busy;
}

/**
 * Live busy times for a short window via the FreeBusy API (used right before a booking and when a
 * customer picks a date). Accounts connected before the freebusy scope was added fall back to the
 * events list.
 */
export async function freeBusy(token: string, from: Date, to: Date): Promise<Interval[]> {
  try {
    const body = await call(token, `${API}/freeBusy`, {
      method: 'POST',
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TIMEZONE, items: [{ id: 'primary' }] }),
    });
    const calendar = body?.calendars?.primary;
    if (calendar?.errors?.length) throw new Error(`Google FreeBusy: ${calendar.errors[0].reason}`);
    return (calendar?.busy ?? []).map((item: { start: string; end: string }) => ({ starts_at: new Date(item.start).toISOString(), ends_at: new Date(item.end).toISOString() }));
  } catch (error) {
    if ((error as GoogleError).status === 403) return listBusy(token, from, to);
    throw error;
  }
}

// --- Push notifications -------------------------------------------------------------
export const webhookUrl = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-webhook`;

/** Asks Google to notify the webhook whenever an event in the primary calendar changes (max ~7 days). */
export async function watchCalendar(token: string, channelId: string, channelToken: string): Promise<{ resourceId: string; expiresAt: string }> {
  const body = await call(token, `${CALENDAR}/watch`, {
    method: 'POST',
    body: JSON.stringify({ id: channelId, type: 'web_hook', address: webhookUrl(), token: channelToken, params: { ttl: String(7 * 86_400) } }),
  });
  return { resourceId: body.resourceId, expiresAt: new Date(Number(body.expiration)).toISOString() };
}

export async function stopChannel(token: string, channelId: string, resourceId: string): Promise<void> {
  try {
    await call(token, `${API}/channels/stop`, { method: 'POST', body: JSON.stringify({ id: channelId, resourceId }) });
  } catch (error) {
    const status = (error as GoogleError).status;
    if (status !== 404) throw error; // already expired
  }
}
