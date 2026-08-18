import { Request, Response } from 'express';
import { verifyAccessToken } from '../services/msg91';
import { createSession, findOrCreateUser } from '../services/supabaseAdmin';
import { recordVerification } from '../repositories/otpTransactions';
import { findProfile, serializeProfile } from '../repositories/profiles';
import { maskPhone, normalizeIndianPhone } from '../utils/phone';
import { logOtp } from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * The single OTP endpoint. The widget has already sent and verified the code in
 * the browser; all that arrives here is the resulting access token.
 *
 * Note what is NOT accepted: no phone number, no OTP, no `verified` flag. The
 * only phone this server will act on is the one MSG91 returns from
 * verifyAccessToken — anything the client claims about itself is ignored.
 */
export async function verifyToken(req: Request, res: Response): Promise<void> {
  const { accessToken } = req.body as { accessToken: string };
  logOtp('OTP_VERIFY_REQUEST');

  let identifier: string;
  try {
    ({ identifier } = await verifyAccessToken(accessToken));
  } catch (err) {
    logOtp('OTP_VERIFY_FAILURE', {
      reason: err instanceof AppError ? err.code : 'unknown',
    });
    throw err;
  }

  // MSG91 returns the identifier in whatever format the widget sent it
  // (typically 919876543210); normalising here keeps one representation across
  // MSG91, Supabase and our own tables.
  const phone = normalizeIndianPhone(identifier);

  const user = await findOrCreateUser(phone);
  logOtp(user.isNew ? 'SUPABASE_USER_CREATED' : 'SUPABASE_USER_FOUND', {
    phone: maskPhone(phone),
    userId: user.id,
  });

  const session = await createSession(phone);
  const profile = await findProfile(user.id);

  // Audit only — never a prerequisite for the flow, so a failed insert must not
  // cost a user their sign-in.
  void recordVerification(phone).catch(() => undefined);

  logOtp('OTP_VERIFY_SUCCESS', { phone: maskPhone(phone), userId: user.id });

  // The MSG91 access token is deliberately absent from this response: it is an
  // internal artefact of provider verification, not a client credential.
  res.json({
    success: true,
    isNewUser: profile === null,
    user: { id: user.id, phone },
    profile: profile ? serializeProfile(profile) : null,
    session,
  });
}
