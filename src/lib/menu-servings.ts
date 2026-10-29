import type { Macros } from '../api/types';
import { MENU_SERVINGS_LIMITS } from './limits';

/** The recipe page for a menu meal: `?servings=` shows the amounts of the meal. */
export function menuRecipePath(recipeId: string, servings: number): string {
  return `/recipes/${recipeId}?servings=${servings}`;
}

/** The `servings` of `menuRecipePath`; null when missing or outside what a menu meal can have. */
export function parseMenuServings(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const servings = Number(value);
  return Number.isFinite(servings) &&
    servings >= MENU_SERVINGS_LIMITS.min &&
    servings <= MENU_SERVINGS_LIMITS.max
    ? servings
    : null;
}

/** Every value times `factor`. */
export function scaleMacros(values: Macros, factor: number): Macros {
  return {
    kcal: values.kcal * factor,
    proteinG: values.proteinG * factor,
    fatG: values.fatG * factor,
    carbsG: values.carbsG * factor,
  };
}
