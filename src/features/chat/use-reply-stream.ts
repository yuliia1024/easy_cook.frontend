import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { useMemo, useRef } from 'react';
import { createReplyTransport } from '../../api/conversations';
import { ApiError } from '../../api/http';
import type { MessageRole } from '../../api/types';
import { chatKeys } from './chat.queries';

export interface PendingMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Streamed replies are text only; they never link a menu. */
  menuId: null;
}

/** The text of a streamed message. */
export function toPending(message: UIMessage): PendingMessage {
  const content = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
    menuId: null,
  };
}

/**
 * Sends a message and streams the reply (AI SDK `useChat`). While it streams, `pending` holds the
 * message and the reply so far; once it ends the conversation is refetched with both saved.
 */
export function useReplyStream(id: string) {
  const queryClient = useQueryClient();
  const transport = useMemo(() => createReplyTransport(id), [id]);
  const failed = useRef(false);
  const chat = useChat({
    id,
    transport,
    onError: () => {
      failed.current = true;
    },
  });

  /** Resolves to false when the message or the reply failed. */
  const send = async (content: string): Promise<boolean> => {
    failed.current = false;
    await chat.sendMessage({ text: content }, { body: { content } });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: chatKeys.list() }),
    ]);
    chat.setMessages([]);
    return !failed.current;
  };

  const error = chat.error
    ? chat.error instanceof ApiError
      ? chat.error
      : // The stream ended with an `error` chunk: the model failed to answer.
        new ApiError(502, chat.error.message)
    : null;

  return {
    send,
    isSending: chat.status === 'submitted' || chat.status === 'streaming',
    /** True until the first chunk of the reply arrives. */
    isWaiting: chat.status === 'submitted',
    pending: chat.messages.map(toPending),
    error,
  };
}
