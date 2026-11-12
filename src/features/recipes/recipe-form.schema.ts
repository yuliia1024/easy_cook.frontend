import { z } from 'zod';
import type { DietTag, FoodItem, MealType, Recipe, RecipeInput } from '../../api/types';
import { hasMaxDecimals, parseOptionalNumber } from '../../lib/format';
import { DIET_TAG_LABELS, MEAL_TYPE_LABELS } from '../../lib/labels';
import {
  INGREDIENT_MAX_QUANTITY_G,
  MAX_RECIPE_INGREDIENTS,
  MAX_SERVING_KCAL,
  MAX_SERVING_WEIGHT_G,
  RECIPE_DESCRIPTION_MAX_LENGTH,
  RECIPE_INSTRUCTIONS_MAX_LENGTH,
} from '../../lib/limits';
import { round, servingLoad } from '../../lib/nutrition';

const keys = <T extends string>(labels: Record<T, string>) => Object.keys(labels) as [T, ...T[]];

const ingredientSchema = z.object({
  /** Kept for display and the live nutrition preview; not sent. */
  food: z.custom<FoodItem>(),
  quantityG: z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Enter a weight' })
        .min(0.01, 'Must be greater than 0')
        .max(INGREDIENT_MAX_QUANTITY_G, `At most ${INGREDIENT_MAX_QUANTITY_G} g`)
        .refine((value) => hasMaxDecimals(value, 2), 'At most two decimal places'),
    ),
  isOptional: z.boolean(),
  notes: z.string().trim().max(500, 'At most 500 characters'),
});

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .transform(parseOptionalNumber)
    .pipe(
      z
        .number({ error: 'Enter a whole number' })
        .int('Must be a whole number')
        .min(min, `At least ${min}`)
        .max(max, `At most ${max}`)
        .nullable(),
    );

export const recipeFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(255, 'At most 255 characters'),
    description: z
      .string()
      .trim()
      .max(RECIPE_DESCRIPTION_MAX_LENGTH, `At most ${RECIPE_DESCRIPTION_MAX_LENGTH} characters`),
    instructions: z
      .string()
      .trim()
      .min(1, 'Describe the instructions')
      .max(RECIPE_INSTRUCTIONS_MAX_LENGTH, `At most ${RECIPE_INSTRUCTIONS_MAX_LENGTH} characters`),
    mealType: z.enum(keys(MEAL_TYPE_LABELS), { error: 'Choose a meal type' }),
    dietType: z.array(z.enum(keys(DIET_TAG_LABELS))),
    servings: optionalInt(1, 100).pipe(z.number({ error: 'Enter the number of servings' })),
    prepTimeMinutes: optionalInt(0, 24 * 60),
    ingredients: z
      .array(ingredientSchema)
      .min(1, 'Add at least one ingredient')
      .max(MAX_RECIPE_INGREDIENTS, `At most ${MAX_RECIPE_INGREDIENTS} ingredients`),
  })
  .superRefine((recipe, ctx) => {
    if (ctx.issues.length > 0) return;
    // A form-level error on the ingredient list, as the backend checks the whole recipe.
    const { weightG, kcal: rawKcal } = servingLoad(recipe.ingredients, recipe.servings);
    // The backend checks the per-serving kcal rounded to one decimal.
    const kcal = round(rawKcal);
    if (weightG > MAX_SERVING_WEIGHT_G) {
      ctx.addIssue({
        code: 'custom',
        path: ['ingredients'],
        message: `One serving would weigh ${Math.round(weightG)} g; at most ${MAX_SERVING_WEIGHT_G} g`,
      });
    } else if (kcal > MAX_SERVING_KCAL) {
      ctx.addIssue({
        code: 'custom',
        path: ['ingredients'],
        message: `One serving would have ${kcal} kcal; at most ${MAX_SERVING_KCAL} kcal`,
      });
    }
  });

export type RecipeFormValues = z.input<typeof recipeFormSchema>;
export type RecipeFormOutput = z.output<typeof recipeFormSchema>;

export function toRecipeFormValues(recipe?: Recipe): RecipeFormValues {
  return {
    name: recipe?.name ?? '',
    description: recipe?.description ?? '',
    instructions: recipe?.instructions ?? '',
    mealType: recipe?.mealType ?? ('lunch' satisfies MealType),
    dietType: recipe?.dietType ?? ([] as DietTag[]),
    servings: String(recipe?.servings ?? 2),
    prepTimeMinutes:
      recipe?.prepTimeMinutes === null || !recipe ? '' : String(recipe.prepTimeMinutes),
    ingredients: (recipe?.ingredients ?? [])
      .toSorted((a, b) => a.position - b.position)
      .map((ingredient) => ({
        food: ingredient.foodItem,
        quantityG: String(ingredient.quantityG),
        isOptional: ingredient.isOptional,
        notes: ingredient.notes ?? '',
      })),
  };
}

export function toRecipeInput(values: RecipeFormOutput): RecipeInput {
  return {
    name: values.name,
    description: values.description || null,
    instructions: values.instructions,
    mealType: values.mealType,
    dietType: values.dietType,
    servings: values.servings,
    prepTimeMinutes: values.prepTimeMinutes,
    ingredients: values.ingredients.map((ingredient) => ({
      foodItemId: ingredient.food.id,
      quantityG: ingredient.quantityG,
      isOptional: ingredient.isOptional,
      notes: ingredient.notes || null,
    })),
  };
}
