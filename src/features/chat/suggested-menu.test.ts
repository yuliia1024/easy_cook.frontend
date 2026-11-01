import { buildMenuMeal, buildMenuVersion, buildRecipeSnapshot } from '../../test/fixtures';
import { toSuggestedMenu } from './suggested-menu';

describe('toSuggestedMenu', () => {
  it('lays out the days, meals and totals of a version, a meal named after its recipe snapshot', () => {
    const meal = buildMenuMeal({
      position: 1,
      mealType: 'dinner',
      recipeId: null,
      servings: 1.5,
      complete: false,
      recipe: buildRecipeSnapshot({ name: 'Deleted stew' }),
    });
    const issue = { severity: 'warning', code: 'calories_off_target', message: 'Too few' } as const;
    const version = buildMenuVersion({ issues: [issue] });
    version.days[0].meals.push(meal);

    expect(toSuggestedMenu(version)).toEqual({
      days: [
        {
          dayIndex: 0,
          date: '2026-10-20',
          meals: [
            {
              position: 0,
              mealType: 'lunch',
              recipeId: '22222222-2222-4222-8222-222222222222',
              recipeName: 'Buckwheat with chicken',
              servings: 1,
              nutrition: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
              complete: true,
            },
            {
              position: 1,
              mealType: 'dinner',
              recipeId: null,
              recipeName: 'Deleted stew',
              servings: 1.5,
              nutrition: meal.nutrition,
              complete: false,
            },
          ],
          totals: version.days[0].totals,
          complete: true,
        },
      ],
      dailyAverage: version.dailyAverage,
      issues: [issue],
    });
  });
});
