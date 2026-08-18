import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until .env is filled in — checked by main.tsx before rendering. */
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  console.error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing — copy .env.example to .env.'
  );
}

// Placeholders keep createClient from throwing at import time; without them a
// missing .env would blank the page before React ever mounts.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** The UI collects 10 digits; Supabase Auth requires E.164. */
export function toE164(tenDigits: string): string {
  return `+91${tenDigits}`;
}

/**
 * Mirrors the Supabase session into the auth store so route guards and the API
 * client can read it synchronously. supabase-js owns persistence and refresh —
 * the store is only a view onto it, never the source of truth.
 */
export function initAuthBridge(): void {
  void supabase.auth.getSession().then(({ data }) => {
    useAuthStore.getState().setToken(data.session?.access_token ?? null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const store = useAuthStore.getState();
    if (session) store.setToken(session.access_token);
    else store.logout();
  });
}
