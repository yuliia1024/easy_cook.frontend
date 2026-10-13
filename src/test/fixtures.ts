import type { FoodItem, NutritionGoal, Page, Profile, Recipe, RecipeNutrition } from '../api/types';

const NOW = '2026-10-13T10:00:00.000Z';

export function buildFood(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Buckwheat, dry',
    nameEn: 'Buckwheat groats, dry',
    kcalPer100g: 343,
    proteinG: 13.3,
    fatG: 3.4,
    carbsG: 71.5,
    state: 'dried',
    source: 'seed',
    sourceId: 'buckwheat-dry',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const food = buildFood();
  return {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Buckwheat with chicken',
    description: 'A simple lunch.',
    instructions: 'Boil the buckwheat.',
    mealType: 'lunch',
    dietType: ['high_protein'],
    servings: 2,
    prepTimeMinutes: 30,
    source: 'manual',
    sourceId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ingredients: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        foodItemId: food.id,
        quantityG: 150,
        isOptional: false,
        notes: null,
        position: 0,
        foodItem: food,
      },
    ],
    nutritionPerServing: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    nutritionComplete: true,
    ...overrides,
  };
}

export function buildNutrition(overrides: Partial<RecipeNutrition> = {}): RecipeNutrition {
  return {
    recipeId: '22222222-2222-4222-8222-222222222222',
    servings: 2,
    includeOptional: false,
    basis: 'ingredients_sum',
    total: { kcal: 514.5, proteinG: 20, fatG: 5.1, carbsG: 107.3 },
    perServing: { kcal: 257.3, proteinG: 10, fatG: 2.6, carbsG: 53.6 },
    complete: true,
    ingredients: [
      {
        ingredientId: '33333333-3333-4333-8333-333333333333',
        foodItemId: '11111111-1111-4111-8111-111111111111',
        foodName: 'Buckwheat, dry',
        state: 'dried',
        quantityG: 150,
        isOptional: false,
        counted: true,
        macros: { kcal: 514.5, proteinG: 20, fatG: 5.1, carbsG: 107.3 },
        missing: [],
      },
    ],
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    age: 30,
    heightCm: 170,
    weightKg: 65.5,
    sex: 'female',
    activityLevel: 'moderate',
    goal: 'maintain',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildGoal(overrides: Partial<NutritionGoal> = {}): NutritionGoal {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    caloriesKcal: 2100,
    proteinG: 105,
    fatG: 58,
    carbsG: 289,
    calculationMode: 'rule_based',
    ruleVersion: 'mifflin-st-jeor-v1',
    effectiveFrom: NOW,
    ...overrides,
  };
}

export function page<T>(items: T[], overrides: Partial<Page<T>> = {}): Page<T> {
  return { items, total: items.length, page: 1, limit: 20, ...overrides };
}
