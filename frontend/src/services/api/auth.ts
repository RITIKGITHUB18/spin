import { api } from './client';
import { supabase } from '../supabase';
import type { AuthUser } from '../../store/authStore';

/**
 * OTP send/resend/verify all happen in the MSG91 widget in the browser — see
 * services/msg91Widget.ts. The only thing that reaches our API is the access
 * token MSG91 issues afterwards, which the server validates back with MSG91
 * before trusting any phone number.
 */

interface VerifyTokenResponse {
  success: boolean;
  isNewUser: boolean;
  user: { id: string; phone: string };
  profile: AuthUser | null;
  session: { access_token: string; refresh_token: string };
}

/**
 * Exchanges the MSG91 access token for a Supabase session and installs it.
 * Handing the tokens to supabase-js keeps it the owner of persistence and
 * refresh, so everything downstream is unchanged.
 */
export async function verifyAccessToken(accessToken: string): Promise<VerifyTokenResponse> {
  const { data } = await api.post<VerifyTokenResponse>('/auth/otp/verify-token', { accessToken });

  const { error } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (error) throw error;

  return data;
}

/**
 * Whether this verified account has finished onboarding. Uses /auth/session,
 * which needs only a valid token — /auth/me requires a profile and 403s when
 * that is exactly what we are trying to find out.
 */
export async function fetchSession() {
  const { data } = await api.get<{ isNewUser: boolean; user: AuthUser | null }>('/auth/session');
  return data;
}

export async function completeProfile(fullName: string, flat: string) {
  const { data } = await api.post<{ user: AuthUser }>('/auth/complete-profile', { fullName, flat });
  return data;
}

/** Persists the resident's push preference — profiles.push_opt_in. */
export async function setPushOptIn(pushOptIn: boolean) {
  const { data } = await api.post<{ user: AuthUser }>('/auth/push-opt-in', { pushOptIn });
  return data.user;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data.user;
}
