import { request, type CallOptions } from './http';
import type {
  ManualGoalInput,
  NutritionGoal,
  NutritionTargets,
  Profile,
  ProfileInput,
} from './types';

export const profileApi = {
  /** 404 until the profile is saved. */
  get: ({ signal }: CallOptions = {}): Promise<Profile> => request('/profile', { signal }),
  save: (input: ProfileInput): Promise<Profile> =>
    request('/profile', { method: 'PUT', body: input }),
};

export const nutritionGoalsApi = {
  /** Newest first. */
  history: ({ signal }: CallOptions = {}): Promise<NutritionGoal[]> =>
    request('/nutrition/goals', { signal }),
  /** 404 until a goal is set. */
  current: ({ signal }: CallOptions = {}): Promise<NutritionGoal> =>
    request('/nutrition/goals/current', { signal }),
  /** With `caloriesKcal`, splits those calories into macros for the profile instead. */
  preview: (caloriesKcal?: number, { signal }: CallOptions = {}): Promise<NutritionTargets> =>
    request('/nutrition/goals/preview', { query: { caloriesKcal }, signal }),
  setManual: (input: ManualGoalInput): Promise<NutritionGoal> =>
    request('/nutrition/goals', { method: 'POST', body: input }),
  calculate: (): Promise<NutritionGoal> =>
    request('/nutrition/goals/calculate', { method: 'POST' }),
};
