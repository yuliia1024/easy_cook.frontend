import { z } from 'zod';
import type { GenerateMenuInput, MealType } from '../../api/types';
import { parseOptionalNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS } from '../../lib/labels';
import {
  MAX_MEALS_PER_DAY,
  MAX_MENU_DAYS,
  MENU_NOTES_MAX_LENGTH,
  MENU_TITLE_MAX_LENGTH,
} from '../../lib/limits';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

export const generateMenuSchema = z.object({
  title: z
    .string()
    .trim()
    .max(MENU_TITLE_MAX_LENGTH, `At most ${MENU_TITLE_MAX_LENGTH} characters`),
  days: z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Enter the number of days' })
        .int('Must be a whole number')
        .min(1, 'At least 1 day')
        .max(MAX_MENU_DAYS, `At most ${MAX_MENU_DAYS} days`),
    ),
  mealTypes: z
    .array(z.enum(keys(MEAL_TYPE_LABELS)))
    .min(1, 'Choose at least one meal')
    .max(MAX_MEALS_PER_DAY, `At most ${MAX_MEALS_PER_DAY} meals`),
  /** `YYYY-MM-DD` from a date input, or empty for an undated menu. */
  startDate: z.string(),
  instructions: z
    .string()
    .trim()
    .max(MENU_NOTES_MAX_LENGTH, `At most ${MENU_NOTES_MAX_LENGTH} characters`),
});

export type GenerateMenuValues = z.input<typeof generateMenuSchema>;
export type GenerateMenuOutput = z.output<typeof generateMenuSchema>;

export const DEFAULT_GENERATE_VALUES: GenerateMenuValues = {
  title: '',
  days: '3',
  mealTypes: ['breakfast', 'lunch', 'dinner'] satisfies MealType[],
  startDate: '',
  instructions: '',
};

/** Meals of the day in the order of the day, whatever order they were ticked in. */
export function toGenerateInput(values: GenerateMenuOutput): GenerateMenuInput {
  const order = keys(MEAL_TYPE_LABELS);
  return {
    title: values.title || null,
    days: values.days,
    mealTypes: values.mealTypes.toSorted((a, b) => order.indexOf(a) - order.indexOf(b)),
    startDate: values.startDate || null,
    instructions: values.instructions || null,
  };
}
