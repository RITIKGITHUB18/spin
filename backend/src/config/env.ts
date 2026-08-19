import { z } from 'zod';

/**
 * Validated once at boot so a missing secret fails immediately with a clear
 * message, rather than surfacing as an opaque 500 on the first OTP request.
 */
const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /**
   * No longer used. This project's Supabase issues ES256 tokens verified
   * against its published JWKS, so there is no shared secret. Kept optional
   * only so existing .env files do not fail validation.
   */
  SUPABASE_JWT_SECRET: z.string().optional(),

  SUPABASE_URL: z.string().url('SUPABASE_URL must be the https project URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  /**
   * The account Authkey, used for exactly one call: verifyAccessToken. The
   * widget id and Token Auth are NOT here — they are public widget config and
   * belong to the frontend, which now runs send/retry/verify in the browser.
   */
  /**
   * The ONLY credential verifyAccessToken may use. MSG91 rejects the widget's
   * tokenAuth here, and sending the widget id instead produces the same opaque
   * AuthenticationFailure as a wrong key — so the two below are deliberately
   * never passed to that endpoint.
   */
  MSG91_AUTH_KEY: z.string().min(1, 'MSG91_AUTH_KEY is required'),
  /**
   * Browser-side widget config. Not used by verifyAccessToken; required here
   * only so a deployment missing them fails loudly at boot rather than at a
   * resident's first sign-in, and so the boot line can report widget config.
   */
  MSG91_WIDGET_ID: z.string().min(1, 'MSG91_WIDGET_ID is required'),
  MSG91_TOKEN_AUTH: z.string().min(1, 'MSG91_TOKEN_AUTH is required'),
  /**
   * Kept configurable so the widget host can be corrected without a code
   * change. Defaulted rather than required: existing deployments do not set it,
   * and making it mandatory would stop them booting on upgrade.
   */
  MSG91_BASE_URL: z.string().url().default('https://control.msg91.com/api/v5/widget'),

  /**
   * Derives each Supabase user's password. Supabase has no admin "issue a
   * session" call, so the server signs in as the user with a password only it
   * can compute — see services/supabaseAdmin.ts. Rotating this invalidates
   * nobody: the password is recomputed and reset on each sign-in.
   */
  AUTH_PASSWORD_SECRET: z.string().min(16, 'AUTH_PASSWORD_SECRET must be at least 16 chars'),

  /**
   * Supabase's Phone provider cannot be enabled without one of its supported
   * SMS vendors, and MSG91 is not among them — so phone sign-in is refused with
   * `phone_provider_disabled` even though MSG91 has already verified the
   * number. Each user therefore gets a deterministic address at this domain as
   * their Supabase login identity. No mail is ever sent to it: accounts are
   * created pre-confirmed, and the phone remains the real identity everywhere
   * else in the app.
   */
  AUTH_EMAIL_DOMAIN: z.string().min(3).default('phone.spin.local'),

  /**
   * Web Push (VAPID). Optional on purpose: without them the app still runs and
   * still writes in-app notifications — only the browser delivery is skipped.
   * A missing key should not take the whole API down.
   */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  /** Contact for the push service if a send misbehaves; mailto: or https URL. */
  VAPID_SUBJECT: z.string().default('mailto:admin@spin.local'),

  // The OTP cooldown / attempt / expiry knobs are gone: those are now the
  // widget's dashboard settings, and keeping server copies would imply a
  // control this backend no longer has.

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  BUILDING_NAME: z.string().default('Maple Court'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function corsOrigins(): string[] {
  return env()
    .CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
