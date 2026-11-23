import { act, renderHook } from '@testing-library/react';
import { clearSession } from '../../api/session';
import { buildUser } from '../../test/fixtures';
import { useSession } from './use-session';

describe('useSession', () => {
  it('follows the session', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current).toMatchObject({ status: 'signedIn', user: buildUser() });

    act(() => clearSession('expired'));
    expect(result.current).toEqual({ status: 'signedOut', user: null, endedBy: 'expired' });
  });
});
