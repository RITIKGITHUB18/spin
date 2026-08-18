import { getPool } from '../config/db';

/**
 * Audit trail only.
 *
 * The MSG91 widget owns the OTP lifecycle in the browser, so this server never
 * sees a code, an expiry or an attempt count — and nothing here gates a
 * sign-in. It exists so there is a record of which numbers completed
 * verification and when, for support and abuse review.
 *
 * The OTP itself is, as before, never stored.
 */
export async function recordVerification(phoneE164: string): Promise<void> {
  await getPool().query(
    `insert into otp_transactions (phone, status, verified_at, expires_at)
     values ($1, 'verified', now(), now())`,
    [phoneE164]
  );
}

/** Completed verifications for a phone in the last N hours — for abuse review. */
export async function countRecentVerifications(phoneE164: string, hours = 24): Promise<number> {
  const { rows } = await getPool().query<{ n: string }>(
    `select count(*)::text as n from otp_transactions
      where phone = $1 and created_at > now() - make_interval(hours => $2)`,
    [phoneE164, hours]
  );
  return Number(rows[0].n);
}
