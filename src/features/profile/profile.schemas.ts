import { z } from 'zod';
import type {
  ActivityLevel,
  Goal,
  ManualGoalInput,
  NutritionGoal,
  Profile,
  ProfileInput,
  Sex,
} from '../../api/types';
import { hasMaxDecimals, parseOptionalNumber } from '../../lib/format';
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS, SEX_LABELS } from '../../lib/labels';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

/** A required number in `[min, max]` typed as text; `decimals` mirrors the backend. */
const number = (min: number, max: number, decimals: number, unit = '') =>
  z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Введіть число' })
        .min(min, `Від ${min}${unit}`)
        .max(max, `До ${max}${unit}`)
        .refine(
          (value) => hasMaxDecimals(value, decimals),
          decimals === 0 ? 'Ціле число' : `Не більше ${decimals} знаку після коми`,
        ),
    );

// PROFILE_LIMITS in the backend.
export const profileFormSchema = z.object({
  age: number(14, 100, 0),
  heightCm: number(100, 250, 1, ' см'),
  weightKg: number(30, 300, 1, ' кг'),
  sex: z.enum(keys(SEX_LABELS)),
  activityLevel: z.enum(keys(ACTIVITY_LEVEL_LABELS)),
  goal: z.enum(keys(GOAL_LABELS)),
});

export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormOutput = z.output<typeof profileFormSchema> & ProfileInput;

export function toProfileFormValues(profile: Profile | null): ProfileFormValues {
  return {
    age: profile ? String(profile.age) : '',
    heightCm: profile ? String(profile.heightCm) : '',
    weightKg: profile ? String(profile.weightKg) : '',
    sex: profile?.sex ?? ('female' satisfies Sex),
    activityLevel: profile?.activityLevel ?? ('moderate' satisfies ActivityLevel),
    goal: profile?.goal ?? ('maintain' satisfies Goal),
  };
}

// SetNutritionGoalDto in the backend.
export const manualGoalSchema = z.object({
  caloriesKcal: number(800, 6000, 1, ' ккал'),
  proteinG: number(0, 500, 1, ' г'),
  fatG: number(0, 400, 1, ' г'),
  carbsG: number(0, 1000, 1, ' г'),
  /** `yyyy-mm-dd` from a date input; empty = now. */
  effectiveFrom: z.string(),
});

export type ManualGoalFormValues = z.input<typeof manualGoalSchema>;
export type ManualGoalFormOutput = z.output<typeof manualGoalSchema>;

export function toManualGoalFormValues(goal: NutritionGoal | null): ManualGoalFormValues {
  return {
    caloriesKcal: goal ? String(goal.caloriesKcal) : '',
    proteinG: goal ? String(goal.proteinG) : '',
    fatG: goal ? String(goal.fatG) : '',
    carbsG: goal ? String(goal.carbsG) : '',
    effectiveFrom: '',
  };
}

export function toManualGoalInput({
  effectiveFrom,
  ...targets
}: ManualGoalFormOutput): ManualGoalInput {
  // A picked day starts at local midnight.
  return effectiveFrom
    ? { ...targets, effectiveFrom: new Date(`${effectiveFrom}T00:00:00`).toISOString() }
    : targets;
}

/** Calories implied by the macros (4/9/4 kcal per gram), to compare with the target. */
export function kcalFromMacros(proteinG: number, fatG: number, carbsG: number): number {
  return Math.round(proteinG * 4 + fatG * 9 + carbsG * 4);
}
