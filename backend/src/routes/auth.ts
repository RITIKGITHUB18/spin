import { Router } from 'express';
import { z } from 'zod';
import {
  completeProfile,
  me,
  session,
  subscribePush,
  unsubscribePush,
  updatePushOptIn,
} from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { requireAuth, requireSupabaseUser } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  flat: z.string().trim().min(1).max(20),
});
const pushSchema = z.object({ pushOptIn: z.boolean() });

// Shape produced by PushSubscription.toJSON() in the browser.
const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
  }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2048) });

// No rate limiter here any more: Supabase applies its own throttling to OTP
// sends, and these routes require an already-verified session.
router.get('/session', requireSupabaseUser, asyncHandler(session));
router.post('/complete-profile', requireSupabaseUser, validateBody(profileSchema), asyncHandler(completeProfile));
router.get('/me', requireAuth, asyncHandler(me));
router.post('/push-opt-in', requireAuth, validateBody(pushSchema), asyncHandler(updatePushOptIn));
router.post('/push/subscribe', requireAuth, validateBody(subscribeSchema), asyncHandler(subscribePush));
router.post('/push/unsubscribe', requireAuth, validateBody(unsubscribeSchema), asyncHandler(unsubscribePush));

export default router;
