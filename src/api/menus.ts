import { request, type CallOptions } from './http';
import type { Menu, MenuStatus, MenuSummary } from './types';

export const menusApi = {
  list: (status: MenuStatus, { signal }: CallOptions = {}): Promise<MenuSummary[]> =>
    request('/menus', { query: { status }, signal }),
  get: (id: string, { signal }: CallOptions = {}): Promise<Menu> =>
    request(`/menus/${encodeURIComponent(id)}`, { signal }),
  rename: (id: string, title: string): Promise<Menu> =>
    request(`/menus/${encodeURIComponent(id)}`, { method: 'PATCH', body: { title } }),
  remove: (id: string): Promise<void> =>
    request(`/menus/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  confirm: (id: string, versionId: string): Promise<Menu> =>
    request(`/menus/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/confirm`, {
      method: 'POST',
    }),
};
