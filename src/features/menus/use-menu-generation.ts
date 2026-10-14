import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/http';
import { createMenuGenerationTransport } from '../../api/menus';
import type {
  GenerateMenuInput,
  Menu,
  MenuGenerationDataParts,
  MenuGenerationMessage,
  ProposedDay,
} from '../../api/types';
import { useCacheMenu } from './menus.queries';

export interface MenuGenerationProgress {
  attempt: number;
  maxAttempts: number;
  /** The days of the current attempt so far, in order. */
  days: ProposedDay[];
  /** The latest rejected attempt and why; null while none was rejected. */
  rejection: MenuGenerationDataParts['issues'] | null;
}

/** Reads the streamed data parts of the assistant message. */
export function toProgress(
  message: MenuGenerationMessage | undefined,
): MenuGenerationProgress | null {
  let status: MenuGenerationDataParts['status'] | undefined;
  let issues: MenuGenerationDataParts['issues'] | undefined;
  const days: ProposedDay[] = [];
  for (const part of message?.parts ?? []) {
    if (part.type === 'data-status') status = part.data;
    else if (part.type === 'data-issues') issues = part.data;
    else if (part.type === 'data-day') days.push(part.data);
  }

  if (!status) return null;
  return {
    ...status,
    days: days
      .filter((day) => day.attempt === status.attempt)
      .sort((a, b) => a.dayIndex - b.dayIndex),
    rejection: issues ?? null,
  };
}

/**
 * Generates a menu through the streamed `POST /menus/generate` (AI SDK `useChat`): `progress`
 * follows the assistant attempt by attempt; the saved menu is cached and passed to `onGenerated`.
 */
export function useMenuGeneration(onGenerated: (menu: Menu) => void) {
  const cacheMenu = useCacheMenu();
  const [transport] = useState(createMenuGenerationTransport);
  const handlers = useRef({ cacheMenu, onGenerated });
  useEffect(() => {
    handlers.current = { cacheMenu, onGenerated };
  });

  const chat = useChat<MenuGenerationMessage>({
    transport,
    onData: (part) => {
      if (part.type !== 'data-menu') return;
      void handlers.current.cacheMenu(part.data);
      handlers.current.onGenerated(part.data);
    },
  });

  const generate = (input: GenerateMenuInput): void => {
    chat.setMessages([]);
    void chat.sendMessage({ text: input.instructions || 'Plan a menu' }, { body: input });
  };

  const error = chat.error
    ? chat.error instanceof ApiError
      ? chat.error
      : // The stream ended with an `error` chunk: the planner gave up.
        new ApiError(422, chat.error.message)
    : null;

  return {
    generate,
    stop: chat.stop,
    isGenerating: chat.status === 'submitted' || chat.status === 'streaming',
    progress: toProgress(chat.messages.findLast((m) => m.role === 'assistant')),
    error,
  };
}
