import { request } from './http';
import type {
  GenerateMenuInput,
  Menu,
  MenuInput,
  MenuSummary,
  MenuVersionInput,
  ReplaceMealInput,
} from './types';

export const menusApi = {
  list: (): Promise<MenuSummary[]> => request('/menus'),
  get: (id: string): Promise<Menu> => request(`/menus/${id}`),
  create: (input: MenuInput): Promise<Menu> => request('/menus', { method: 'POST', body: input }),
  /** 404 without a nutrition goal, 422 when the planner finds no valid menu. */
  generate: (input: GenerateMenuInput): Promise<Menu> =>
    request('/menus/generate', { method: 'POST', body: input }),
  rename: (id: string, title: string): Promise<Menu> =>
    request(`/menus/${id}`, { method: 'PATCH', body: { title } }),
  remove: (id: string): Promise<void> => request(`/menus/${id}`, { method: 'DELETE' }),
  addVersion: (id: string, input: MenuVersionInput): Promise<Menu> =>
    request(`/menus/${id}/versions`, { method: 'POST', body: input }),
  confirm: (id: string, versionId: string): Promise<Menu> =>
    request(`/menus/${id}/versions/${versionId}/confirm`, { method: 'POST' }),
  replaceMeal: (id: string, input: ReplaceMealInput): Promise<Menu> =>
    request(`/menus/${id}/replace-meal`, { method: 'POST', body: input }),
};
