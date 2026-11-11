import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../../api/conversations';
import type { ConversationInput, PreferenceChange } from '../../api/types';
import { preferenceKeys } from '../preferences/preferences.queries';

export const chatKeys = {
  all: ['conversations'] as const,
  list: () => [...chatKeys.all, 'list'] as const,
  detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: ({ signal }) => conversationsApi.list({ signal }),
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.detail(id ?? ''),
    queryFn: ({ signal }) => conversationsApi.get(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConversationInput) => conversationsApi.create(input),
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.detail(conversation.id), conversation);
      return queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conversationsApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}

/**
 * Confirms the preference change the latest reply of the conversation proposed. Only the
 * preferences change: the backend leaves the messages as they are, and menus keep the issues they
 * were saved with.
 */
export function useConfirmPreferenceChange(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: PreferenceChange) => conversationsApi.confirmPreferenceChange(id, change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preferenceKeys.all }),
  });
}
