import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menusApi } from '../../api/menus';
import type { Menu, MenuInput, MenuVersionInput, ReplaceMealInput } from '../../api/types';

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

/** Caches a menu returned by the API and refreshes the list. */
export function useCacheMenu(): (menu: Menu) => Promise<void> {
  const queryClient = useQueryClient();
  return (menu) => {
    queryClient.setQueryData(menuKeys.detail(menu.id), menu);
    return queryClient.invalidateQueries({ queryKey: menuKeys.list() });
  };
}

/** Every menu mutation returns the whole menu: cache it and refresh the list. */
function useMenuMutation<T>(mutationFn: (input: T) => Promise<Menu>) {
  const cacheMenu = useCacheMenu();
  return useMutation({ mutationFn, onSuccess: cacheMenu });
}

/** Creates a menu, or adds the next version when `id` is given. */
export const useSaveMenu = (id?: string) =>
  useMenuMutation((input: MenuInput | MenuVersionInput) =>
    id ? menusApi.addVersion(id, input) : menusApi.create(input as MenuInput),
  );

export const useRenameMenu = (id: string) =>
  useMenuMutation((title: string) => menusApi.rename(id, title));

export const useConfirmMenuVersion = (id: string) =>
  useMenuMutation((versionId: string) => menusApi.confirm(id, versionId));

export const useReplaceMeal = (id: string) =>
  useMenuMutation((input: ReplaceMealInput) => menusApi.replaceMeal(id, input));

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
