import axios from 'axios';
import { supabase } from '../supabase';
import { useAuthStore } from '../../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(async (config) => {
  // Read the token from supabase-js rather than the store: it refreshes tokens
  // in the background, so this always sends the current one.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Only a genuinely rejected token signs the user out. A 403
    // PROFILE_INCOMPLETE means onboarding is unfinished, and a 500 means the
    // server is broken — neither should look like "logged out".
    if (err.response?.status === 401) {
      await supabase.auth.signOut();
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

export interface ApiErrorBody {
  error: { message: string; code: string };
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  return body?.error?.message || fallback;
}

/**
 * Auth errors can come from either side now: Supabase (a plain Error from
 * supabase-js) or our own API (an axios error with the {error:{message}} body).
 */
export function authErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  if (body?.error?.message) return body.error.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
