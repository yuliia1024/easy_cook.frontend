import { request } from './http';
import type { Conversation, ConversationInput, ConversationSummary } from './types';

export const conversationsApi = {
  list: (): Promise<ConversationSummary[]> => request('/conversations'),
  get: (id: string): Promise<Conversation> => request(`/conversations/${id}`),
  create: (input: ConversationInput = {}): Promise<Conversation> =>
    request('/conversations', { method: 'POST', body: input }),
  remove: (id: string): Promise<void> => request(`/conversations/${id}`, { method: 'DELETE' }),
  /** Returns the conversation with the message and the assistant reply. */
  send: (id: string, content: string): Promise<Conversation> =>
    request(`/conversations/${id}/messages`, { method: 'POST', body: { content } }),
};
