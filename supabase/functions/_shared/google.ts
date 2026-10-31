// Google Calendar helpers (OAuth refresh-token flow for the connected Workspace account).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
export const GOOGLE_SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events';
export const TIMEZONE = 'Asia/Kolkata';

export class GoogleAuthError extends Error {}

function clientCredentials() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.');
  return { clientId, clientSecret };
}

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
    prompt: 'consent',
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

async function call(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Google Calendar error ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

export interface CalendarBooking {
  id: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  attendeeEmail: string | null;
  attendeeName: string;
}

/** Creates the event with a Google Meet link and emails the customer a Google invite. */
export async function createEvent(token: string, booking: CalendarBooking): Promise<{ eventId: string; meetLink: string | null }> {
  const event = await call(token, `${CALENDAR}?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    body: JSON.stringify({
      summary: booking.summary,
      description: booking.description,
      start: { dateTime: booking.startsAt, timeZone: TIMEZONE },
      end: { dateTime: booking.endsAt, timeZone: TIMEZONE },
      attendees: booking.attendeeEmail ? [{ email: booking.attendeeEmail, displayName: booking.attendeeName }] : [],
      conferenceData: { createRequest: { requestId: booking.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      extendedProperties: { private: { sthenofy_booking_id: booking.id } },
      reminders: { useDefault: true },
    }),
  });
  let meetLink: string | null = event.hangoutLink ?? null;
  if (!meetLink && event.conferenceData?.createRequest?.status?.statusCode === 'pending') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const refreshed = await call(token, `${CALENDAR}/${event.id}`);
    meetLink = refreshed.hangoutLink ?? null;
  }
  return { eventId: event.id, meetLink };
}

export async function moveEvent(token: string, eventId: string, startsAt: string, endsAt: string): Promise<void> {
  await call(token, `${CALENDAR}/${eventId}?sendUpdates=all`, {
    method: 'PATCH',
    body: JSON.stringify({ start: { dateTime: startsAt, timeZone: TIMEZONE }, end: { dateTime: endsAt, timeZone: TIMEZONE } }),
  });
}

export async function deleteEvent(token: string, eventId: string): Promise<void> {
  try {
    await call(token, `${CALENDAR}/${eventId}?sendUpdates=all`, { method: 'DELETE' });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status !== 404 && status !== 410) throw error; // already gone
  }
}

/** Busy times in the connected calendar, excluding events this site created. */
export async function listBusy(token: string, from: Date, to: Date): Promise<{ starts_at: string; ends_at: string }[]> {
  const busy: { starts_at: string; ends_at: string }[] = [];
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
