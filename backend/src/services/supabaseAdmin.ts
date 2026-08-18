import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * Server-only Supabase client. Holds the service-role key, which bypasses row
 * level security — it must never be constructed in, or reachable from, browser
 * code.
 */
let admin: SupabaseClient | undefined;

function client(): SupabaseClient {
  if (!admin) {
    admin = createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return admin;
}

/**
 * Supabase exposes no admin API for minting a session, and its phone sign-in
 * path would make Supabase send its own OTP — which is exactly what MSG91 is
 * replacing. So the server signs in as the user with a password only it can
 * compute: HMAC(phone, AUTH_PASSWORD_SECRET).
 *
 * The password is never stored by us, never leaves the process and is never
 * shown to the user. It is reset on every sign-in, so rotating
 * AUTH_PASSWORD_SECRET locks nobody out. The trade-off is that anyone holding
 * that secret could mint a session for any phone — the same blast radius as the
 * service-role key it sits beside, so guard both equally.
 */
function derivePassword(phoneE164: string): string {
  return crypto
    .createHmac('sha256', env().AUTH_PASSWORD_SECRET)
    .update(phoneE164)
    .digest('base64url');
}

/**
 * The Supabase login identity for a verified phone.
 *
 * Supabase refuses phone sign-in unless its Phone provider is enabled, and that
 * requires one of its supported SMS vendors — MSG91 is not one, so the toggle
 * is unavailable. Email logins are on by default, so each phone maps to a
 * stable address instead. Nothing is ever delivered here: users are created
 * with email_confirm, and `profiles.phone` stays the real identity.
 */
function emailFor(phoneE164: string): string {
  return `${phoneE164.replace(/^\+/, '')}@${env().AUTH_EMAIL_DOMAIN}`;
}

/**
 * Supabase stores `auth.users.phone` in E.164 without the leading '+'.
 * Queried through our existing pool rather than admin.listUsers(), which pages
 * through every user and has no phone filter.
 */
async function findUserIdByPhone(phoneE164: string): Promise<string | null> {
  const bare = phoneE164.replace(/^\+/, '');
  // Matches on the synthetic email as well as the phone, so accounts created
  // before this switch are reused rather than duplicated.
  const { rows } = await getPool().query<{ id: string }>(
    'select id from auth.users where phone in ($1, $2) or email = $3 limit 1',
    [bare, phoneE164, emailFor(phoneE164)]
  );
  return rows[0]?.id ?? null;
}

export interface AuthedUser {
  id: string;
  phone: string;
  isNew: boolean;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

/** Finds or creates the Supabase auth user for an already-verified phone. */
export async function findOrCreateUser(phoneE164: string): Promise<AuthedUser> {
  const password = derivePassword(phoneE164);
  const email = emailFor(phoneE164);
  const existingId = await findUserIdByPhone(phoneE164);

  if (existingId) {
    // Re-assert the derived password so a rotated secret still signs in, and
    // backfill the email on accounts created before the switch — without it
    // they could never sign in again.
    const { error } = await client().auth.admin.updateUserById(existingId, {
      password,
      email,
      email_confirm: true,
    });
    if (error) {
      console.error('[SUPABASE_UPDATE_USER]', { status: error.status, code: error.code, message: error.message });
      throw new AppError(500, 'AUTH_FAILED', 'Could not complete sign-in');
    }
    return { id: existingId, phone: phoneE164, isNew: false };
  }

  // Both confirmations are correct here: MSG91 proved the phone, and the email
  // is synthetic so there is nothing to confirm and no mail to send.
  const { data, error } = await client().auth.admin.createUser({
    email,
    email_confirm: true,
    phone: phoneE164,
    phone_confirm: true,
    password,
  });
  if (error || !data.user) {
    console.error('[SUPABASE_CREATE_USER]', { status: error?.status, code: error?.code, message: error?.message });
    throw new AppError(500, 'AUTH_FAILED', 'Could not create your account');
  }

  return { id: data.user.id, phone: phoneE164, isNew: true };
}

/** Exchanges the verified phone for a genuine Supabase session. */
export async function createSession(phoneE164: string): Promise<SupabaseSession> {
  // Signs in by the synthetic email, not the phone — see emailFor().
  const { data, error } = await client().auth.signInWithPassword({
    email: emailFor(phoneE164),
    password: derivePassword(phoneE164),
  });

  if (error || !data.session) {
    // Log the provider's own reason: a bare "Could not complete sign-in" hides
    // configuration faults that look identical to a credential mismatch.
    console.error('[SUPABASE_SIGN_IN]', {
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });

    // Phone sign-in has to be switched on for this flow to work at all, even
    // though Supabase never sends an OTP here — MSG91 already did.
    if (error?.code === 'phone_provider_disabled') {
      throw new AppError(
        503,
        'AUTH_PROVIDER_DISABLED',
        'Sign-in is not fully configured yet. Please try again shortly.'
      );
    }
    throw new AppError(500, 'AUTH_FAILED', 'Could not complete sign-in');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
}
