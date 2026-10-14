import { z } from 'zod';
import type { Menu, MenuInput, MenuVersionInput } from '../../api/types';
import { hasMaxDecimals, parseOptionalNumber } from '../../lib/format';
import { MEAL_TYPE_LABELS } from '../../lib/labels';
import {
  MAX_MEALS_PER_DAY,
  MAX_MENU_DAYS,
  MENU_MEAL_SERVINGS,
  MENU_NOTES_MAX_LENGTH,
  MENU_TITLE_MAX_LENGTH,
} from '../../lib/limits';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

/** The chosen recipe, kept for display; only the id is sent. */
export interface PickedRecipe {
  id: string;
  name: string;
}

const mealSchema = z
  .object({
    mealType: z.enum(keys(MEAL_TYPE_LABELS)),
    recipe: z.custom<PickedRecipe | null>(),
    /** Name of a recipe deleted since the version was built; it must be replaced. */
    deletedName: z.string().nullable(),
    servings: z
      .string()
      .transform(parseOptionalNumber)
      .pipe(
        z
          .number({ error: 'Enter servings' })
          .min(MENU_MEAL_SERVINGS.min, `At least ${MENU_MEAL_SERVINGS.min}`)
          .max(MENU_MEAL_SERVINGS.max, `At most ${MENU_MEAL_SERVINGS.max}`)
          .refine((value) => hasMaxDecimals(value, 2), 'At most two decimal places'),
      ),
  })
  .superRefine((meal, ctx) => {
    if (!meal.recipe) {
      ctx.addIssue({
        code: 'custom',
        path: ['recipe'],
        message: meal.deletedName ? 'The recipe was deleted; choose another' : 'Choose a recipe',
      });
    }
  });

const daySchema = z.object({
  /** `YYYY-MM-DD` from a date input, or empty. */
  date: z.string(),
  meals: z
    .array(mealSchema)
    .min(1, 'Add at least one meal')
    .max(MAX_MEALS_PER_DAY, `At most ${MAX_MEALS_PER_DAY} meals a day`),
});

/** `withTitle` for a new menu; a new version keeps the title. */
export const menuFormSchema = (withTitle: boolean) =>
  z.object({
    title: withTitle
      ? z
          .string()
          .trim()
          .min(1, 'Enter a title')
          .max(MENU_TITLE_MAX_LENGTH, `At most ${MENU_TITLE_MAX_LENGTH} characters`)
      : z.string(),
    notes: z
      .string()
      .trim()
      .max(MENU_NOTES_MAX_LENGTH, `At most ${MENU_NOTES_MAX_LENGTH} characters`),
    days: z
      .array(daySchema)
      .min(1, 'Add at least one day')
      .max(MAX_MENU_DAYS, `At most ${MAX_MENU_DAYS} days`),
  });

export type MenuFormValues = z.input<ReturnType<typeof menuFormSchema>>;
export type MenuFormOutput = z.output<ReturnType<typeof menuFormSchema>>;
export type MealFormValues = MenuFormValues['days'][number]['meals'][number];

export const emptyMeal = (): MealFormValues => ({
  mealType: 'lunch',
  recipe: null,
  deletedName: null,
  servings: '1',
});

/** A new menu, or the latest version of `menu` as the start of the next one. */
export function toMenuFormValues(menu?: Menu): MenuFormValues {
  const latest = menu?.versions[0];
  if (!latest) {
    return { title: '', notes: '', days: [{ date: '', meals: [emptyMeal()] }] };
  }
  return {
    title: menu.title,
    notes: '',
    days: latest.days
      .toSorted((a, b) => a.dayIndex - b.dayIndex)
      .map((day) => ({
        date: day.date ?? '',
        meals: day.meals
          .toSorted((a, b) => a.position - b.position)
          .map((meal) => ({
            mealType: meal.mealType,
            recipe: meal.recipeId ? { id: meal.recipeId, name: meal.recipe.name } : null,
            deletedName: meal.recipeId ? null : meal.recipe.name,
            servings: String(meal.servings),
          })),
      })),
  };
}

/** Days are numbered in the order of the form. */
export function toMenuVersionInput(values: MenuFormOutput): MenuVersionInput {
  return {
    notes: values.notes || null,
    days: values.days.map((day, dayIndex) => ({
      dayIndex,
      date: day.date || null,
      meals: day.meals.map((meal) => ({
        mealType: meal.mealType,
        recipeId: meal.recipe!.id,
        servings: meal.servings,
      })),
    })),
  };
}

export const toMenuInput = (values: MenuFormOutput): MenuInput => ({
  title: values.title,
  ...toMenuVersionInput(values),
});
