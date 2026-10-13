import { z } from 'zod';
import type { FoodItem, FoodItemInput, FoodState } from '../../api/types';
import { hasMaxDecimals, parseOptionalNumber } from '../../lib/format';
import { FOOD_STATE_LABELS } from '../../lib/labels';

/** Mirrors the backend: kcal 0–900, macros 0–100 g, ≤ 2 decimals; empty = unknown (null). */
const nutrient = (max: number) =>
  z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Enter a number' })
        .min(0, 'At least 0')
        .max(max, `At most ${max}`)
        .refine((value) => hasMaxDecimals(value, 2), 'At most two decimal places')
        .nullable(),
    );

export const foodFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(255, 'At most 255 characters'),
    nameEn: z.string().trim().max(255, 'At most 255 characters'),
    state: z.enum(Object.keys(FOOD_STATE_LABELS) as [FoodState, ...FoodState[]], {
      error: 'Choose a state',
    }),
    kcalPer100g: nutrient(900),
    proteinG: nutrient(100),
    fatG: nutrient(100),
    carbsG: nutrient(100),
  })
  .refine((food) => (food.proteinG ?? 0) + (food.fatG ?? 0) + (food.carbsG ?? 0) <= 100, {
    message: 'Protein + fat + carbs cannot exceed 100 g per 100 g',
    path: ['carbsG'],
  });

export type FoodFormValues = z.input<typeof foodFormSchema>;
export type FoodFormOutput = z.output<typeof foodFormSchema>;

const toText = (value: number | null): string => (value === null ? '' : String(value));

export function toFoodFormValues(food?: FoodItem): FoodFormValues {
  return {
    name: food?.name ?? '',
    nameEn: food?.nameEn ?? '',
    state: food?.state ?? 'raw',
    kcalPer100g: toText(food?.kcalPer100g ?? null),
    proteinG: toText(food?.proteinG ?? null),
    fatG: toText(food?.fatG ?? null),
    carbsG: toText(food?.carbsG ?? null),
  };
}

export function toFoodInput(values: FoodFormOutput): FoodItemInput {
  return { ...values, nameEn: values.nameEn || null };
}
