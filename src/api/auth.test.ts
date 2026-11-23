import { buildAuthSession, buildUser } from '../test/fixtures';
import { api, apiError, http, HttpResponse, server } from '../test/server';
import { authApi, restoreSession } from './auth';
import { CSRF_HEADER } from './http';
import { getCsrfToken, getSessionState, resetSession } from './session';

describe('authApi', () => {
  it('signs in with the Google ID token, without a CSRF token', async () => {
    resetSession();
    let seen: { body: unknown; csrf: string | null; credentials: string } | undefined;
    server.use(
      http.post(api('/auth/google'), async ({ request }) => {
        seen = {
          body: await request.json(),
          csrf: request.headers.get(CSRF_HEADER),
          credentials: request.credentials,
        };
        return HttpResponse.json(buildAuthSession());
      }),
    );
    await expect(authApi.google('id-token')).resolves.toEqual(buildAuthSession());
    expect(seen).toEqual({ body: { idToken: 'id-token' }, csrf: null, credentials: 'include' });
  });

  it('gets a nonce with the cookie', async () => {
    let credentials: string | undefined;
    server.use(
      http.get(api('/auth/nonce'), ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ nonce: 'n-1' });
      }),
    );
    await expect(authApi.nonce()).resolves.toEqual({ nonce: 'n-1' });
    expect(credentials).toBe('include');
  });

  it.each([
    ['logout', '/auth/logout'],
    ['logoutAll', '/auth/logout-all'],
  ] as const)('%s posts with the CSRF token', async (name, path) => {
    let csrf: string | null = null;
    server.use(
      http.post(api(path), ({ request }) => {
        csrf = request.headers.get(CSRF_HEADER);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(authApi[name]()).resolves.toBeUndefined();
    expect(csrf).toBe('csrf-1');
  });
});

describe('restoreSession', () => {
  beforeEach(() => resetSession());

  it('signs in with the session of the cookie, once for calls at the same time', async () => {
    let probes = 0;
    server.use(
      http.get(api('/auth/session'), () => {
        probes += 1;
        return HttpResponse.json(buildAuthSession({ csrfToken: 'csrf-9' }));
      }),
    );
    await Promise.all([restoreSession(), restoreSession()]);
    await restoreSession();

    expect(probes).toBe(1);
    expect(getSessionState()).toMatchObject({ status: 'signedIn', user: buildUser() });
    expect(getCsrfToken()).toBe('csrf-9');
  });

  it('is signed out without a session', async () => {
    server.use(http.get(api('/auth/session'), () => apiError(401, 'Unauthorized')));
    await restoreSession();
    expect(getSessionState()).toEqual({ status: 'signedOut', user: null, endedBy: null });
  });

  it('stays unknown and throws when the server is unavailable', async () => {
    server.use(http.get(api('/auth/session'), () => HttpResponse.error()));
    await expect(restoreSession()).rejects.toMatchObject({ status: 0 });
    expect(getSessionState().status).toBe('unknown');
  });
});
