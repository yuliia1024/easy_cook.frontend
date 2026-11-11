import { focusManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import {
  buildConversation,
  buildConversationSummary,
  buildMenu,
  buildMenuMeal,
  buildMenuVersion,
  buildMessage,
  buildPreference,
  buildRecipeSnapshot,
  buildSuggestedMenu,
  CONVERSATION_ID,
  MENU_ID,
  VERSION_ID,
} from '../../test/fixtures';
import { renderRoutes } from '../../test/render';
import { api, apiError, http, HttpResponse, server, uiMessageStream } from '../../test/server';
import { ChatPage } from './ChatPage';

/** `count` messages of the user, each with a reply. */
const chatOf = (count: number) =>
  Array.from({ length: count }, (_, index) => [
    buildMessage({ id: `user-${index}`, content: `Question ${index}` }),
    buildMessage({ id: `reply-${index}`, role: 'assistant', content: `Answer ${index}` }),
  ]).flat();

/** A saved version of one meal, the recipe `name`. */
const savedVersion = (id: string, name: string) =>
  buildMenuVersion({
    id,
    days: [
      {
        ...buildMenuVersion().days[0],
        meals: [buildMenuMeal({ recipe: buildRecipeSnapshot({ name }) })],
      },
    ],
  });

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
      http.get(api('/menus/m'), () =>
        HttpResponse.json(buildMenu({ id: 'm', versions: [savedVersion('v', 'Oatmeal')] })),
      ),
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

  it('shows the suggested menu with a link to its draft, once saved from its version', async () => {
    const menu = buildSuggestedMenu();
    let answered = false;
    server.use(
      http.get(api('/menus/m'), () =>
        HttpResponse.json(buildMenu({ id: 'm', versions: [savedVersion('v', 'Saved oatmeal')] })),
      ),
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
    // Once saved, the reply shows the version it was saved as.
    expect(
      await within(messages).findByRole('link', { name: 'Saved oatmeal' }),
    ).toBeInTheDocument();
    // At the version the reply was saved as, not the one the menu opens at.
    expect(within(messages).getByRole('link', { name: 'Open menu' })).toHaveAttribute(
      'href',
      '/menus/m?version=1',
    );
  });

  it('opens a revised confirmed menu at the version of the reply', async () => {
    server.use(
      http.get(api('/menus/m'), () =>
        HttpResponse.json(
          buildMenu({
            id: 'm',
            confirmedVersionId: 'v2',
            confirmedAt: '2026-10-21T10:00:00.000Z',
            versions: [
              { ...savedVersion('v3', 'Revised oatmeal'), versionNumber: 3 },
              { ...savedVersion('v2', 'Confirmed oatmeal'), versionNumber: 2, isConfirmed: true },
            ],
          }),
        ),
      ),
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: [
              buildMessage({
                id: 'reply',
                role: 'assistant',
                content: 'I swapped the breakfast.',
                menuId: 'm',
                menuVersionId: 'v3',
              }),
            ],
          }),
        ),
      ),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const messages = await screen.findByRole('list', { name: 'Messages' });
    await waitFor(() =>
      expect(within(messages).getByRole('link', { name: 'Open menu' })).toHaveAttribute(
        'href',
        '/menus/m?version=3',
      ),
    );
  });

  it('shows the menu of a saved reply from the version it was saved as', async () => {
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: [
              buildMessage({
                id: 'reply',
                role: 'assistant',
                content: 'Here is your day.',
                menuId: MENU_ID,
                menuVersionId: VERSION_ID,
              }),
              buildMessage({
                id: 'gone',
                role: 'assistant',
                content: 'An older day.',
                menuId: MENU_ID,
                menuVersionId: 'missing-version',
              }),
            ],
          }),
        ),
      ),
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(
          buildMenu({
            versions: [savedVersion('other', 'Pancakes'), savedVersion(VERSION_ID, 'Oatmeal')],
          }),
        ),
      ),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const reply = (await screen.findByText('Here is your day.')).closest('li') as HTMLElement;
    expect(
      await within(reply).findByRole('region', { name: 'Suggested menu, day 1' }),
    ).toBeInTheDocument();
    expect(within(reply).getByRole('link', { name: 'Oatmeal' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pancakes' })).toBeNull();
    const gone = screen.getByText('An older day.').closest('li') as HTMLElement;
    expect(within(gone).queryByRole('region')).toBeNull();
  });

  it('shows the step and the placeholders of the menu while it is planned, then the menu', async () => {
    const menu = buildSuggestedMenu();
    let answered = false;
    let release = (): void => undefined;
    server.use(
      http.get(api('/menus/m'), () =>
        HttpResponse.json(buildMenu({ id: 'm', versions: [savedVersion('v', 'Oatmeal')] })),
      ),
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
                  }),
                ]
              : [],
          }),
        ),
      ),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
        answered = true;
        const encoder = new TextEncoder();
        const write = (controller: ReadableStreamDefaultController, chunks: object[]): void =>
          chunks.forEach((chunk) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)),
          );
        // Sends the progress, then the reply once `release` is called.
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            write(controller, [
              { type: 'start' },
              {
                type: 'data-status',
                data: { step: 'thinking', message: 'Thinking' },
                transient: true,
              },
              {
                type: 'data-menu-pending',
                data: { days: 2, mealTypes: ['breakfast', 'lunch', 'snack', 'dinner'] },
                transient: true,
              },
              {
                type: 'data-status',
                data: { step: 'checking_constraints', message: 'Checking the constraints' },
                transient: true,
              },
            ]);
            release = () => {
              write(controller, [
                { type: 'text-start', id: 'text' },
                { type: 'text-delta', id: 'text', delta: 'Here is your day.' },
                { type: 'text-end', id: 'text' },
                { type: 'data-menu', data: { menuId: 'm', versionId: 'v', composition: menu } },
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
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Plan my day{Enter}');

    const messages = await screen.findByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText('Checking the constraints…')).toBeInTheDocument();
    const skeleton = within(messages).getByRole('group', { name: 'Menu being planned' });
    expect(within(skeleton).getByRole('list', { name: 'Days' })).toBeInTheDocument();
    expect(within(skeleton).getByText('Breakfast')).toBeInTheDocument();

    release();

    expect(
      await screen.findByRole('region', { name: 'Suggested menu, day 1' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Here is your day.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Menu being planned' })).toBeNull();
    expect(screen.queryByText('Checking the constraints…')).toBeNull();
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

  describe('a long conversation', () => {
    const NEW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    /** The notice; the spinner is a `status` too. */
    const findNotice = async (title: string): Promise<HTMLElement> =>
      (await screen.findByText(title)).closest<HTMLElement>('[role="status"]')!;
    const withMessages = (count: number) =>
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
          HttpResponse.json(buildConversation({ messages: chatOf(count) })),
        ),
      );

    it('says nothing before the 45th message of the user', async () => {
      withMessages(44);
      renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      expect(await screen.findByText('Answer 43')).toBeInTheDocument();
      expect(screen.queryByText('This conversation is getting long')).not.toBeInTheDocument();
    });

    it('suggests a new conversation with the menu details from the 45th message', async () => {
      withMessages(45);
      let created: unknown;
      server.use(
        http.post(api('/conversations'), async ({ request }) => {
          created = await request.json();
          return HttpResponse.json(buildConversation({ id: NEW_ID }));
        }),
        http.get(api(`/conversations/${NEW_ID}`), () =>
          HttpResponse.json(buildConversation({ id: NEW_ID })),
        ),
      );
      const { user, router } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const notice = await findNotice('This conversation is getting long');
      expect(notice).toHaveTextContent('5 of 50 messages left');
      expect(notice).toHaveTextContent('Your menu details carry over.');
      expect(screen.getByLabelText('Message')).toBeEnabled();

      await user.click(within(notice).getByRole('button', { name: 'Start a new conversation' }));

      await waitFor(() => expect(router.state.location.pathname).toBe(`/chat/${NEW_ID}`));
      expect(created).toEqual({ fromConversationId: CONVERSATION_ID });
    });

    it('takes no more messages at the limit', async () => {
      withMessages(50);
      renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      expect(await findNotice('This conversation is full')).toHaveTextContent(
        'Start a new conversation to keep planning.',
      );
      expect(screen.getByLabelText('Message')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    });

    it('asks for a new conversation when the backend says this one is full', async () => {
      withMessages(10);
      server.use(
        http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
          uiMessageStream([
            { type: 'start' },
            {
              type: 'data-error',
              data: {
                code: 'conversation_limit_reached',
                message: 'This conversation is full.',
                retryable: false,
              },
              transient: true,
            },
            { type: 'error', errorText: 'This conversation is full.' },
          ]),
        ),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      await user.type(await screen.findByLabelText('Message'), 'One more{Enter}');

      expect(await findNotice('This conversation is full')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Message')).toHaveValue('One more');
      expect(screen.getByLabelText('Message')).toBeDisabled();
    });
  });

  describe('while a message is sent', () => {
    /** A reply stream that sends `text` and stays open until the client aborts. */
    const openStream = (request: Request, text: string) => {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          [
            { type: 'start' },
            { type: 'text-start', id: 'text' },
            { type: 'text-delta', id: 'text', delta: text },
          ].forEach((chunk) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)),
          );
          request.signal.addEventListener('abort', () => controller.error(request.signal.reason));
        },
      });
      return new HttpResponse(body, {
        status: 201,
        headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
      });
    };

    it('takes no second message until the first one is saved and shown', async () => {
      let gets = 0;
      let posts = 0;
      let release = (): void => undefined;
      const refreshed = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), async () => {
          gets += 1;
          if (gets === 1) return HttpResponse.json(buildConversation());
          // The refetch after the reply hangs until released.
          await refreshed;
          return HttpResponse.json(
            buildConversation({
              messages: [
                buildMessage({ content: 'First' }),
                buildMessage({ id: 'r', role: 'assistant', content: 'Hello there' }),
              ],
            }),
          );
        }),
        http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
          posts += 1;
          return uiMessageStream([
            { type: 'start' },
            { type: 'text-start', id: 'text' },
            { type: 'text-delta', id: 'text', delta: 'Hello there' },
            { type: 'text-end', id: 'text' },
            { type: 'finish' },
          ]);
        }),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const input = await screen.findByLabelText('Message');
      await user.type(input, 'First{Enter}');
      // The reply is in; the conversation is being refetched.
      await waitFor(() => expect(gets).toBe(2));
      expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();

      await user.type(input, 'Second{Enter}');
      expect(posts).toBe(1);
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
      expect(input).toHaveValue('Second');

      await act(async () => release());
      await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled());
      const messages = screen.getByRole('list', { name: 'Messages' });
      expect(within(messages).getByText('First')).toBeInTheDocument();
      expect(await within(messages).findByText('Hello there')).toBeInTheDocument();
      expect(posts).toBe(1);
    });

    it('keeps the focus on the message box and reads the reply out once it is all there', async () => {
      let sent = false;
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
          HttpResponse.json(
            buildConversation({
              messages: sent ? [buildMessage({ content: 'Tell a story' })] : [],
            }),
          ),
        ),
        http.post(api(`/conversations/${CONVERSATION_ID}/messages`), ({ request }) => {
          sent = true;
          return openStream(request, 'Once upon a time');
        }),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const log = await screen.findByRole('log', { name: 'Conversation' });
      expect(log).toHaveAttribute('aria-live', 'polite');
      const input = screen.getByLabelText('Message');
      await user.type(input, 'Tell a story');
      await user.click(screen.getByRole('button', { name: 'Send' }));

      expect(await within(log).findByText('Once upon a time')).toBeInTheDocument();
      expect(input).toHaveFocus();
      // The reply is still coming: screen readers wait for it.
      expect(log).toHaveAttribute('aria-busy', 'true');

      await user.click(screen.getByRole('button', { name: 'Stop' }));
      expect(await screen.findByRole('button', { name: 'Send' })).toBeInTheDocument();
      expect(input).toHaveFocus();
      await waitFor(() => expect(log).not.toHaveAttribute('aria-busy'));
    });
  });

  it('keeps the conversation on screen when a refresh fails', async () => {
    let gets = 0;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
        gets += 1;
        return gets === 1
          ? HttpResponse.json(buildConversation({ messages: chatOf(1) }))
          : apiError(500, 'Server is down');
      }),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    const messages = await screen.findByRole('list', { name: 'Messages' });
    try {
      // Coming back to the tab refetches the conversation.
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh');
      expect(screen.getByRole('alert')).toHaveTextContent('Server is down');
      expect(within(messages).getByText('Answer 0')).toBeInTheDocument();
      expect(screen.getByLabelText('Message')).toBeEnabled();
    } finally {
      focusManager.setFocused(undefined);
    }
  });

  describe('a proposed preference change', () => {
    const change = { action: 'add', preferenceType: 'allergy', value: 'peanut' } as const;
    const proposal = buildMessage({
      id: 'proposal',
      role: 'assistant',
      content: 'Shall I add a peanut allergy?',
      preferenceChange: change,
    });

    /** The conversation `messages` and the saved preferences, `[]` until `saved()` says so. */
    const serveChat = (
      messages = [buildMessage({ content: 'I am allergic to peanuts' }), proposal],
    ) => {
      let added = false;
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
          HttpResponse.json(buildConversation({ messages })),
        ),
        http.get(api('/preferences'), () =>
          HttpResponse.json(added ? [buildPreference({ value: 'peanut' })] : []),
        ),
      );
      return {
        saved: () => {
          added = true;
        },
      };
    };

    it('confirms the change of the latest reply and shows it applied', async () => {
      const preferences = serveChat();
      let body: unknown;
      server.use(
        http.post(
          api(`/conversations/${CONVERSATION_ID}/preference-change/confirm`),
          async ({ request }) => {
            body = await request.json();
            preferences.saved();
            return HttpResponse.json({ status: 'applied', change });
          },
        ),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      expect(box).toHaveTextContent('Add allergy: peanut');
      await user.click(await within(box).findByRole('button', { name: 'Confirm change' }));

      expect(await within(box).findByText('Applied')).toBeInTheDocument();
      expect(within(box).queryByRole('button')).not.toBeInTheDocument();
      // The focus moves from the button to the badge that replaced it.
      expect(within(box).getByText('Applied')).toHaveFocus();
      expect(body).toEqual(change);
    });

    it('shows why the change could not be confirmed and lets it be tried again', async () => {
      serveChat();
      server.use(
        http.post(api(`/conversations/${CONVERSATION_ID}/preference-change/confirm`), () =>
          apiError(
            409,
            'This is not the preference change waiting for confirmation; confirm the latest one.',
          ),
        ),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      await user.click(await within(box).findByRole('button', { name: 'Confirm change' }));

      const alert = await within(box).findByRole('alert');
      expect(alert).toHaveTextContent('Could not change the preferences');
      expect(alert).toHaveTextContent('confirm the latest one');
      expect(within(box).getByRole('button', { name: 'Confirm change' })).toBeEnabled();
      expect(within(box).queryByText('Applied')).not.toBeInTheDocument();
    });

    it('offers no confirmation for a change a later reply ended', async () => {
      serveChat([
        proposal,
        buildMessage({ id: 'q', content: 'Plan my day instead' }),
        buildMessage({ id: 'later', role: 'assistant', content: 'Here is your day.' }),
      ]);
      renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      expect(await within(box).findByText('Not applied')).toBeInTheDocument();
      expect(within(box).queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows a change that is in effect already as applied', async () => {
      serveChat().saved();
      renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      expect(await within(box).findByText('Applied')).toBeInTheDocument();
      expect(within(box).queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows the change applied as soon as a yes in the chat applied it', async () => {
      let answered = false;
      let release = (): void => undefined;
      const refreshed = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), async () => {
          if (!answered) return HttpResponse.json(buildConversation({ messages: [proposal] }));
          // The refetch after the reply hangs: only the stream says the change was applied.
          await refreshed;
          return HttpResponse.json(buildConversation({ messages: [proposal] }));
        }),
        // Never has the change: the badge can only come from the stream.
        http.get(api('/preferences'), () => HttpResponse.json([])),
        http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () => {
          answered = true;
          return uiMessageStream([
            { type: 'start' },
            { type: 'text-start', id: 'text' },
            { type: 'text-delta', id: 'text', delta: 'Added it.' },
            { type: 'text-end', id: 'text' },
            { type: 'data-preferences-updated', data: { change } },
            { type: 'finish' },
          ]);
        }),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      expect(await within(box).findByRole('button', { name: 'Confirm change' })).toBeEnabled();
      await user.type(screen.getByLabelText('Message'), 'Yes{Enter}');

      expect(await within(box).findByText('Applied')).toBeInTheDocument();
      expect(within(box).queryByRole('button')).not.toBeInTheDocument();
      await act(async () => release());
    });

    it('waits, without a state, while a message is on its way', async () => {
      serveChat();
      server.use(
        http.post(api(`/conversations/${CONVERSATION_ID}/messages`), ({ request }) => {
          const encoder = new TextEncoder();
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
              request.signal.addEventListener('abort', () =>
                controller.error(request.signal.reason),
              );
            },
          });
          return new HttpResponse(body, {
            status: 201,
            headers: {
              'Content-Type': 'text/event-stream',
              'x-vercel-ai-ui-message-stream': 'v1',
            },
          });
        }),
      );
      const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      await within(box).findByRole('button', { name: 'Confirm change' });
      await user.type(screen.getByLabelText('Message'), 'Not now{Enter}');

      expect(await screen.findByRole('button', { name: 'Stop' })).toBeInTheDocument();
      expect(within(box).queryByRole('button')).not.toBeInTheDocument();
      expect(within(box).queryByText('Not applied')).not.toBeInTheDocument();
      expect(within(box).queryByText('Applied')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Stop' }));
    });

    it('offers no confirmation while the conversation could not be refreshed', async () => {
      let gets = 0;
      server.use(
        http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
        http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
          gets += 1;
          return gets === 1
            ? HttpResponse.json(buildConversation({ messages: [proposal] }))
            : apiError(500, 'Server is down');
        }),
        http.get(api('/preferences'), () => HttpResponse.json([])),
      );
      renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

      const box = await screen.findByRole('region', { name: 'Proposed preference change' });
      await within(box).findByRole('button', { name: 'Confirm change' });
      try {
        act(() => {
          focusManager.setFocused(false);
          focusManager.setFocused(true);
        });
        expect(await screen.findByText('Could not refresh')).toBeInTheDocument();
        expect(within(box).queryByRole('button')).not.toBeInTheDocument();
      } finally {
        focusManager.setFocused(undefined);
      }
    });
  });

  it('keeps the messages of a reply when the refresh after it fails', async () => {
    let gets = 0;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
        gets += 1;
        if (gets === 1) return HttpResponse.json(buildConversation());
        if (gets === 2) return apiError(500, 'Server is down');
        return HttpResponse.json(
          buildConversation({
            messages: [
              buildMessage({ content: 'Hello' }),
              buildMessage({ id: 'r', role: 'assistant', content: 'Hi there' }),
            ],
          }),
        );
      }),
      http.post(api(`/conversations/${CONVERSATION_ID}/messages`), () =>
        uiMessageStream([
          { type: 'start' },
          { type: 'text-start', id: 'text' },
          { type: 'text-delta', id: 'text', delta: 'Hi there' },
          { type: 'text-end', id: 'text' },
          { type: 'finish' },
        ]),
      ),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.type(await screen.findByLabelText('Message'), 'Hello{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not refresh');
    const messages = screen.getByRole('list', { name: 'Messages' });
    expect(within(messages).getByText('Hello')).toBeInTheDocument();
    expect(await within(messages).findByText('Hi there')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue('');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    // The saved ones take their place, once.
    expect(
      within(screen.getByRole('list', { name: 'Messages' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });

  it('stops showing a conversation that is gone', async () => {
    let gets = 0;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () => {
        gets += 1;
        return gets === 1
          ? HttpResponse.json(buildConversation({ messages: chatOf(1) }))
          : apiError(404, 'Conversation not found');
      }),
    );
    renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await screen.findByRole('list', { name: 'Messages' });
    try {
      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      expect(await screen.findByRole('alert')).toHaveTextContent('Conversation not found');
      expect(screen.queryByRole('list', { name: 'Messages' })).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
    } finally {
      focusManager.setFocused(undefined);
    }
  });

  it('moves the focus to the badge once a menu is confirmed', async () => {
    let confirmed = false;
    server.use(
      http.get(api('/conversations'), () => HttpResponse.json([buildConversationSummary()])),
      http.get(api(`/conversations/${CONVERSATION_ID}`), () =>
        HttpResponse.json(
          buildConversation({
            messages: [
              buildMessage({
                id: 'reply',
                role: 'assistant',
                content: 'Here is your day.',
                menuId: MENU_ID,
                menuVersionId: VERSION_ID,
              }),
            ],
          }),
        ),
      ),
      http.get(api(`/menus/${MENU_ID}`), () =>
        HttpResponse.json(buildMenu({ confirmedVersionId: confirmed ? VERSION_ID : null })),
      ),
      http.post(api(`/menus/${MENU_ID}/versions/${VERSION_ID}/confirm`), () => {
        confirmed = true;
        return HttpResponse.json(buildMenu({ confirmedVersionId: VERSION_ID }));
      }),
    );
    const { user } = renderRoutes(routes, `/chat/${CONVERSATION_ID}`);

    await user.click(await screen.findByRole('button', { name: 'Confirm menu' }));

    expect(await screen.findByText('Confirmed')).toHaveFocus();
  });
});
