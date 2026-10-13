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
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS, MACRO_LABELS, SEX_LABELS } from '../../lib/labels';
import {
  BMI_LIMITS,
  GOAL_EFFECTIVE_FROM_MAX_DAYS,
  GOAL_KCAL_TOLERANCE,
  MACRO_SHARE_LIMITS,
  MAX_DAILY_CALORIES_KCAL,
  MIN_DAILY_CALORIES_KCAL,
  UNDERWEIGHT_BMI,
} from '../../lib/limits';
import { bmi, isMacroShareAllowed, kcalFromMacros, macroShares } from '../../lib/nutrition';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

/** A required number in `[min, max]` typed as text; `decimals` mirrors the backend. */
const number = (min: number, max: number, decimals: number, unit = '') =>
  z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Enter a number' })
        .min(min, `At least ${min}${unit}`)
        .max(max, `At most ${max}${unit}`)
        .refine(
          (value) => hasMaxDecimals(value, decimals),
          decimals === 0 ? 'Must be a whole number' : `At most ${decimals} decimal place(s)`,
        ),
    );

// PROFILE_LIMITS in the backend; BMI rules as in the backend profile service.
export const profileFormSchema = z
  .object({
    age: number(14, 100, 0),
    heightCm: number(100, 250, 1, ' cm'),
    weightKg: number(30, 300, 1, ' kg'),
    sex: z.enum(keys(SEX_LABELS)),
    activityLevel: z.enum(keys(ACTIVITY_LEVEL_LABELS)),
    goal: z.enum(keys(GOAL_LABELS)),
  })
  .superRefine((profile, ctx) => {
    if (ctx.issues.length > 0) return;
    const value = bmi(profile.heightCm, profile.weightKg);
    if (value < BMI_LIMITS.min || value > BMI_LIMITS.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightKg'],
        message: `Weight and height give an implausible BMI (${value.toFixed(1)}); check the values`,
      });
    } else if (profile.goal === 'lose_weight' && value < UNDERWEIGHT_BMI) {
      ctx.addIssue({
        code: 'custom',
        path: ['goal'],
        message: `Losing weight is not allowed with a BMI below ${UNDERWEIGHT_BMI}`,
      });
    }
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

/** Daily calories a user may set by hand for the profile sex. */
export const caloriesSchema = (sex: Sex) =>
  number(MIN_DAILY_CALORIES_KCAL[sex], MAX_DAILY_CALORIES_KCAL, 1, ' kcal');

/** `yyyy-mm-dd` of the local day, as a date input holds it. */
export function toDateInputValue(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days a manual goal may start on: today … today + `GOAL_EFFECTIVE_FROM_MAX_DAYS`. */
export function effectiveFromRange(now = new Date()): { min: string; max: string } {
  const last = new Date(now);
  last.setDate(last.getDate() + GOAL_EFFECTIVE_FROM_MAX_DAYS);
  return { min: toDateInputValue(now), max: toDateInputValue(last) };
}

export const GOAL_MACROS = ['proteinG', 'fatG', 'carbsG'] as const;

/** A 0–1 share as whole percent. */
export const percent = (share: number): number => Math.round(share * 100);

// SetNutritionGoalDto in the backend; the calorie minimum depends on the profile sex.
export const manualGoalSchema = (sex: Sex) =>
  z
    .object({
      caloriesKcal: caloriesSchema(sex),
      proteinG: number(0, 500, 1, ' g'),
      fatG: number(0, 400, 1, ' g'),
      carbsG: number(0, 1000, 1, ' g'),
      /** `yyyy-mm-dd` from a date input; empty = now. */
      effectiveFrom: z.string().superRefine((day, ctx) => {
        if (!day) return;
        // Checked when validating, not when the schema is built, so "today" stays current.
        const { min, max } = effectiveFromRange();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          ctx.addIssue({ code: 'custom', message: 'Enter a date' });
        } else if (day < min) {
          ctx.addIssue({ code: 'custom', message: 'Cannot be in the past' });
        } else if (day > max) {
          ctx.addIssue({
            code: 'custom',
            message: `At most ${GOAL_EFFECTIVE_FROM_MAX_DAYS} days ahead`,
          });
        }
      }),
    })
    .superRefine((goal, ctx) => {
      if (ctx.issues.length > 0) return;
      const macroKcal = kcalFromMacros(goal);
      if (Math.abs(macroKcal - goal.caloriesKcal) > goal.caloriesKcal * GOAL_KCAL_TOLERANCE) {
        ctx.addIssue({
          code: 'custom',
          path: ['caloriesKcal'],
          message: `Protein, fat and carbs give ${Math.round(macroKcal)} kcal, more than ${percent(
            GOAL_KCAL_TOLERANCE,
          )} % away from the ${goal.caloriesKcal} kcal goal`,
        });
      }
      const shares = macroShares(goal);
      if (!shares) return;
      for (const macro of GOAL_MACROS) {
        if (isMacroShareAllowed(macro, shares[macro])) continue;
        const { min, max } = MACRO_SHARE_LIMITS[macro];
        ctx.addIssue({
          code: 'custom',
          path: [macro],
          message: `${MACRO_LABELS[macro]} must be ${percent(min)}–${percent(max)} % of the calories (now ${percent(shares[macro])} %)`,
        });
      }
    });

export type ManualGoalFormValues = z.input<ReturnType<typeof manualGoalSchema>>;
export type ManualGoalFormOutput = z.output<ReturnType<typeof manualGoalSchema>>;

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
