import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { createReplyTransport } from '../../api/conversations';
import { ApiError } from '../../api/http';
import type {
  MessageRole,
  PendingMenu,
  StreamedMenu,
  StreamedStatus,
  SuggestedMenu,
} from '../../api/types';
import { menuKeys } from '../menus/menus.queries';
import { chatKeys } from './chat.queries';

export interface PendingMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** The draft menu the `data-menu` part was saved to. */
  menuId: string | null;
  /** The draft version the `data-menu` part was saved as. */
  menuVersionId: string | null;
  /** From the `data-menu` part. */
  suggestedMenu: SuggestedMenu | null;
}

/** The text of a streamed message and the menu it suggests; other data parts are left out. */
export function toPending(message: UIMessage): PendingMessage {
  const content = message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
  const part = message.parts.find((p) => p.type === 'data-menu');
  const menu = part && 'data' in part ? (part.data as StreamedMenu) : null;
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
    menuId: menu?.menuId ?? null,
    menuVersionId: menu?.versionId ?? null,
    suggestedMenu: menu?.composition ?? null,
  };
}

/** What the transient parts of the reply tell while it streams; nothing of it is saved. */
export interface ReplyProgress {
  /** The text of the latest `data-status` part. */
  status: string | null;
  /** From the `data-menu-pending` part, until the reply ends. */
  menu: PendingMenu | null;
}

const NO_PROGRESS: ReplyProgress = { status: null, menu: null };

/**
 * Sends a message and streams the reply (AI SDK `useChat`). While it streams, `pending` holds the
 * message and the reply so far and `progress` the step under way and the menu being planned; once
 * it ends the conversation is refetched with both messages saved.
 * `stop` cancels the reply: the backend keeps the message but drops the unfinished reply.
 */
export function useReplyStream(id: string) {
  const queryClient = useQueryClient();
  const transport = useMemo(() => createReplyTransport(id), [id]);
  const failed = useRef(false);
  const [progress, setProgress] = useState<ReplyProgress>(NO_PROGRESS);
  const chat = useChat({
    id,
    transport,
    onError: () => {
      failed.current = true;
    },
    // Transient parts never reach `messages`; they only come through here.
    onData: (part) => {
      if (part.type === 'data-status') {
        const { message } = part.data as StreamedStatus;
        setProgress((current) => ({ ...current, status: message }));
      } else if (part.type === 'data-menu-pending') {
        const menu = part.data as PendingMenu;
        setProgress((current) => ({ ...current, menu }));
      }
    },
  });

  /** Resolves to false when the message or the reply failed. */
  const send = async (content: string): Promise<boolean> => {
    failed.current = false;
    setProgress(NO_PROGRESS);
    await chat.sendMessage({ text: content }, { body: { content } });
    setProgress(NO_PROGRESS);
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
    pending: chat.messages.map(toPending),
    progress,
    error,
  };
}
