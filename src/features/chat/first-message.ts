/**
 * The message a new conversation was started with, from the new conversation form until the
 * conversation, once created and open, sends it. In memory only: a reload never sends it again.
 */
const firstMessages = new Map<string, string>();

export function queueFirstMessage(conversationId: string, content: string): void {
  firstMessages.set(conversationId, content);
}

/** The queued message of the conversation, once: it is no longer queued after this. */
export function takeFirstMessage(conversationId: string): string | undefined {
  const content = firstMessages.get(conversationId);
  firstMessages.delete(conversationId);
  return content;
}
