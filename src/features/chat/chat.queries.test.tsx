import { act, renderHook, waitFor } from '@testing-library/react';
import { buildConversation, CONVERSATION_ID } from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, HttpResponse, server } from '../../test/server';
import { preferenceKeys } from '../preferences/preferences.queries';
import { chatKeys, useConfirmPreferenceChange, useConversation } from './chat.queries';

describe('chat queries', () => {
  it('cancels the request of a cancelled conversation query', async () => {
    let aborted = false;
    server.use(
      http.get(api(`/conversations/${CONVERSATION_ID}`), ({ request }) => {
        request.signal.addEventListener('abort', () => {
          aborted = true;
        });
        return new Promise<Response>(() => undefined);
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    renderHook(() => useConversation(CONVERSATION_ID), { wrapper });
    await waitFor(() =>
      expect(queryClient.getQueryState(chatKeys.detail(CONVERSATION_ID))?.fetchStatus).toBe(
        'fetching',
      ),
    );

    await act(() => queryClient.cancelQueries({ queryKey: chatKeys.detail(CONVERSATION_ID) }));

    await waitFor(() => expect(aborted).toBe(true));
  });

  it('refreshes the preferences once a proposed change is confirmed', async () => {
    const change = { action: 'add', preferenceType: 'allergy', value: 'peanut' } as const;
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/preference-change/confirm`), () =>
        HttpResponse.json({ status: 'applied', change }),
      ),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(preferenceKeys.all, []);
    queryClient.setQueryData(chatKeys.detail(CONVERSATION_ID), buildConversation());
    const { result } = renderHook(() => useConfirmPreferenceChange(CONVERSATION_ID), { wrapper });

    await act(() => result.current.mutateAsync(change));

    expect(queryClient.getQueryState(preferenceKeys.all)?.isInvalidated).toBe(true);
    // The backend leaves the messages as they are.
    expect(queryClient.getQueryState(chatKeys.detail(CONVERSATION_ID))?.isInvalidated).toBe(false);
  });
});
