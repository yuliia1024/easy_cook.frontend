import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menusApi } from '../../api/menus';
import type { Menu, MenuStatus, MenuSummary } from '../../api/types';
import { chatKeys } from '../chat/chat.queries';

export const menuKeys = {
  all: ['menus'] as const,
  list: () => [...menuKeys.all, 'list'] as const,
  listOf: (status: MenuStatus) => [...menuKeys.list(), status] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
};

export function useMenus(status: MenuStatus) {
  return useQuery({
    queryKey: menuKeys.listOf(status),
    queryFn: ({ signal }) => menusApi.list(status, { signal }),
  });
}

const byConfirmedAtDesc = (menus: MenuSummary[]): MenuSummary[] =>
  [...menus].sort((a, b) => (b.confirmedAt ?? '').localeCompare(a.confirmedAt ?? ''));

/** The confirmed menus, last confirmed first: the first one is the active menu. */
export function useConfirmedMenus() {
  return useQuery({
    queryKey: menuKeys.listOf('confirmed'),
    queryFn: ({ signal }) => menusApi.list('confirmed', { signal }),
    select: byConfirmedAtDesc,
  });
}

export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: menuKeys.detail(id ?? ''),
    queryFn: ({ signal }) => menusApi.get(id!, { signal }),
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

/**
 * `onDeleted` runs before the menu leaves the cache: a page showing it navigates away there, or it
 * would refetch the menu into a 404. The menu leaves the lists at once, so it is not opened again
 * as the active menu meanwhile.
 */
export function useDeleteMenu({ onDeleted }: { onDeleted?: (id: string) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menusApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<MenuSummary[]>({ queryKey: menuKeys.list() }, (menus) =>
        menus?.filter((menu) => menu.id !== id),
      );
      onDeleted?.(id);
      queryClient.removeQueries({ queryKey: menuKeys.detail(id), exact: true });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: menuKeys.list() }),
        // The backend unlinks the menu from its conversations and replies.
        queryClient.invalidateQueries({ queryKey: chatKeys.all }),
      ]);
    },
  });
}
