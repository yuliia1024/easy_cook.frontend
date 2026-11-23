import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { createReplyTransport } from '../../api/conversations';
import { ApiError } from '../../api/http';
import {
  CONVERSATION_LIMIT_REACHED,
  type MessageRole,
  type PendingMenu,
  type PreferenceChange,
  type StreamedError,
  type StreamedMenu,
  type StreamedPreferenceChange,
  type StreamedPreferencesUpdated,
  type StreamedStatus,
  type StreamedWishOffer,
  type SuggestedMenu,
  type WishOffer,
  type WishOfferAnswer,
} from '../../api/types';
import { menuKeys } from '../menus/menus.queries';
import { preferenceKeys } from '../preferences/preferences.queries';
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
  /** From the `data-preference-change` part: waits for the user's yes once the reply is saved. */
  preferenceChange: PreferenceChange | null;
  /** From the `data-preferences-updated` part: the change this reply applied. */
  preferencesUpdated: PreferenceChange | null;
  /** From the `data-wish-offer` part: waits for the user's answer once the reply is saved. */
  wishOffer: WishOffer | null;
}

/** The data of the first `type` part of a streamed message. */
function dataOf<T>(message: UIMessage, type: `data-${string}`): T | null {
  const part = message.parts.find((p) => p.type === type);
  return part && 'data' in part ? (part.data as T) : null;
}

/** Between two text parts of a reply, as the backend saves it (`TEXT_PART_SEPARATOR`). */
export const TEXT_PART_SEPARATOR = '\n\n';

/** The text of a streamed message and the menu it suggests; other data parts are left out. */
export function toPending(message: UIMessage): PendingMessage {
  const content = message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join(TEXT_PART_SEPARATOR);
  const menu = dataOf<StreamedMenu>(message, 'data-menu');
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
    menuId: menu?.menuId ?? null,
    menuVersionId: menu?.versionId ?? null,
    suggestedMenu: menu?.composition ?? null,
    preferenceChange:
      dataOf<StreamedPreferenceChange>(message, 'data-preference-change')?.change ?? null,
    preferencesUpdated:
      dataOf<StreamedPreferencesUpdated>(message, 'data-preferences-updated')?.change ?? null,
    wishOffer: dataOf<StreamedWishOffer>(message, 'data-wish-offer')?.offer ?? null,
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
 * it ends the conversation is refetched with both messages saved. `pending` stays until that
 * refetch (or a later one) brings the conversation: a failed one would make them vanish.
 * `isSending` lasts until that refetch is done (one message at a time), `isStreaming` only while
 * the request is under way. `stop` cancels the reply: the backend keeps the message but drops the
 * unfinished reply; unmounting stops it too (`useChat`).
 * `limitReached` is set when the conversation is full: the backend did not save the message.
 */
export function useReplyStream(id: string) {
  const queryClient = useQueryClient();
  const transport = useMemo(() => createReplyTransport(id), [id]);
  const failed = useRef(false);
  // A ref as well as state: a second `send` before the next render must see the first one.
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ReplyProgress>(NO_PROGRESS);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // `pending` shows while the saved conversation has had no more updates than this.
  const [shownUntil, setShownUntil] = useState(-1);
  const savedUpdates = queryClient.getQueryState(chatKeys.detail(id))?.dataUpdateCount ?? 0;
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
      } else if (part.type === 'data-error') {
        setErrorCode((part.data as StreamedError).code);
      }
    },
  });

  /**
   * Resolves to false when the message or the reply failed, or when another message is still being
   * sent (it is not sent then). `wishOffer`: the message answers the wish offer of the latest
   * reply by its button.
   */
  const send = async (content: string, wishOffer?: WishOfferAnswer): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setSending(true);
    try {
      failed.current = false;
      setProgress(NO_PROGRESS);
      setErrorCode(null);
      chat.setMessages([]);
      setShownUntil(Infinity);
      await chat.sendMessage(
        { text: content },
        { body: wishOffer ? { content, wishOffer } : { content } },
      );
      setProgress(NO_PROGRESS);
      setShownUntil(queryClient.getQueryState(chatKeys.detail(id))?.dataUpdateCount ?? 0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: chatKeys.list() }),
        // A reply may plan a new menu or a new version of one, or change the preferences.
        queryClient.invalidateQueries({ queryKey: menuKeys.all }),
        queryClient.invalidateQueries({ queryKey: preferenceKeys.all }),
      ]);
      return !failed.current;
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';

  const error = chat.error
    ? chat.error instanceof ApiError
      ? chat.error
      : // The stream ended with an `error` chunk: the reply failed. Its text is safe to show.
        new ApiError(502, chat.error.message)
    : null;

  return {
    send,
    stop: () => void chat.stop(),
    isSending: sending || isStreaming,
    isStreaming,
    pending: savedUpdates <= shownUntil ? chat.messages.map(toPending) : [],
    progress,
    error,
    limitReached: errorCode === CONVERSATION_LIMIT_REACHED,
  };
}
