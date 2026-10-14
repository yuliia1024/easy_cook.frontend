import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/http';
import { preferencesApi } from '../../api/preferences';
import type { DietaryPreferenceInput } from '../../api/types';

export const preferenceKeys = { all: ['preferences'] as const };

/** `null` while the profile is not filled in (the API answers 404). */
export function usePreferences() {
  return useQuery({
    queryKey: preferenceKeys.all,
    queryFn: async () => {
      try {
        return await preferencesApi.list();
      } catch (error) {
        if (error instanceof ApiError && error.isNotFound) return null;
        throw error;
      }
    },
  });
}

export function useAddPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DietaryPreferenceInput) => preferencesApi.add(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preferenceKeys.all }),
  });
}

export function useRemovePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => preferencesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preferenceKeys.all }),
  });
}
