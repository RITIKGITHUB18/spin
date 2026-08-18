import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  sub: string;
  purpose: 'session';
}

export interface OnboardingTokenPayload {
  phone: string;
  purpose: 'onboarding';
}

function secret(): string {
  return process.env.JWT_SECRET || 'devsecret_change_me';
}

export function signSessionToken(userId: string): string {
  const payload: AuthTokenPayload = { sub: userId, purpose: 'session' };
  return jwt.sign(payload, secret(), { expiresIn: '7d' });
}

export function signOnboardingToken(phone: string): string {
  const payload: OnboardingTokenPayload = { phone, purpose: 'onboarding' };
  return jwt.sign(payload, secret(), { expiresIn: '15m' });
}

export function verifyToken(token: string): AuthTokenPayload | OnboardingTokenPayload {
  return jwt.verify(token, secret()) as AuthTokenPayload | OnboardingTokenPayload;
}
