/**
 * MSG91 OTP Widget API — called directly from the browser.
 *
 * This deliberately does NOT use MSG91's otp-provider.js script. That script
 * enforces a CAPTCHA which never rendered on our origin (isCaptchaVerified()
 * stayed false forever, so every send was rejected with "Invalid Captcha
 * Token"). The underlying widget API has no such requirement — the same call
 * succeeds from a browser with only the widget credentials.
 *
 * Both credentials here are public widget config, exactly what the MSG91 script
 * would have shipped in the bundle itself. The account Authkey is NOT here: it
 * stays server-side and is used only for verifyAccessToken.
 *
 * Architecture is unchanged — the browser owns send/retry/verify, and the
 * backend only validates the resulting access token.
 */

const BASE_URL = 'https://control.msg91.com/api/v5/widget';

const widgetId = import.meta.env.VITE_MSG91_WIDGET_ID;
const tokenAuth = import.meta.env.VITE_MSG91_TOKEN_AUTH;

export const msg91Configured = Boolean(widgetId && tokenAuth);

interface Msg91Response {
  type?: string;
  message?: unknown;
}

/**
 * MSG91 wants the token in BOTH the `tokenauth` header and the body. Sending it
 * in the body alone is rejected with a 401.
 */
async function call(path: string, body: Record<string, unknown>): Promise<string> {
  if (!msg91Configured) {
    throw new Error('OTP is not configured. Set VITE_MSG91_WIDGET_ID and VITE_MSG91_TOKEN_AUTH.');
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', tokenauth: tokenAuth },
      body: JSON.stringify({ tokenAuth, widgetId, ...body }),
    });
  } catch {
    throw new Error('Could not reach the OTP service. Check your connection.');
  }

  const json = (await res.json().catch(() => ({}))) as Msg91Response;

  // MSG91 answers HTTP 200 even for failures and signals them through `type`,
  // so res.ok alone would treat every rejection as a success.
  if (!res.ok || json.type === 'error') {
    const detail = typeof json.message === 'string' ? json.message : 'Please try again.';
    throw new Error(detail);
  }

  // On success the payload is a bare string in `message` — the reqId for
  // sendOtp/retryOtp, the access token for verifyOtp.
  if (typeof json.message !== 'string' || !json.message) {
    throw new Error('Unexpected response from the OTP service. Please try again.');
  }
  return json.message;
}

/** MSG91's identifier is E.164 without the '+', e.g. 919876543210. */
export function toMsg91Identifier(tenDigits: string): string {
  return `91${tenDigits.replace(/\D/g, '').slice(-10)}`;
}

/** Sends the OTP. Returns the reqId needed by retry and verify. */
export function sendOtp(identifier: string): Promise<string> {
  return call('sendOtp', { identifier });
}

/** Re-sends over SMS. retryChannel '11' is MSG91's SMS channel. */
export function retryOtp(reqId: string): Promise<string> {
  return call('retryOtp', { reqId, retryChannel: '11' });
}

/**
 * Verifies the code and returns MSG91's access token. Whether the OTP is
 * correct is MSG91's decision, never ours.
 */
export function verifyOtp(reqId: string, otp: string): Promise<string> {
  return call('verifyOtp', { reqId, otp });
}
