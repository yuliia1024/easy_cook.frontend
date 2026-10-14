import { screen, waitFor, within } from '@testing-library/react';
import {
  buildConversation,
  buildConversationSummary,
  buildMessage,
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

    expect(await screen.findByText('No messages yet. Say hello.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/chat/${CONVERSATION_ID}`);
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
          { type: 'error', errorText: 'An error occurred.' },
        ]),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Hi{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('An error occurred.');
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
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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

    expect(await screen.findByText('No conversations yet.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chat');
  });
});
