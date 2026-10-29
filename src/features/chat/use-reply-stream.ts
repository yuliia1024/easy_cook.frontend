import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { useMemo, useRef } from 'react';
import { createReplyTransport } from '../../api/conversations';
import { ApiError } from '../../api/http';
import type { MessageRole, SuggestedMenu } from '../../api/types';
import { menuKeys } from '../menus/menus.queries';
import { chatKeys } from './chat.queries';

export interface PendingMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Streamed replies never link a saved menu. */
  menuId: null;
  /** From the `data-menu` part. */
  suggestedMenu: SuggestedMenu | null;
}

/** The text of a streamed message and the menu it suggests; other data parts are left out. */
export function toPending(message: UIMessage): PendingMessage {
  const content = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
  const menu = message.parts.find((part) => part.type === 'data-menu');
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
    menuId: null,
    suggestedMenu: menu && 'data' in menu ? (menu.data as SuggestedMenu) : null,
  };
}

/**
 * Sends a message and streams the reply (AI SDK `useChat`). While it streams, `pending` holds the
 * message and the reply so far; once it ends the conversation is refetched with both saved.
 * `stop` cancels the reply: the backend keeps the message but drops the unfinished reply.
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
      // A reply may plan a new menu or a new version of one.
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
    ]);
    chat.setMessages([]);
    return !failed.current;
  };

  const error = chat.error
    ? chat.error instanceof ApiError
      ? chat.error
      : // The stream ended with an `error` chunk: the reply failed. Its text is safe to show.
        new ApiError(502, chat.error.message)
    : null;

  return {
    send,
    stop: () => void chat.stop(),
    isSending: chat.status === 'submitted' || chat.status === 'streaming',
    /** True until the first chunk of the reply arrives. */
    isWaiting: chat.status === 'submitted',
    pending: chat.messages.map(toPending),
    error,
  };
}
