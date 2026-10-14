import { DefaultChatTransport } from 'ai';
import { BASE_URL, request, streamFetch } from './http';
import type {
  Menu,
  MenuGenerationMessage,
  MenuInput,
  MenuSummary,
  MenuVersionInput,
  ReplaceMealInput,
} from './types';

export const menusApi = {
  list: (): Promise<MenuSummary[]> => request('/menus'),
  get: (id: string): Promise<Menu> => request(`/menus/${id}`),
  create: (input: MenuInput): Promise<Menu> => request('/menus', { method: 'POST', body: input }),
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

/**
 * `POST /menus/generate` streams the planning (AI SDK UI message stream) for `useChat`. The
 * request body is the `GenerateMenuInput` passed as `body` to `sendMessage`, nothing else; 404
 * (no goal) and 422 (no recipes) arrive as `ApiError`s before the stream starts.
 */
export function createMenuGenerationTransport(): DefaultChatTransport<MenuGenerationMessage> {
  return new DefaultChatTransport<MenuGenerationMessage>({
    api: `${BASE_URL}/menus/generate`,
    fetch: streamFetch,
    prepareSendMessagesRequest: ({ body }) => ({ body: body ?? {} }),
  });
}
