import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../../api/conversations';
import type { ConversationInput } from '../../api/types';
import { menuKeys } from '../menus/menus.queries';

export const chatKeys = {
  all: ['conversations'] as const,
  list: () => [...chatKeys.all, 'list'] as const,
  detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
};

export function useConversations() {
  return useQuery({ queryKey: chatKeys.list(), queryFn: conversationsApi.list });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.detail(id ?? ''),
    queryFn: () => conversationsApi.get(id!),
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

/** The reply may have planned a menu, so menus are refreshed too. */
export function useSendMessage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => conversationsApi.send(id, content),
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.detail(id), conversation);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: chatKeys.list() }),
        queryClient.invalidateQueries({ queryKey: menuKeys.all }),
      ]);
    },
  });
}
