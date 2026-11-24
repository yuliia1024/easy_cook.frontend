import { screen } from '@testing-library/react';
import { CSRF_HEADER } from '../../api/http';
import { getCsrfToken, getSessionState, resetSession } from '../../api/session';
import { buildAuthSession, buildUser } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server } from '../../test/server';
import type { GoogleCredentialResponse, GoogleIdentity } from './google-identity';
import { LoginPage, NONCE_RENEW_MS, NOT_CONFIGURED } from './LoginPage';
import { TOO_MANY_ATTEMPTS } from './sign-in-error';

let nonces = 0;
let credentialCallback: ((response: GoogleCredentialResponse) => void) | undefined;
const identity = {
  initialize: vi.fn((config: Parameters<GoogleIdentity['initialize']>[0]) => {
    credentialCallback = config.callback;
  }),
  renderButton: vi.fn((parent: HTMLElement) => {
    parent.innerHTML = '<button type="button">Sign in with Google</button>';
  }),
  disableAutoSelect: vi.fn(),
};

function renderLogin(path = '/login') {
  return renderRoutes(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '*', element: <p>app page</p> },
    ],
    path,
  );
}

async function signInWithGoogle() {
  await screen.findByRole('button', { name: 'Sign in with Google' });
  credentialCallback?.({ credential: 'google-id-token' });
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetSession();
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-id.apps.googleusercontent.com');
    window.google = { accounts: { id: identity as GoogleIdentity } };
    credentialCallback = undefined;
    identity.initialize.mockClear();
    nonces = 0;
    server.use(
      http.get(api('/auth/nonce'), () => {
        nonces += 1;
        return HttpResponse.json({ nonce: `nonce-${nonces}` });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.google;
  });

  it('renders the Google button for the configured client', async () => {
    renderLogin();
    expect(
      screen.getByRole('heading', { name: 'Sign in to Easy Cook', level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(identity.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-id.apps.googleusercontent.com',
        nonce: 'nonce-1',
      }),
    );
  });

  it('gets a new nonce and button after a failed attempt', async () => {
    server.use(http.post(api('/auth/google'), () => apiError(401, 'Invalid nonce')));
    renderLogin();
    await signInWithGoogle();

    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed');
    await vi.waitFor(() =>
      expect(identity.initialize).toHaveBeenLastCalledWith(
        expect.objectContaining({ nonce: 'nonce-2' }),
      ),
    );
  });

  it('gets a new nonce before the old one expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderLogin();
      await screen.findByRole('button', { name: 'Sign in with Google' });
      expect(nonces).toBe(1);

      await vi.advanceTimersByTimeAsync(NONCE_RENEW_MS);

      await vi.waitFor(() =>
        expect(identity.initialize).toHaveBeenLastCalledWith(
          expect.objectContaining({ nonce: 'nonce-2' }),
        ),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers to try again when the nonce cannot be fetched', async () => {
    server.use(http.get(api('/auth/nonce'), () => HttpResponse.error()));
    const { user } = renderLogin();
    expect(await screen.findByRole('alert')).toHaveTextContent('The server is unavailable');

    server.use(http.get(api('/auth/nonce'), () => HttpResponse.json({ nonce: 'nonce-ok' })));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(identity.initialize).toHaveBeenLastCalledWith(
      expect.objectContaining({ nonce: 'nonce-ok' }),
    );
  });

  it('asks to wait after too many attempts', async () => {
    server.use(http.post(api('/auth/google'), () => apiError(429, 'ThrottlerException')));
    renderLogin();
    await signInWithGoogle();
    expect(await screen.findByRole('alert')).toHaveTextContent(TOO_MANY_ATTEMPTS);
  });

  it('signs in with the credential and goes back to the requested page', async () => {
    let seen: { body: unknown; csrf: string | null } | undefined;
    server.use(
      http.post(api('/auth/google'), async ({ request }) => {
        seen = { body: await request.json(), csrf: request.headers.get(CSRF_HEADER) };
        return HttpResponse.json(buildAuthSession({ csrfToken: 'csrf-new' }));
      }),
    );
    const { router } = renderLogin('/login?next=%2Frecipes%3Fsearch%3Dsoup');

    await signInWithGoogle();

    expect(await screen.findByText('app page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes');
    expect(router.state.location.search).toBe('?search=soup');
    expect(seen).toEqual({ body: { idToken: 'google-id-token' }, csrf: null });
    expect(getSessionState()).toMatchObject({ status: 'signedIn', user: buildUser() });
    expect(getCsrfToken()).toBe('csrf-new');
  });

  it('does not follow a next link to another site', async () => {
    server.use(http.post(api('/auth/google'), () => HttpResponse.json(buildAuthSession())));
    const { router } = renderLogin('/login?next=%2F%2Fevil.example');
    await signInWithGoogle();
    await screen.findByText('app page');
    expect(router.state.location.pathname).toBe('/');
  });

  it('tells an account without access', async () => {
    server.use(http.post(api('/auth/google'), () => apiError(403, 'This email is not allowed')));
    renderLogin();
    await signInWithGoogle();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('This account has no access');
    expect(alert).toHaveTextContent('This email is not allowed');
    expect(getSessionState().status).toBe('unknown');
  });

  it('tells a rejected Google token and an unavailable server', async () => {
    server.use(http.post(api('/auth/google'), () => apiError(401, 'Invalid Google token')));
    renderLogin();
    await signInWithGoogle();
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in failed');

    server.use(http.post(api('/auth/google'), () => HttpResponse.error()));
    credentialCallback?.({ credential: 'google-id-token' });
    expect(await screen.findByText('Could not sign in')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The server is unavailable');
  });

  it('says the session has ended after a 401', async () => {
    const { clearSession, setSession } = await import('../../api/session');
    setSession(buildAuthSession());
    clearSession('expired');
    renderLogin('/login?next=%2Fmenus');
    expect(
      screen.getByText('Your session has ended. Sign in again to continue.'),
    ).toBeInTheDocument();
  });

  it('goes on to the page when already signed in', async () => {
    const { setSession } = await import('../../api/session');
    setSession(buildAuthSession());
    renderLogin('/login?next=%2Fmenus');
    expect(await screen.findByText('app page')).toBeInTheDocument();
    expect(identity.initialize).not.toHaveBeenCalled();
  });

  it('tells when Google sign-in is not configured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    renderLogin();
    expect(screen.getByRole('alert')).toHaveTextContent(NOT_CONFIGURED);
  });
});
