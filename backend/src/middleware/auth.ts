import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import { env } from '../config/env';
import { findProfile, ProfileRow } from '../repositories/profiles';
import { AppError } from '../utils/AppError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The Supabase auth user — present as soon as the JWT is valid. */
      authUser?: { id: string; phone: string };
      /** The resident profile — only once onboarding has been completed. */
      user?: ProfileRow;
    }
  }
}

/**
 * Supabase signs access tokens with ES256 and publishes the public keys as a
 * JWKS — there is no shared secret to verify against. (Older projects used an
 * HS256 SUPABASE_JWT_SECRET; this one does not, and attempting HS256 here fails
 * with "invalid algorithm" rather than a signature mismatch.)
 *
 * createRemoteJWKSet caches the keys and refetches on rotation, so this costs
 * one request at startup rather than one per verification.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function keySet() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${env().SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

/**
 * Verifies the Supabase access token. Only token problems become 401 — a
 * configuration or network failure must surface as a 500, not be disguised as
 * "invalid token" (an earlier version masked a dead database that way and
 * silently signed everyone out).
 */
export async function requireSupabaseUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token'));

  try {
    const { payload } = await jwtVerify(token, keySet(), { audience: 'authenticated' });
    req.authUser = {
      id: String(payload.sub),
      phone: typeof payload.phone === 'string' ? payload.phone : '',
    };
    next();
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Session expired — sign in again'));
    }
    if (
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWSSignatureVerificationFailed ||
      err instanceof joseErrors.JWTClaimValidationFailed
    ) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid token'));
    }
    // Could not reach or parse the JWKS — our problem, not the caller's.
    console.error('[SUPABASE_JWT_VERIFY]', {
      reason: err instanceof Error ? err.message : 'unknown',
    });
    return next(err);
  }
}

/** Requires a verified Supabase user *and* a completed resident profile. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireSupabaseUser(req, res, async (err?: unknown) => {
    if (err) return next(err);
    try {
      const profile = await findProfile(req.authUser!.id);
      if (!profile) {
        return next(new AppError(403, 'PROFILE_INCOMPLETE', 'Finish setting up your profile first'));
      }
      req.user = profile;
      next();
    } catch (dbErr) {
      next(dbErr); // genuine failure — surfaces as 500
    }
  });
}
