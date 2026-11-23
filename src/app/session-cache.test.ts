import { QueryClient } from '@tanstack/react-query';
import { clearSession, setSession } from '../api/session';
import { buildAuthSession, buildUser } from '../test/fixtures';
import { clearQueryCacheOnUserChange } from './session-cache';

describe('clearQueryCacheOnUserChange', () => {
  it('drops the cache when the user changes, not for a new CSRF token', () => {
    const queryClient = new QueryClient();
    const unsubscribe = clearQueryCacheOnUserChange(queryClient);
    queryClient.setQueryData(['menus'], ['mine']);

    setSession(buildAuthSession({ csrfToken: 'csrf-2' }));
    expect(queryClient.getQueryData(['menus'])).toEqual(['mine']);

    clearSession('expired');
    expect(queryClient.getQueryData(['menus'])).toBeUndefined();

    queryClient.setQueryData(['menus'], ['stale']);
    setSession(buildAuthSession({ user: buildUser({ id: 'someone-else' }) }));
    expect(queryClient.getQueryData(['menus'])).toBeUndefined();
    unsubscribe();
  });
});
