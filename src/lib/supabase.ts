import { createClient } from '@supabase/supabase-js';

/**
 * True when the page was opened from an invite or password-reset email link. Read before the
 * client is created, because the client consumes and clears those URL parameters.
 */
export const openedFromPasswordEmail = /type=(invite|recovery)/.test(`${window.location.hash}${window.location.search}`);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
