import { request } from './http';
import type {
  ManualGoalInput,
  NutritionGoal,
  NutritionTargets,
  Profile,
  ProfileInput,
} from './types';

export const profileApi = {
  /** 404 until the profile is saved. */
  get: (): Promise<Profile> => request('/profile'),
  save: (input: ProfileInput): Promise<Profile> =>
    request('/profile', { method: 'PUT', body: input }),
};

export const nutritionGoalsApi = {
  /** Newest first. */
  history: (): Promise<NutritionGoal[]> => request('/nutrition/goals'),
  /** 404 until a goal is set. */
  current: (): Promise<NutritionGoal> => request('/nutrition/goals/current'),
  /** With `caloriesKcal`, splits those calories into macros for the profile instead. */
  preview: (caloriesKcal?: number): Promise<NutritionTargets> =>
    request('/nutrition/goals/preview', { query: { caloriesKcal } }),
  setManual: (input: ManualGoalInput): Promise<NutritionGoal> =>
    request('/nutrition/goals', { method: 'POST', body: input }),
  calculate: (): Promise<NutritionGoal> =>
    request('/nutrition/goals/calculate', { method: 'POST' }),
};
