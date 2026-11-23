import { buildAuthSession, buildUser } from '../test/fixtures';
import {
  clearSession,
  getCsrfToken,
  getSessionState,
  resetSession,
  setSession,
  subscribeSession,
} from './session';

describe('session', () => {
  beforeEach(() => resetSession());

  it('starts unknown', () => {
    expect(getSessionState()).toEqual({ status: 'unknown', user: null, endedBy: null });
    expect(getCsrfToken()).toBeNull();
  });

  it('keeps the user and the CSRF token in memory only', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setSession(buildAuthSession());

    expect(getSessionState()).toEqual({ status: 'signedIn', user: buildUser(), endedBy: null });
    expect(getCsrfToken()).toBe('csrf-1');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    setItem.mockRestore();
  });

  it('notifies on a change and keeps the snapshot for a new token of the same user', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSession(listener);
    setSession(buildAuthSession());
    const snapshot = getSessionState();

    setSession(buildAuthSession({ csrfToken: 'csrf-2' }));
    expect(getSessionState()).toBe(snapshot);
    expect(getCsrfToken()).toBe('csrf-2');

    setSession(buildAuthSession({ user: buildUser({ id: 'other' }) }));
    expect(getSessionState()).not.toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    clearSession('signedOut');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('records why the session ended', () => {
    setSession(buildAuthSession());
    clearSession('expired');
    expect(getSessionState()).toEqual({ status: 'signedOut', user: null, endedBy: 'expired' });
    expect(getCsrfToken()).toBeNull();
  });

  it('lets a late 401 not override a sign out, but a sign out override an expiry', () => {
    setSession(buildAuthSession());
    clearSession('signedOut');
    clearSession('expired');
    expect(getSessionState().endedBy).toBe('signedOut');

    resetSession();
    setSession(buildAuthSession());
    clearSession('expired');
    clearSession('signedOut');
    expect(getSessionState().endedBy).toBe('signedOut');
  });

  it('has no reason when the start-up probe finds no session', () => {
    clearSession(null);
    expect(getSessionState()).toEqual({ status: 'signedOut', user: null, endedBy: null });
  });
});
