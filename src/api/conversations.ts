import { DefaultChatTransport, type UIMessage } from 'ai';
import { BASE_URL, request, streamFetch } from './http';
import type { Conversation, ConversationInput, ConversationSummary } from './types';

export const conversationsApi = {
  list: (): Promise<ConversationSummary[]> => request('/conversations'),
  get: (id: string): Promise<Conversation> => request(`/conversations/${encodeURIComponent(id)}`),
  create: (input: ConversationInput = {}): Promise<Conversation> =>
    request('/conversations', { method: 'POST', body: input }),
  remove: (id: string): Promise<void> =>
    request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/**
 * `POST /conversations/:id/messages` saves the message and streams the reply as text (AI SDK UI
 * message stream) for `useChat`; the reply is saved once complete. The request body is
 * `{ content }` passed as `body` to `sendMessage`; 404 and 429 arrive as `ApiError`s.
 */
export function createReplyTransport(id: string): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport<UIMessage>({
    api: `${BASE_URL}/conversations/${encodeURIComponent(id)}/messages`,
    fetch: streamFetch,
    prepareSendMessagesRequest: ({ body }) => ({ body: body ?? {} }),
  });
}
