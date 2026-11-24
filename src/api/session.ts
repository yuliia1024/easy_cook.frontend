import type { AuthSession, AuthUser } from './types';

/**
 * Who is signed in, in memory only: the session is an httpOnly cookie the page never sees, and
 * nothing of it is stored. `unknown` until `GET /auth/session` answers on start-up.
 */

export type SessionStatus = 'unknown' | 'signedIn' | 'signedOut';

/** `signedOut`: by the user; `expired`: the API answered 401. */
export type SessionEndReason = 'signedOut' | 'expired';

export interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  /** Why the last session ended; null while signed in or never signed in. */
  endedBy: SessionEndReason | null;
}

const INITIAL: SessionState = { status: 'unknown', user: null, endedBy: null };

let state: SessionState = INITIAL;
let csrfToken: string | null = null;
const listeners = new Set<() => void>();

function update(next: SessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function sameUser(a: AuthUser | null, b: AuthUser): boolean {
  return (
    a !== null &&
    a.id === b.id &&
    a.email === b.email &&
    a.name === b.name &&
    a.avatarUrl === b.avatarUrl
  );
}

/** A stable snapshot for `useSyncExternalStore`; replaced on every change. */
export function getSessionState(): SessionState {
  return state;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Sent as `X-CSRF-Token` with every unsafe request. */
export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setSession(session: AuthSession): void {
  csrfToken = session.csrfToken;
  // The same user again (a CSRF token re-fetch): the snapshot stays, nothing re-renders.
  if (state.status === 'signedIn' && sameUser(state.user, session.user)) return;
  update({ status: 'signedIn', user: session.user, endedBy: null });
}

/**
 * No session: `reason` when one has just ended, null when there was none (the start-up probe).
 * Once signed out a later 401 (a request still under way) changes nothing; signing out by the
 * user still wins over it.
 */
export function clearSession(reason: SessionEndReason | null): void {
  csrfToken = null;
  if (state.status === 'signedOut' && (reason !== 'signedOut' || state.endedBy === reason)) return;
  update({ status: 'signedOut', user: null, endedBy: reason });
}

/** Back to `unknown` (tests). */
export function resetSession(): void {
  csrfToken = null;
  update(INITIAL);
}
