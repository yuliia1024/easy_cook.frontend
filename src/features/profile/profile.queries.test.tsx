import { act, renderHook, waitFor } from '@testing-library/react';
import { buildProfile } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { preferenceKeys } from '../preferences/preferences.queries';
import { profileKeys, useSaveProfile } from './profile.queries';

describe('useSaveProfile', () => {
  it('refreshes the preferences, which need a profile, and the goal preview', async () => {
    const profile = buildProfile();
    server.use(http.put(api('/profile'), () => HttpResponse.json(profile)));
    const { queryClient, wrapper } = createQueryWrapper();
    // What the preferences page cached while the profile did not exist yet.
    queryClient.setQueryData(preferenceKeys.all, null);
    queryClient.setQueryData(profileKeys.preview, { caloriesKcal: 1 });
    const { result } = renderHook(() => useSaveProfile(), { wrapper });

    act(() => result.current.mutate(profile));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryState(preferenceKeys.all)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(profileKeys.preview)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(profileKeys.profile)).toEqual(profile);
  });
});
