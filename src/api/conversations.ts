import { DefaultChatTransport, type UIMessage } from 'ai';
import { BASE_URL, request, streamFetch, type CallOptions } from './http';
import type {
  Conversation,
  ConversationInput,
  ConversationSummary,
  PreferenceChange,
  PreferenceChangeResult,
} from './types';

export const conversationsApi = {
  list: ({ signal }: CallOptions = {}): Promise<ConversationSummary[]> =>
    request('/conversations', { signal }),
  get: (id: string, { signal }: CallOptions = {}): Promise<Conversation> =>
    request(`/conversations/${encodeURIComponent(id)}`, { signal }),
  create: (input: ConversationInput = {}): Promise<Conversation> =>
    request('/conversations', { method: 'POST', body: input }),
  remove: (id: string): Promise<void> =>
    request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /**
   * Applies the change the latest reply proposed; the body is that change as shown. 404 when the
   * latest reply proposed none, 409 when it is another change, 400 when the preferences refuse it.
   */
  confirmPreferenceChange: (
    id: string,
    change: PreferenceChange,
  ): Promise<PreferenceChangeResult> =>
    request(`/conversations/${encodeURIComponent(id)}/preference-change/confirm`, {
      method: 'POST',
      body: change,
    }),
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
