import { screen, waitFor, within } from '@testing-library/react';
import {
  buildConversation,
  buildConversationSummary,
  buildMenu,
  buildMessage,
  buildSuggestedMenu,
  CONVERSATION_ID,
  MENU_ID,
  VERSION_ID,
} from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server, uiMessageStream } from '../../test/server';
import { ChatPage } from './ChatPage';

const routes = [
  { path: '/chat', element: <ChatPage /> },
  { path: '/chat/:id', element: <ChatPage /> },
  { path: '/menus/:id', element: <p>menu page</p> },
];

describe('ChatPage', () => {
  it('starts a new conversation', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([])),
      http.post(api('/conversations'), () => HttpResponse.json(buildConversation())),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
    );
    const { user, router } = renderRoutes(routes, '/chat');

    expect(await screen.findByText('No conversations yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New conversation' }));

    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
    const suggestions = screen.getByRole('list', { name: 'Suggestions' });
    expect(
      within(suggestions)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'Hi! What can you help me with?',
      'Plan a one-day menu based on my profile and dietary preferences',
    ]);
    expect(router.state.location.pathname).toBe(`/chat/${CONVERSATION_ID}`);
  });

  it('sends a suggestion on click', async () => {
    const suggestion = 'Plan a one-day menu based on my profile and dietary preferences';
    let sent: unknown;
    let answered = false;
    server.use(
      http.get(api('/menus/m'), () => HttpResponse.json(buildMenu({ id: 'm' }))),
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: answered
              ? [
                  buildMessage({ content: suggestion }),
                  buildMessage({ id: 'reply', role: 'assistant', content: 'Breakfast: oatmeal' }),
                ]
              : [],
          }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), async ({ request }) => {
        sent = await request.json();
        answered = true;
        return uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Breakfast: oatmeal' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]);
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.click(await screen.findByRole('button', { name: suggestion }));

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('Breakfast: oatmeal')).toBeInTheDocument();
    expect(sent).toEqual({ content: suggestion });
    expect(screen.queryByRole('list', { name: 'Suggestions' })).not.toBeInTheDocument();
  });

  it('sends with Enter, keeps Shift+Enter as a new line and streams the reply', async () => {
    let sent: unknown;
    let answered = false;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: answered
              ? [
                  buildMessage({ content: 'Plan a menu\nfor 3 days' }),
                  buildMessage({ id: 'reply', role: 'assistant', content: 'Day 1: oatmeal' }),
                ]
              : [],
          }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), async ({ request }) => {
        sent = await request.json();
        answered = true;
        return uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Day 1: ' },
          { type: 'text-delta', id: 'text', delta: 'oatmeal' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]);
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const input = await screen.findByLabelText('Message');
    await user.type(input, 'Plan a menu{Shift>}{Enter}{/Shift}for 3 days{Enter}');

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('Day 1: oatmeal')).toBeInTheDocument();
    await waitFor(() => expect(within(messages).getAllByRole('listitem')).toHaveLength(2));
    expect(sent).toEqual({ content: 'Plan a menu\nfor 3 days' });
    expect(input).toHaveValue('');
  });

  it('stops the reply while it streams', async () => {
    let sent = false;
    let aborted = false;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({ messages: sent ? [buildMessage({ content: 'Tell a story' })] : [] }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), ({ request }) => {
        sent = true;
        const encoder = new TextEncoder();
        const chunks = [
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Once upon a time' },
        ];
        // Sends the start of the reply, then stays open until the client aborts.
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            chunks.forEach((chunk) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)),
            );
            request.signal.addEventListener('abort', () => {
              aborted = true;
              controller.error(request.signal.reason);
            });
          },
        });
        return new HttpResponse(body, {
          status: 201,
          headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
        });
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const input = await screen.findByLabelText('Message');
    await user.type(input, 'Tell a story{Enter}');

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('Once upon a time')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(await screen.findByRole('button', { name: 'Send' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Once upon a time')).not.toBeInTheDocument());
    const saved = screen.getByRole('list', { name: 'Messages' });
    expect(within(saved).getByText('Tell a story')).toBeInTheDocument();
    expect(aborted).toBe(true);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the linked menu of the conversation', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation({ menuId: MENU_ID })),
      ),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    expect(await screen.findByRole('link', { name: 'Linked menu →' })).toHaveAttribute(
      'href',
      `/menus/${MENU_ID}`,
    );
  });

  it('shows why the reply failed', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Day 1: ' },
          { type: 'text-end', id: 'text' },
          {
            type: 'data-error',
            data: { code: 'assistant_unavailable', message: 'Try again later.', retryable: true },
            transient: true,
          },
          { type: 'error', errorText: 'Try again later.' },
        ]),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Hi{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
  });

  it('shows a clarification question as the reply', async () => {
    let answered = false;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: answered
              ? [
                  buildMessage({ content: 'Make a menu' }),
                  buildMessage({ id: 'reply', role: 'assistant', content: 'How many days?' }),
                ]
              : [],
          }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
        answered = true;
        return uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'How many days?' },
          { type: 'text-end', id: 'text' },
          { type: 'data-clarification', data: { missingFields: ['days', 'meals'] } },
          { type: 'finish' },
        ]);
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Make a menu{Enter}');

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('How many days?')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the suggested menu with a link to its draft while it streams and after it is saved', async () => {
    const menu = buildSuggestedMenu();
    let answered = false;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: answered
              ? [
                  buildMessage({ content: 'Plan my day' }),
                  buildMessage({
                    id: 'reply',
                    role: 'assistant',
                    content: 'Here is your day.',
                    menuId: 'm',
                    menuVersionId: 'v',
                    suggestedMenu: menu,
                  }),
                ]
              : [],
          }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
        answered = true;
        return uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Here is your day.' },
          { type: 'text-end', id: 'text' },
          { type: 'data-menu', data: { menuId: 'm', versionId: 'v', composition: menu } },
          { type: 'finish' },
        ]);
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Plan my day{Enter}');

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('Here is your day.')).toBeInTheDocument();
    expect(
      await within(messages).findByRole('region', { name: 'Suggested menu, day 1' }),
    ).toBeInTheDocument();
    expect(within(messages).getByRole('link', { name: 'Oatmeal' })).toBeInTheDocument();
    expect(within(messages).getByRole('link', { name: 'Open menu' })).toHaveAttribute(
      'href',
      '/menus/m',
    );
  });

  describe('confirming the menu of a reply', () => {
    const OTHER_VERSION_ID = '99999999-9999-4999-8999-999999999999';
    const reply = (id: string, menuVersionId: string) =>
      buildMessage({
        id,
        role: 'assistant',
        content: `Reply ${id}`,
        menuId: MENU_ID,
        menuVersionId,
        suggestedMenu: buildSuggestedMenu(),
      });
    const showReplies = (confirmed: () => string | null) =>
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
          HttpResponse.json(
            buildConversation({
              menuId: MENU_ID,
              messages: [reply('first', VERSION_ID), reply('second', OTHER_VERSION_ID)],
            }),
          ),
        ),
        http.get(api(`/menus/${MENU_ID}`), () =>
          HttpResponse.json(buildMenu({ confirmedVersionId: confirmed() })),
        ),
      );
    const bubbleOf = async (text: string) =>
      (await screen.findByText(text)).closest('li') as HTMLElement;

    it('confirms the version of a reply, then switches to another one', async () => {
      let confirmed: string | null = null;
      const posted: string[] = [];
      showReplies(() => confirmed);
      server.use(
        http.post(api(`/menus/${MENU_ID}/versions/:versionId/confirm`), ({ params }) => {
          confirmed = params.versionId as string;
          posted.push(confirmed);
          return HttpResponse.json(buildMenu({ confirmedVersionId: confirmed }));
        }),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);
      const first = await bubbleOf('Reply first');
      const second = await bubbleOf('Reply second');

      await user.click(await within(first).findByRole('button', { name: 'Confirm menu' }));

      expect(await within(first).findByText('Confirmed')).toBeInTheDocument();
      const instead = await within(second).findByRole('button', {
        name: 'Confirm this version instead',
      });

      await user.click(instead);

      expect(await within(second).findByText('Confirmed')).toBeInTheDocument();
      expect(
        await within(first).findByRole('button', { name: 'Confirm this version instead' }),
      ).toBeInTheDocument();
      expect(posted).toEqual([VERSION_ID, OTHER_VERSION_ID]);
    });

    it('shows why a version that breaks the preferences cannot be confirmed', async () => {
      showReplies(() => null);
      server.use(
        http.post(api(`/menus/${MENU_ID}/versions/:versionId/confirm`), () =>
          apiError(400, 'The menu breaks the profile rules: contains peanut'),
        ),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);
      const first = await bubbleOf('Reply first');

      await user.click(await within(first).findByRole('button', { name: 'Confirm menu' }));

      const alert = await within(first).findByRole('alert');
      expect(alert).toHaveTextContent('Could not confirm the menu');
      expect(alert).toHaveTextContent('contains peanut');
      expect(within(first).getByRole('button', { name: 'Confirm menu' })).toBeInTheDocument();
    });
  });

  it('does not send a message over 300 characters', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const input = await screen.findByLabelText('Message');
    await user.click(input);
    await user.paste('x'.repeat(301));

    expect(screen.getByText('301 / 300')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('links every reply to the menu it planned, not to the latest one', async () => {
    const OLDER_MENU_ID = '99999999-9999-4999-8999-999999999990';
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            menuId: MENU_ID,
            messages: [
              buildMessage({
                id: 'older',
                role: 'assistant',
                content: 'First plan',
                menuVersionId: VERSION_ID,
                menuId: OLDER_MENU_ID,
              }),
              buildMessage({ id: 'plain', role: 'assistant', content: 'No plan here' }),
            ],
          }),
        ),
      ),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const messages = await screen.findByRole('list', { name: 'Messages' });
    const links = within(messages).getAllByRole('link', { name: 'Open menu' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/menus/${OLDER_MENU_ID}`);
  });

  it('keeps the draft when sending fails', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        apiError(429, 'ThrottlerException: Too Many Requests'),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too Many Requests');
    expect(screen.getByLabelText('Message')).toHaveValue('Hi');
  });

  it('deletes a conversation after confirmation', async () => {
    let deleted = false;
    server.use(
      http.get(api('/conversations'), () =>
        HttpResponse.json(deleted ? [] : [buildConversationSummary({ title: 'Old chat' })]),
      ),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
      http.delete(api(`/conversations/${CONVERSATION_ID}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, router } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.click(await screen.findByRole('button', { name: 'Delete Old chat' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this conversation?' });
    expect(dialog).toHaveTextContent(
      '“Old chat” and all its messages will be permanently deleted.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No conversations yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chat');
    // The focused delete button went away with its row.
    expect(screen.getByRole('button', { name: 'New conversation' })).toHaveFocus();
  });

  it('keeps the conversation when the deletion is cancelled', async () => {
    let deleted = false;
    server.use(
      http.get(api('/conversations'), () =>
        HttpResponse.json([buildConversationSummary({ title: 'Old chat' })]),
      ),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation()),
      ),
      http.delete(api(`/conversations/${CONVERSATION_ID}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const remove = await screen.findByRole('button', { name: 'Delete Old chat' });
    await user.click(remove);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(remove).toHaveFocus();
    await user.click(remove);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleted).toBe(false);
  });

  it('keeps a draft in its own conversation', async () => {
    const OTHER_ID = '99999999-9999-4999-8999-999999999991';
    server.use(
      http.get(api('/conversations'), () =>
        HttpResponse.json([
          buildConversationSummary({ title: 'First' }),
          buildConversationSummary({ id: OTHER_ID, title: 'Second' }),
        ]),
      ),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(buildConversation({ title: 'First' })),
      ),
      http.get(api(`/conversations/${OTHER_ID}`), () =>
        HttpResponse.json(buildConversation({ id: OTHER_ID, title: 'Second' })),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);
    await screen.findByRole('heading', { name: 'First' });
    // Both conversations cached, so switching does not go through the loading state.
    await user.click(screen.getByRole('link', { name: 'Second' }));
    await screen.findByRole('heading', { name: 'Second' });
    await user.click(screen.getByRole('link', { name: 'First' }));
    await screen.findByRole('heading', { name: 'First' });

    await user.type(screen.getByLabelText('Message'), 'for the first one');
    await user.click(screen.getByRole('link', { name: 'Second' }));

    expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });
});
