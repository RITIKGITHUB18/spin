import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { verifyToken } from '../controllers/otpController';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * There is no /send or /resend here on purpose: the MSG91 widget issues and
 * resends OTPs directly from the browser, and its own dashboard configuration
 * governs those limits. Adding backend endpoints would only duplicate — and
 * could not enforce — behaviour we no longer control.
 *
 * This limiter guards the one thing we do own: token verification, which is
 * what an attacker would hammer trying to brute-force a token.
 */
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'OTP_RATE_LIMITED', message: 'Too many attempts. Please wait.' },
});

const verifyTokenSchema = z.object({
  // Bounded so an oversized body cannot be forwarded to MSG91; the token is a
  // JWT, comfortably under 4k.
  accessToken: z.string().trim().min(10).max(4096),
});

router.post('/verify-token', verifyLimiter, validateBody(verifyTokenSchema), asyncHandler(verifyToken));

export default router;
