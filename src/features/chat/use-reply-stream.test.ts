import { act, renderHook, waitFor } from '@testing-library/react';
import {
  buildConversation,
  buildMenuSummary,
  buildMessage,
  buildSuggestedMenu,
  CONVERSATION_ID,
} from '../../test/fixtures';
import { createQueryWrapper } from '../../test/query-wrapper';
import { api, apiError, http, HttpResponse, server, uiMessageStream } from '../../test/server';
import { menuKeys } from '../menus/menus.queries';
import { preferenceKeys } from '../preferences/preferences.queries';
import { chatKeys, useConversation } from './chat.queries';
import { toPending, useReplyStream } from './use-reply-stream';

describe('toPending', () => {
  it('joins the text parts of a streamed message as the backend saves them', () => {
    expect(
      toPending({
        id: 'm',
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type: 'text', text: 'Here is your day.' },
          { type: 'data-menu', data: { menuId: 'm1', versionId: 'v1', composition: null } },
          { type: 'text', text: 'Shall I save it?' },
        ],
      }),
    ).toMatchObject({
      id: 'm',
      role: 'assistant',
      content: 'Here is your day.\n\nShall I save it?',
    });
  });

  it('takes a single text part as it is', () => {
    expect(
      toPending({
        id: 'm',
        role: 'assistant',
        parts: [{ type: 'step-start' }, { type: 'text', text: 'Hello' }],
      }),
    ).toEqual({
      id: 'm',
      role: 'assistant',
      content: 'Hello',
      menuId: null,
      menuVersionId: null,
      suggestedMenu: null,
      preferenceChange: null,
      preferencesUpdated: null,
      wishOffer: null,
    });
  });

  it('keeps the user role', () => {
    expect(toPending({ id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] })).toEqual({
      id: 'u',
      role: 'user',
      content: 'Hi',
      menuId: null,
      menuVersionId: null,
      suggestedMenu: null,
      preferenceChange: null,
      preferencesUpdated: null,
      wishOffer: null,
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

  it('takes a proposed and an applied preference change from their parts', () => {
    const change = { action: 'add', preferenceType: 'allergy', value: 'peanut' } as const;

    expect(
      toPending({
        id: 'p',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Shall I add a peanut allergy?' },
          { type: 'data-preference-change', data: { change } },
        ],
      }),
    ).toMatchObject({ preferenceChange: change, preferencesUpdated: null });
    expect(
      toPending({
        id: 'u',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Done.' },
          { type: 'data-preferences-updated', data: { change } },
        ],
      }),
    ).toMatchObject({ preferenceChange: null, preferencesUpdated: change });
  });

  it('takes a wish offer from its part', () => {
    const offer = {
      wishes: 'sushi',
      recipes: [{ id: 'r1', name: 'Salmon poke bowl', mealType: 'lunch' as const }],
    };

    expect(
      toPending({
        id: 'w',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'No sushi. Similar?' },
          { type: 'data-wish-offer', data: { offer } },
        ],
      }),
    ).toMatchObject({ content: 'No sushi. Similar?', wishOffer: offer });
  });

  it('takes the suggested menu and its draft menu from the data-menu part', () => {
    const menu = buildSuggestedMenu();

    expect(
      toPending({
        id: 'r',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Here is your day.' },
          { type: 'data-menu', data: { menuId: 'm', versionId: 'v', composition: menu } },
        ],
      }),
    ).toMatchObject({
      content: 'Here is your day.',
      menuId: 'm',
      menuVersionId: 'v',
      suggestedMenu: menu,
    });
  });
});

describe('useReplyStream', () => {
  it.each([
    ['conversation_limit_reached', true],
    ['assistant_unavailable', false],
  ])('tells whether the conversation is full from a %s error', async (code, full) => {
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        uiMessageStream([
          { type: 'start' },
          {
            type: 'data-error',
            data: { code, message: 'No reply.', retryable: false },
            transient: true,
          },
          { type: 'error', errorText: 'No reply.' },
        ]),
      ),
    );
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useReplyStream(CONVERSATION_ID), { wrapper });

    let sent = true;
    await act(async () => {
      sent = await result.current.send('One more');
    });

    expect(sent).toBe(false);
    expect(result.current.limitReached).toBe(full);
  });

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
    let gets = 0;
    server.use(
      http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
        gets += 1;
        return HttpResponse.json(buildConversation());
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    queryClient.setQueryData(menuKeys.list(), [buildMenuSummary()]);
    queryClient.setQueryData(preferenceKeys.all, []);
    const { result } = renderHook(
      () => {
        useConversation(CONVERSATION_ID);
        return useReplyStream(CONVERSATION_ID);
      },
      { wrapper },
    );
    await waitFor(() => expect(gets).toBe(1));

    let sent = false;
    await act(async () => {
      sent = await result.current.send('Plan my week');
    });

    expect(sent).toBe(true);
    // The conversation is refetched with both messages saved.
    expect(gets).toBe(2);
    // A reply may have planned a menu or a new version of one.
    expect(queryClient.getQueryState(menuKeys.list())?.isInvalidated).toBe(true);
    // ...or changed the dietary preferences.
    expect(queryClient.getQueryState(preferenceKeys.all)?.isInvalidated).toBe(true);
    expect(result.current.pending).toEqual([]);
    expect(result.current.isSending).toBe(false);
  });

  it('keeps the message and the reply until the conversation is refetched with them', async () => {
    let gets = 0;
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Hi!' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]),
      ),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
        gets += 1;
        if (gets === 1) return HttpResponse.json(buildConversation());
        return gets === 2
          ? apiError(500, 'Server is down')
          : HttpResponse.json(buildConversation({ messages: [buildMessage()] }));
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => {
        useConversation(CONVERSATION_ID);
        return useReplyStream(CONVERSATION_ID);
      },
      { wrapper },
    );
    await waitFor(() => expect(gets).toBe(1));

    let sent = false;
    await act(async () => {
      sent = await result.current.send('Hello');
    });

    // The refetch failed: they stay on screen, and the message was sent all the same.
    expect(sent).toBe(true);
    expect(gets).toBe(2);
    expect(result.current.pending.map(({ content }) => content)).toEqual(['Hello', 'Hi!']);

    await act(() => queryClient.refetchQueries({ queryKey: chatKeys.detail(CONVERSATION_ID) }));
    await waitFor(() => expect(result.current.pending).toEqual([]));
  });

  it('stays sending until the conversation is refetched and takes no second message meanwhile', async () => {
    let posts = 0;
    let release = (): void => undefined;
    const refreshed = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
        posts += 1;
        return uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Hi!' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]);
      }),
      http.get(api(`/conversations/${CONVERSATION_ID}`), async () => {
        await refreshed;
        return HttpResponse.json(buildConversation());
      }),
    );
    const { queryClient, wrapper } = createQueryWrapper();
    // An active conversation query, so the invalidation refetches it and waits for it.
    queryClient.setQueryData(chatKeys.detail(CONVERSATION_ID), buildConversation());
    const { result } = renderHook(
      () => {
        useConversation(CONVERSATION_ID);
        return useReplyStream(CONVERSATION_ID);
      },
      { wrapper },
    );

    let first: Promise<boolean> = Promise.resolve(false);
    act(() => {
      first = result.current.send('Hello');
    });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await waitFor(() => expect(result.current.pending).toHaveLength(2));
    expect(result.current.isSending).toBe(true);

    let second = true;
    await act(async () => {
      second = await result.current.send('Again');
    });
    expect(second).toBe(false);
    expect(posts).toBe(1);

    await act(async () => {
      release();
      expect(await first).toBe(true);
    });
    expect(result.current.isSending).toBe(false);
    expect(result.current.pending).toEqual([]);
  });

  it('stops the request when unmounted while the reply streams', async () => {
    let aborted = false;
    let started = (): void => undefined;
    const streaming = new Promise<void>((resolve) => {
      started = resolve;
    });
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), ({ request }) => {
        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
            request.signal.addEventListener('abort', () => {
              aborted = true;
              controller.error(request.signal.reason);
            });
            started();
          },
        });
        return new HttpResponse(body, {
          status: 201,
          headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        });
      }),
    );
    const { wrapper } = createQueryWrapper();
    const { result, unmount } = renderHook(() => useReplyStream(CONVERSATION_ID), { wrapper });

    act(() => {
      void result.current.send('Tell a story');
    });
    await streaming;
    unmount();

    await waitFor(() => expect(aborted).toBe(true));
  });

  it('keeps the transient status and pending menu out of the messages and clears them at the end', async () => {
    const encoder = new TextEncoder();
    let release = (): void => undefined;
    server.use(
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const write = (chunks: object[]): void =>
              chunks.forEach((chunk) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)),
              );
            write([
              { type: 'start' },
              {
                type: 'data-status',
                data: { step: 'thinking', message: 'Thinking' },
                transient: true,
              },
              {
                type: 'data-menu-pending',
                data: { days: 1, mealTypes: ['breakfast'] },
                transient: true,
              },
            ]);
            release = () => {
              write([
                { type: 'text-start', id: 'text' },
                { type: 'text-delta', id: 'text', delta: 'Here is your day.' },
                { type: 'text-end', id: 'text' },
                { type: 'finish' },
              ]);
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            };
          },
        });
        return new HttpResponse(body, {
          status: 201,
          headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        });
      }),
    );
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useReplyStream(CONVERSATION_ID), { wrapper });

    let sending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      sending = result.current.send('Plan my day');
    });

    await waitFor(() =>
      expect(result.current.progress).toEqual({
        status: 'Thinking',
        menu: { days: 1, mealTypes: ['breakfast'] },
      }),
    );
    expect(result.current.pending.map(({ content }) => content)).toEqual(['Plan my day']);

    await act(async () => {
      release();
      await sending;
    });

    expect(result.current.progress).toEqual({ status: null, menu: null });
  });
});
