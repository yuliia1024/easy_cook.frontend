import { act, renderHook } from '@testing-library/react';
import {
  buildConversation,
  buildMenuSummary,
  buildSuggestedMenu,
  CONVERSATION_ID,
} from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, http, server, uiMessageStream } from '../../test/server';
import { menuKeys } from '../menus/menus.queries';
import { chatKeys } from './chat.queries';
import { toPending, useReplyStream } from './use-reply-stream';

describe('toPending', () => {
  it('joins the text parts of a streamed message', () => {
    expect(
      toPending({
        id: 'm',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type: 'text', text: 'Hel' },
          { type: 'text', text: 'lo' },
        ],
      }),
    ).toEqual({ id: 'm', role: 'assistant', content: 'Hello', menuId: null, suggestedMenu: null });
  });

  it('keeps the user role', () => {
    expect(toPending({ id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] })).toEqual({
      id: 'u',
      role: 'user',
      content: 'Hi',
      menuId: null,
      suggestedMenu: null,
    });
  });

  it('leaves data parts out of the text', () => {
    expect(
      toPending({
        id: 'c',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'How many days?' },
          { type: 'data-clarification', data: { missingFields: ['days'] } },
        ],
      }).content,
    ).toBe('How many days?');
  });

  it('takes the suggested menu from the data-menu part', () => {
    const menu = buildSuggestedMenu();

    expect(
      toPending({
        id: 'r',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Here is your day.' },
          { type: 'data-menu', data: menu },
        ],
      }),
    ).toMatchObject({ content: 'Here is your day.', suggestedMenu: menu });
  });
});

describe('useReplyStream', () => {
  it('refreshes the conversation and the menus once the reply ends', async () => {
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Saved your menu.' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]),
      ),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(chatKeys.detail(CONVERSATION_ID), buildConversation());
    queryClient.setQueryData(menuKeys.list(), [buildMenuSummary()]);
    const { result } = renderHook(() => useReplyStream(CONVERSATION_ID), { wrapper });

    let sent = false;
    await act(async () => {
      sent = await result.current.send('Plan my week');
    });

    expect(sent).toBe(true);
    expect(queryClient.getQueryState(chatKeys.detail(CONVERSATION_ID))?.isInvalidated).toBe(true);
    // A reply may have planned a menu or a new version of one.
    expect(queryClient.getQueryState(menuKeys.list())?.isInvalidated).toBe(true);
    expect(result.current.pending).toEqual([]);
  });
});
