// Connects the admin's Google Workspace calendar.
//  POST (from the admin dashboard, with the admin's session): returns the Google consent URL.
//  GET  (Google redirects back here with ?code&state): stores the refresh token, then returns to /admin.
// Deploy with: supabase functions deploy google-oauth --no-verify-jwt (POST checks the admin session itself).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { exchangeCode, googleAuthUrl } from '../_shared/google.ts';

const SITE = (Deno.env.get('SITE_URL') || 'https://sthenofy.com').replace(/\/$/, '');
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const encoder = new TextEncoder();

function cors(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = [SITE, 'https://www.sthenofy.com', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : SITE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(value: string): Promise<string> {
  const { data: secret } = await supabase.rpc('get_worker_secret');
  if (!secret) throw new Error('Worker secret missing; run the notifications migration.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret as string), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function signState(userId: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ uid: userId, exp: Date.now() + 10 * 60_000 })));
  return `${payload}.${await hmac(payload)}`;
}

async function verifyState(state: string): Promise<boolean> {
  const [payload, signature] = state.split('.');
  if (!payload || !signature || signature !== await hmac(payload)) return false;
  const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  return typeof exp === 'number' && exp > Date.now();
}

const backToAdmin = (status: string, reason = '') =>
  Response.redirect(`${SITE}/admin?google=${status}${reason ? `&reason=${encodeURIComponent(reason.slice(0, 200))}` : ''}`, 302);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(request) });

  if (request.method === 'POST') {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(request), 'Content-Type': 'application/json' } });
    try {
      const jwt = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (!user) return json(401, { error: 'Sign in to the admin dashboard first.' });
      const { data: admin } = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!admin) return json(403, { error: 'Only admins can connect Google Calendar.' });
      return json(200, { url: googleAuthUrl(await signState(user.id)) });
    } catch (error) {
      return json(500, { error: error instanceof Error ? error.message : 'Unable to start Google sign-in.' });
    }
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.searchParams.get('error')) return backToAdmin('error', url.searchParams.get('error') || 'cancelled');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';
    if (!code || !(await verifyState(state))) return backToAdmin('error', 'The sign-in link expired. Please try again.');
    try {
      const { refreshToken, email } = await exchangeCode(code);
      const { error } = await supabase.from('google_connection').upsert({
        id: 1, email, refresh_token: refreshToken, connected_at: new Date().toISOString(), last_busy_sync_at: null, last_error: null,
      });
      if (error) throw error;
      return backToAdmin('connected');
    } catch (error) {
      return backToAdmin('error', error instanceof Error ? error.message : 'Google sign-in failed.');
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
