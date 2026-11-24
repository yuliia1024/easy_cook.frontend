import { useSyncExternalStore } from 'react';
import { getSessionState, subscribeSession, type SessionState } from '../../api/session';

/** The signed-in user (null when signed out) and why the last session ended. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSessionState);
}
