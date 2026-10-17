import { request } from './http';
import type { Menu, MenuSummary } from './types';

export const menusApi = {
  list: (): Promise<MenuSummary[]> => request('/menus'),
  get: (id: string): Promise<Menu> => request(`/menus/${id}`),
  rename: (id: string, title: string): Promise<Menu> =>
    request(`/menus/${id}`, { method: 'PATCH', body: { title } }),
  remove: (id: string): Promise<void> => request(`/menus/${id}`, { method: 'DELETE' }),
  confirm: (id: string, versionId: string): Promise<Menu> =>
    request(`/menus/${id}/versions/${versionId}/confirm`, { method: 'POST' }),
};
