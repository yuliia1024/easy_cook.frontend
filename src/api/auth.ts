import { ApiError, request } from './http';
import { clearSession, getSessionState, setSession } from './session';
import type { AuthSession } from './types';

export const authApi = {
  /** A single-use nonce (10 minutes) for the next Google sign-in; also set as a cookie. */
  nonce: (): Promise<{ nonce: string }> => request('/auth/nonce', { session: false }),
  /**
   * Exchanges the Google ID token (GIS `credential`, issued with the nonce); sets the session
   * cookie. 401: invalid token or nonce; 403: not allowed; 429: too many attempts.
   */
  google: (idToken: string): Promise<AuthSession> =>
    request('/auth/google', { method: 'POST', body: { idToken }, session: false }),
  /** The signed-in user and a CSRF token; 401 when signed out. */
  session: (): Promise<AuthSession> => request('/auth/session', { session: false }),
  /** Ends this session. */
  logout: (): Promise<void> => request('/auth/logout', { method: 'POST' }),
  /** Ends every session of the user. */
  logoutAll: (): Promise<void> => request('/auth/logout-all', { method: 'POST' }),
};

let restoring: Promise<void> | null = null;

async function probe(): Promise<void> {
  try {
    setSession(await authApi.session());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearSession(null);
    // Offline or a 5xx: the status stays unknown, the guard offers to try again.
    else throw error;
  }
}

/**
 * Finds out on start-up whether the session cookie is still valid (`GET /auth/session`), before
 * the protected pages render. Once known it does nothing; calls at the same time share one probe.
 */
export function restoreSession(): Promise<void> {
  if (getSessionState().status !== 'unknown') return Promise.resolve();
  restoring ??= probe().finally(() => {
    restoring = null;
  });
  return restoring;
}
