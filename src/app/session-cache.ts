import type { QueryClient } from '@tanstack/react-query';
import { getSessionState, subscribeSession } from '../api/session';

/**
 * Drops every cached query when the user changes (signed in, signed out, session ended), so data
 * of one user never shows for another. Returns the unsubscribe.
 */
export function clearQueryCacheOnUserChange(queryClient: QueryClient): () => void {
  let userId = getSessionState().user?.id ?? null;
  return subscribeSession(() => {
    const next = getSessionState().user?.id ?? null;
    if (next === userId) return;
    userId = next;
    queryClient.removeQueries();
    queryClient.getMutationCache().clear();
  });
}
