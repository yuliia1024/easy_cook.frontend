import { buildFood, buildRecipe } from '../../test/fixtures';
import { recipeFormSchema, toRecipeFormValues, toRecipeInput } from './recipe-form.schema';

// Buckwheat, 343 kcal per 100 g; 150 g for 2 servings.
const valid = toRecipeFormValues(buildRecipe());
const [line] = valid.ingredients;

const messages = (values: unknown): string[] =>
  recipeFormSchema.safeParse(values).error?.issues.map((issue) => issue.message) ?? [];

describe('recipeFormSchema', () => {
  it('round-trips a recipe without the source', () => {
    const input = toRecipeInput(recipeFormSchema.parse(valid));
    expect(input).toMatchObject({
      name: 'Buckwheat with chicken',
      servings: 2,
      ingredients: [{ foodItemId: line.food.id, quantityG: 150, isOptional: false, notes: null }],
    });
    expect(input).not.toHaveProperty('source');
  });

  it('limits the ingredient weight to 10000 g', () => {
    const ingredients = [{ ...line, quantityG: '10001' }];
    expect(messages({ ...valid, ingredients })).toEqual(['At most 10000 g']);
  });

  it('limits the description and the instructions', () => {
    expect(messages({ ...valid, description: 'x'.repeat(2000) })).toEqual([]);
    expect(messages({ ...valid, description: 'x'.repeat(2001) })).toEqual([
      'At most 2000 characters',
    ]);
    expect(messages({ ...valid, instructions: 'x'.repeat(10_000) })).toEqual([]);
    expect(messages({ ...valid, instructions: 'x'.repeat(10_001) })).toEqual([
      'At most 10000 characters',
    ]);
  });

  it('limits the weight of a serving, optional ingredients included', () => {
    const ingredients = [
      { ...line, quantityG: '3000' },
      { ...line, food: buildFood({ kcalPer100g: 0 }), quantityG: '1001', isOptional: true },
    ];
    const result = recipeFormSchema.safeParse({ ...valid, ingredients });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['ingredients'],
        message: 'One serving would weigh 2001 g; at most 2000 g',
      }),
    ]);
    expect(messages({ ...valid, ingredients, servings: '5' })).toEqual([]);
  });

  it('limits the calories of a serving', () => {
    // 1500 g × 3.43 kcal in one serving.
    const ingredients = [{ ...line, quantityG: '1500' }];
    expect(messages({ ...valid, ingredients, servings: '1' })).toEqual([
      'One serving would have 5145 kcal; at most 2500 kcal',
    ]);
    expect(messages({ ...valid, ingredients, servings: '3' })).toEqual([]);
  });

  it('skips the serving limits while a field is invalid', () => {
    const ingredients = [{ ...line, quantityG: '9000' }];
    expect(messages({ ...valid, ingredients, servings: '' })).toEqual([
      'Enter the number of servings',
    ]);
  });
});
