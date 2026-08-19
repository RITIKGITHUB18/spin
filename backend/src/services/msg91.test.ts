import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError';

// env() validates at first use, so give it the minimum it requires before the
// module under test is imported.
beforeAll(() => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgres://test',
    SUPABASE_JWT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
    MSG91_AUTH_KEY: 'test-authkey',
    // Required by the schema so a deployment cannot silently miss them.
    // Never sent to verifyAccessToken — see the assertion on the request body.
    MSG91_WIDGET_ID: 'test-widget-id',
    MSG91_TOKEN_AUTH: 'test-token-auth',
    AUTH_PASSWORD_SECRET: '0123456789abcdef0123',
    NODE_ENV: 'test',
  });
});

const { verifyAccessToken } = await import('./msg91');

/** MSG91 answers HTTP 200 for failures too, so tests mirror that. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifyAccessToken', () => {
  it('sends the JSON body MSG91 documents', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ type: 'success', message: '919876543210' }));
    vi.stubGlobal('fetch', fetchMock);

    await verifyAccessToken('tok_abcdefghijklmnop');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/verifyAccessToken');
    // Guards against the double-segment bug: .../widget/widget/verifyAccessToken
    expect(String(url)).not.toContain('/widget/widget/');
    expect(init.headers['Content-Type']).toBe('application/json');
    // The dashboard's contract sends the authkey in the body only.
    expect(init.headers.authkey).toBeUndefined();
    const sent = JSON.parse(init.body as string);
    expect(sent['access-token']).toBe('tok_abcdefghijklmnop');
    expect(sent.authkey).toBe('test-authkey');
  });

  it('returns the identifier from a bare-string success message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ type: 'success', message: '919876543210' })));
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).resolves.toEqual({
      identifier: '919876543210',
    });
  });

  it('returns the identifier when nested under message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'success', message: { identifier: '919876543210' } }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).resolves.toEqual({
      identifier: '919876543210',
    });
  });

  it('maps a network failure to OTP_PROVIDER_UNAVAILABLE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
      status: 503,
    });
  });

  it('maps a rejected token to OTP_TOKEN_INVALID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'error', message: 'Invalid token', code: '400' }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      code: 'OTP_TOKEN_INVALID',
      status: 401,
    });
  });

  it('reports a rejected authkey (201) as a provider problem, not a bad OTP', async () => {
    // Code 201/AuthenticationFailure means MSG91 never accepted our credential;
    // telling the user
    // their OTP was wrong would send them round a loop they cannot fix.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'error', message: 'AuthenticationFailure', code: 201 }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      status: 503,
      code: 'OTP_PROVIDER_AUTH_FAILURE',
    });
  });

  it('reports an IP/credential rejection (418) as OTP_PROVIDER_AUTH_FAILURE', async () => {
    // Observed from an AWS host whose key returns 701 from a permitted IP.
    // This must never surface as OTP_TOKEN_INVALID: the resident's code was
    // fine, and telling them otherwise sends them round the retry loop while
    // the real fault is server configuration.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'error', message: 'AuthenticationFailure', code: '418' }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      status: 503,
      code: 'OTP_PROVIDER_AUTH_FAILURE',
    });
  });

  it('reports a spent/expired token (701) as OTP_TOKEN_INVALID', async () => {
    // Access tokens are single use — a replayed one must ask for a new code.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'error', message: 'invalid access-token', code: 701 }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      code: 'OTP_TOKEN_INVALID',
    });
  });

  it('never signs in a user when the success response has no identifier', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ type: 'success', message: { foo: 'bar' } })));
    const err = await verifyAccessToken('tok_abcdefghijklmnop').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('OTP_PROVIDER_UNAVAILABLE');
  });

  it('treats a non-JSON body as a provider fault, not a verified user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>gateway error</html>', { status: 502 }))
    );
    await expect(verifyAccessToken('tok_abcdefghijklmnop')).rejects.toMatchObject({
      code: 'OTP_PROVIDER_UNAVAILABLE',
    });
  });
});
