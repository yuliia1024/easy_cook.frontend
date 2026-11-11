import { request, type CallOptions } from './http';
import type { DietaryPreference, DietaryPreferenceInput } from './types';

export const preferencesApi = {
  /** 404 until the profile is saved. */
  list: ({ signal }: CallOptions = {}): Promise<DietaryPreference[]> =>
    request('/preferences', { signal }),
  add: (input: DietaryPreferenceInput): Promise<DietaryPreference> =>
    request('/preferences', { method: 'POST', body: input }),
  remove: (id: string): Promise<void> =>
    request(`/preferences/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
