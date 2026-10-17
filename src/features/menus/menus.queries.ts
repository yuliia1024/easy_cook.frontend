import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menusApi } from '../../api/menus';
import type { Menu } from '../../api/types';

export const menuKeys = {
  all: ['menus'] as const,
  list: () => [...menuKeys.all, 'list'] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
};

export function useMenus() {
  return useQuery({ queryKey: menuKeys.list(), queryFn: menusApi.list });
}

export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: menuKeys.detail(id ?? ''),
    queryFn: () => menusApi.get(id!),
    enabled: Boolean(id),
  });
}

/** Every menu mutation returns the whole menu: cache it and refresh the list. */
function useMenuMutation<T>(mutationFn: (input: T) => Promise<Menu>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (menu) => {
      queryClient.setQueryData(menuKeys.detail(menu.id), menu);
      return queryClient.invalidateQueries({ queryKey: menuKeys.list() });
    },
  });
}

export const useRenameMenu = (id: string) =>
  useMenuMutation((title: string) => menusApi.rename(id, title));

export const useConfirmMenuVersion = (id: string) =>
  useMenuMutation((versionId: string) => menusApi.confirm(id, versionId));

export function useDeleteMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menusApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: menuKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: menuKeys.list() });
    },
  });
}
