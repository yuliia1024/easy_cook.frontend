import { act, renderHook, waitFor } from '@testing-library/react';
import type { MenuSummary } from '../../api/types';
import { buildConversation, buildMenu, buildMenuSummary, MENU_ID } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { chatKeys } from '../chat/chat.queries';
import { menuKeys, useDeleteMenu, useMenu } from './menus.queries';

describe('useMenu', () => {
  it('cancels the request of a cancelled query', async () => {
    let aborted = false;
    server.use(
      http.get(api(`/menus/${MENU_ID}`), ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise<Response>(() => undefined);
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    renderHook(() => useMenu(MENU_ID), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryState(menuKeys.detail(MENU_ID))?.fetchStatus).toBe('fetching'),
    );

    await act(() => queryClient.cancelQueries({ queryKey: menuKeys.detail(MENU_ID) }));

    await waitFor(() => expect(aborted).toBe(true));
  });
});

describe('useDeleteMenu', () => {
  beforeEach(() => {
    server.use(
      http.delete(api(`/menus/${MENU_ID}`), () => new HttpResponse(null, { status: 204 })),
    );
  });

  it('refreshes the menu lists and the conversations the menu was linked to', async () => {
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(menuKeys.listOf('draft'), []);
    queryClient.setQueryData(chatKeys.detail('c'), buildConversation({ menuId: MENU_ID }));
    queryClient.setQueryData(menuKeys.detail(MENU_ID), buildMenu());
    const { result } = renderHook(() => useDeleteMenu(), { wrapper });

    await act(() => result.current.mutateAsync(MENU_ID));

    expect(queryClient.getQueryState(menuKeys.listOf('draft'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(chatKeys.detail('c'))?.isInvalidated).toBe(true);
    // Nobody shows it: gone at once.
    expect(queryClient.getQueryState(menuKeys.detail(MENU_ID))).toBeUndefined();
  });

  it('drops the menu from the lists, lets the page go, then from the cache, without refetching it', async () => {
    let gets = 0;
    server.use(
      http.get(api(`/menus/${MENU_ID}`), () => {
        gets += 1;
        return HttpResponse.json(buildMenu());
      }),
      http.get(api('/menus'), () => HttpResponse.json([])),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    const page = renderHook(() => useMenu(MENU_ID), { wrapper });
    await waitFor(() => expect(page.result.current.data).toBeDefined());
    queryClient.setQueryData(menuKeys.listOf('confirmed'), [
      buildMenuSummary({ id: MENU_ID }),
      buildMenuSummary({ id: 'other' }),
    ]);
    const seen: { listed: string[] | undefined; cached: boolean }[] = [];
    const { result } = renderHook(
      () =>
        useDeleteMenu({
          onDeleted: () => {
            seen.push({
              listed: queryClient
                .getQueryData<MenuSummary[]>(menuKeys.listOf('confirmed'))
                ?.map(({ id }) => id),
              cached: queryClient.getQueryState(menuKeys.detail(MENU_ID)) !== undefined,
            });
            // The page navigates away here.
            page.unmount();
          },
        }),
      { wrapper },
    );

    await act(() => result.current.mutateAsync(MENU_ID));

    expect(seen).toEqual([{ listed: ['other'], cached: true }]);
    expect(queryClient.getQueryState(menuKeys.detail(MENU_ID))).toBeUndefined();
    expect(gets).toBe(1);
  });
});
