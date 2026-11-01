import type { MenuVersion, SuggestedMenu } from '../../api/types';

/** A saved menu version laid out as the menu a reply suggests. */
export function toSuggestedMenu(version: MenuVersion): SuggestedMenu {
  return {
    days: version.days.map((day) => ({
      dayIndex: day.dayIndex,
      date: day.date,
      meals: day.meals.map((meal) => ({
        position: meal.position,
        mealType: meal.mealType,
        recipeId: meal.recipeId,
        recipeName: meal.recipe.name,
        servings: meal.servings,
        nutrition: meal.nutrition,
        complete: meal.complete,
      })),
      totals: day.totals,
      complete: day.complete,
    })),
    dailyAverage: version.dailyAverage,
    issues: version.issues,
  };
}
