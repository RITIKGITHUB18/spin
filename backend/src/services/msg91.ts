import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * MSG91 — server-side half of the OTP Widget flow, and nothing else.
 *
 * The browser owns send/retry/verify (see frontend services/msg91Widget.ts).
 * This module's single job is to take the access token the widget produced and
 * validate it server-to-server, because that is the only way to learn which
 * identifier was actually verified.
 *
 * The access token is a JWT, but we deliberately never decode or verify it
 * locally: MSG91 owns the signing key, and its payload carries only requestId
 * and companyId — no phone number. The identifier can only come from MSG91's
 * response to this call.
 *
 * There is intentionally no sendOtp/retryOtp/verifyOtp here, and no shared
 * request helper: this endpoint authenticates with the account Authkey, which
 * is a different mechanism from the widget's Token Auth, so it gets its own
 * explicit implementation rather than being forced through a generic caller.
 */

const ENDPOINT_PATH = 'verifyAccessToken';

/** MSG91 answers HTTP 200 for failures too, signalling them via `type`. */
interface Msg91VerifyAccessTokenResponse {
  type?: 'success' | 'error' | string;
  /**
   * On success this is the verified payload — sometimes a bare identifier
   * string, sometimes an object. On failure it is an error string such as
   * "AuthenticationFailure".
   */
  message?: string | Msg91VerifiedPayload;
  code?: string | number;
  /** Some responses put the identifier at the top level instead. */
  identifier?: string;
  mobile?: string;
  phone?: string;
}

interface Msg91VerifiedPayload {
  identifier?: string;
  mobile?: string;
  phone?: string;
  number?: string;
  contact?: string;
  [key: string]: unknown;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Walks the documented shapes and then, as a fallback, any string field whose
 * value looks like a phone number. MSG91 has moved this field between releases,
 * so a rigid parser silently breaks on upgrade.
 */
function extractIdentifier(json: Msg91VerifyAccessTokenResponse): string | null {
  const direct =
    readString(json.identifier) ?? readString(json.mobile) ?? readString(json.phone);
  if (direct) return direct;

  const msg = json.message;
  if (typeof msg === 'string') {
    // A bare identifier is returned as the whole message on some versions.
    return /^\+?\d{10,15}$/.test(msg.trim()) ? msg.trim() : null;
  }
  if (msg && typeof msg === 'object') {
    const known =
      readString(msg.identifier) ??
      readString(msg.mobile) ??
      readString(msg.phone) ??
      readString(msg.number) ??
      readString(msg.contact);
    if (known) return known;

    for (const value of Object.values(msg)) {
      const s = readString(value);
      if (s && /^\+?\d{10,15}$/.test(s)) return s;
    }
  }
  return null;
}

/** Never log a whole token — only enough to correlate with a request. */
function maskToken(token: string): string {
  return token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : '***';
}

export async function verifyAccessToken(accessToken: string): Promise<{ identifier: string }> {
  const { MSG91_BASE_URL, MSG91_AUTH_KEY, NODE_ENV } = env();
  const url = `${MSG91_BASE_URL}/${ENDPOINT_PATH}`;

  // Exactly the shape MSG91's dashboard publishes under the widget's
  // "Server Side Integration": JSON body, authkey in the body only, and no
  // authkey header. Verified against the live endpoint.
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ authkey: MSG91_AUTH_KEY, 'access-token': accessToken }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    // Network failure or timeout — distinct from a rejected token.
    console.error('[MSG91_VERIFY_ACCESS_TOKEN] network', {
      endpoint: url,
      reason: err instanceof Error ? err.name : 'unknown',
      token: maskToken(accessToken),
    });
    throw new AppError(
      503,
      'OTP_PROVIDER_UNAVAILABLE',
      'Unable to verify OTP right now. Please try again.'
    );
  }

  let json: Msg91VerifyAccessTokenResponse;
  try {
    json = (await res.json()) as Msg91VerifyAccessTokenResponse;
  } catch {
    console.error('[MSG91_VERIFY_ACCESS_TOKEN] malformed body', {
      endpoint: url,
      status: res.status,
      token: maskToken(accessToken),
    });
    throw new AppError(
      502,
      'OTP_PROVIDER_UNAVAILABLE',
      'Unable to verify OTP right now. Please try again.'
    );
  }

  const providerMessage = typeof json.message === 'string' ? json.message : '[object]';

  const providerRejected = !res.ok || json.type === 'error';

  // Always log a rejection, including in production. Without this a failed
  // verify is a bare 401 with nothing on the server explaining why, which
  // makes "spent token" and "wrong account credential" indistinguishable from
  // the outside. Secrets are excluded by construction: no authkey, and the
  // token is masked.
  if (NODE_ENV !== 'production' || providerRejected) {
    console.error('[MSG91_VERIFY_ACCESS_TOKEN]', {
      endpoint: url,
      status: res.status,
      responseType: json.type,
      responseCode: json.code,
      responseKeys: Object.keys(json),
      responseMessage: providerMessage,
      token: maskToken(accessToken),
    });
  }

  if (providerRejected) {
    // Probed against the live endpoint (HTTP is always 200; the real status is
    // in the body):
    //   code 701, "invalid access-token"   -> credential fine, token is not
    //   code 201, "AuthenticationFailure"  -> the AUTHKEY is wrong
    // The distinction matters enormously: a wrong authkey used to fall through
    // to OTP_TOKEN_INVALID, so a misconfigured server told every user their
    // correct code was wrong, and gave the operator a 401 pointing at the
    // token rather than at the credential.
    const code = String(json.code ?? '');
    const authFailed = code === '201' || code === '401' || /authenticationfailure/i.test(providerMessage);

    if (/ipblock/i.test(providerMessage)) {
      console.error('[MSG91_VERIFY_ACCESS_TOKEN] MSG91 is rate-limiting this server IP.');
      throw new AppError(
        503,
        'OTP_PROVIDER_UNAVAILABLE',
        'Unable to verify OTP right now. Please try again.'
      );
    }

    if (authFailed) {
      console.error(
        '[MSG91_VERIFY_ACCESS_TOKEN] MSG91 rejected our AUTHKEY (not the user’s ' +
          'code). Check MSG91_AUTH_KEY on this server against the widget’s ' +
          'Server Side Integration page.',
        { responseCode: code, responseMessage: providerMessage }
      );
      throw new AppError(
        503,
        'OTP_PROVIDER_UNAVAILABLE',
        'Unable to verify OTP right now. Please try again.'
      );
    }

    throw new AppError(401, 'OTP_TOKEN_INVALID', 'OTP verification failed');
  }

  const identifier = extractIdentifier(json);
  if (!identifier) {
    // Verified, but we cannot read who — a provider fault, never a signed-in user.
    console.error('[MSG91_VERIFY_ACCESS_TOKEN] no identifier in success response', {
      responseKeys: Object.keys(json),
      messageKeys: json.message && typeof json.message === 'object' ? Object.keys(json.message) : null,
    });
    throw new AppError(
      502,
      'OTP_PROVIDER_UNAVAILABLE',
      'Unable to verify OTP right now. Please try again.'
    );
  }

  return { identifier };
}
