// Google Calendar push notifications. Google calls this whenever an event changes in a connected
// calendar (new, edited, moved or deleted); that calendar's busy times are then re-synced.
// The channel ID and secret token are checked against google_connection, so other callers are ignored.
// Deploy with: supabase functions deploy google-calendar-webhook --no-verify-jwt (Google sends no JWT).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve(async (request) => {
  const channelId = request.headers.get('X-Goog-Channel-ID') || '';
  const token = request.headers.get('X-Goog-Channel-Token') || '';
  const state = request.headers.get('X-Goog-Resource-State') || '';
  if (!channelId || !token) return new Response('ignored', { status: 200 });

  const { data: connection } = await supabase.from('google_connection').select('id, watch_token').eq('watch_channel_id', channelId).maybeSingle();
  // Always 200 so Google does not retry; unknown or stale channels simply expire.
  if (!connection || connection.watch_token !== token || state === 'sync') return new Response('ok', { status: 200 });

  await supabase.from('google_connection').update({ sync_requested_at: new Date().toISOString() }).eq('id', connection.id);

  // Run the worker now instead of waiting for the next minute.
  try {
    const { data: secret } = await supabase.rpc('get_worker_secret');
    if (secret) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/booking-worker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(20_000),
      });
    }
  } catch (error) {
    console.error('Could not start the worker (the minute job will sync instead):', error);
  }
  return new Response('ok', { status: 200 });
});
