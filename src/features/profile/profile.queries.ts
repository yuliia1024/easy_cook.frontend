import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/http';
import { nutritionGoalsApi, profileApi } from '../../api/profile';
import type {
  ManualGoalInput,
  NutritionGoal,
  NutritionTargets,
  Profile,
  ProfileInput,
} from '../../api/types';

export const profileKeys = {
  profile: ['profile'] as const,
  goals: ['nutrition-goals'] as const,
  currentGoal: ['nutrition-goals', 'current'] as const,
  history: ['nutrition-goals', 'history'] as const,
  preview: ['nutrition-goals', 'preview'] as const,
};

/** 404 is "not filled in yet", returned as `null` instead of an error. */
const nullOn404 = async <T>(load: () => Promise<T>): Promise<T | null> => {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
};

export function useProfile() {
  return useQuery({ queryKey: profileKeys.profile, queryFn: () => nullOn404(profileApi.get) });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput): Promise<Profile> => profileApi.save(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile, profile);
      // The rule based preview depends on the profile.
      return queryClient.invalidateQueries({ queryKey: profileKeys.preview });
    },
  });
}

export function useCurrentGoal(enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.currentGoal,
    queryFn: () => nullOn404(nutritionGoalsApi.current),
    enabled,
  });
}

export function useGoalHistory(enabled: boolean) {
  return useQuery({ queryKey: profileKeys.history, queryFn: nutritionGoalsApi.history, enabled });
}

export function useGoalPreview(enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.preview,
    queryFn: () => nutritionGoalsApi.preview(),
    enabled,
  });
}

/** Macros for calories typed by hand; on demand, nothing is saved. */
export function useRecalculateMacros() {
  return useMutation({
    mutationFn: (caloriesKcal: number): Promise<NutritionTargets> =>
      nutritionGoalsApi.preview(caloriesKcal),
  });
}

function useGoalMutation<T>(mutationFn: (input: T) => Promise<NutritionGoal>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.goals }),
  });
}

export const useCalculateGoal = () => useGoalMutation<void>(() => nutritionGoalsApi.calculate());

export const useSetManualGoal = () =>
  useGoalMutation<ManualGoalInput>((input) => nutritionGoalsApi.setManual(input));
