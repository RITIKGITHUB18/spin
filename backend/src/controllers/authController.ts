import { Request, Response } from 'express';
import { createProfile, findProfile, serializeProfile, setPushOptIn } from '../repositories/profiles';
import {
  BrowserSubscription,
  deleteAllForUser,
  deleteSubscription,
  saveSubscription,
} from '../repositories/pushSubscriptions';
import { normalizeIndianPhone } from '../utils/phone';
import { AppError } from '../utils/AppError';

/**
 * Phone + OTP now happens entirely in Supabase Auth on the client, so there is
 * no request-otp/verify-otp here any more. By the time a request reaches this
 * file the caller already holds a verified Supabase session; what is left is
 * the resident profile the app collects afterwards.
 */

export async function session(req: Request, res: Response): Promise<void> {
  const profile = await findProfile(req.authUser!.id);
  res.json({
    isNewUser: profile === null,
    user: profile ? serializeProfile(profile) : null,
  });
}

export async function completeProfile(req: Request, res: Response): Promise<void> {
  const { fullName, flat } = req.body as { fullName: string; flat: string };
  const { id, phone } = req.authUser!;

  const existing = await findProfile(id);
  if (existing) throw new AppError(409, 'USER_EXISTS', 'Profile already set up for this account');

  // Supabase's JWT carries the phone without a '+', while otp_transactions and
  // every lookup elsewhere use E.164. Storing the raw claim left profiles as the
  // one table in a different format — harmless until something joins on it.
  const profile = await createProfile({
    id,
    phone: normalizeIndianPhone(phone),
    fullName,
    flat,
    buildingName: process.env.BUILDING_NAME || 'Maple Court',
  });

  res.status(201).json({ user: serializeProfile(profile) });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: serializeProfile(req.user!) });
}

export async function updatePushOptIn(req: Request, res: Response): Promise<void> {
  const { pushOptIn } = req.body as { pushOptIn: boolean };
  const profile = await setPushOptIn(req.user!.id, pushOptIn);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Profile not found');

  // Switching off drops the stored devices too, so nothing lingers that could
  // be revived by a later flag flip on a browser the user has since abandoned.
  if (!pushOptIn) await deleteAllForUser(req.user!.id);

  res.json({ user: serializeProfile(profile) });
}

/** Registers this browser/device for push. */
export async function subscribePush(req: Request, res: Response): Promise<void> {
  const { subscription } = req.body as { subscription: BrowserSubscription };
  await saveSubscription(req.user!.id, subscription);
  res.json({ ok: true });
}

/** Removes one device — the browser has already unsubscribed locally. */
export async function unsubscribePush(req: Request, res: Response): Promise<void> {
  const { endpoint } = req.body as { endpoint: string };
  await deleteSubscription(endpoint);
  res.json({ ok: true });
}
