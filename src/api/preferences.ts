import { request } from './http';
import type { DietaryPreference, DietaryPreferenceInput } from './types';

export const preferencesApi = {
  /** 404 until the profile is saved. */
  list: (): Promise<DietaryPreference[]> => request('/preferences'),
  add: (input: DietaryPreferenceInput): Promise<DietaryPreference> =>
    request('/preferences', { method: 'POST', body: input }),
  remove: (id: string): Promise<void> => request(`/preferences/${id}`, { method: 'DELETE' }),
};
