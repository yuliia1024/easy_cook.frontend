import type { Recipe } from '../../api/types';
import { DIET_TAG_LABELS, MEAL_TYPE_LABELS } from '../../lib/labels';

/** Meal type, servings, prep time and diet tags in one line. */
export function recipeFacts(recipe: Recipe): string {
  return [
    MEAL_TYPE_LABELS[recipe.mealType],
    `${recipe.servings} serv.`,
    recipe.prepTimeMinutes !== null && `${recipe.prepTimeMinutes} min`,
    recipe.dietType.length > 0 && recipe.dietType.map((tag) => DIET_TAG_LABELS[tag]).join(', '),
  ]
    .filter(Boolean)
    .join(' · ');
}
