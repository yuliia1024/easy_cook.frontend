import type { Sex } from '../api/types';

// Mirrors `easy_cook.backend/src/common/constants`; change both together.

// KCAL_PER_GRAM in the backend.
export const KCAL_PER_GRAM = { proteinG: 4, fatG: 9, carbsG: 4 } as const;

// BMI_LIMITS and UNDERWEIGHT_BMI in the backend.
export const BMI_LIMITS = { min: 12, max: 70 } as const;
export const UNDERWEIGHT_BMI = 18.5;

// MIN_DAILY_CALORIES_KCAL and MAX_DAILY_CALORIES_KCAL in the backend.
export const MIN_DAILY_CALORIES_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };
export const MAX_DAILY_CALORIES_KCAL = 6000;

// GOAL_KCAL_TOLERANCE in the backend: macro energy within ±10 % of the calorie goal.
export const GOAL_KCAL_TOLERANCE = 0.1;

// MACRO_SHARE_LIMITS and MACRO_SHARE_TOLERANCE in the backend (shares of the macro energy).
export const MACRO_SHARE_LIMITS = {
  proteinG: { min: 0.1, max: 0.35 },
  fatG: { min: 0.2, max: 0.35 },
  carbsG: { min: 0.45, max: 0.65 },
} as const;
export const MACRO_SHARE_TOLERANCE = 0.01;

// GOAL_EFFECTIVE_FROM_MAX_FUTURE_DAYS in the backend (and at most 24 h in the past).
export const GOAL_EFFECTIVE_FROM_MAX_DAYS = 365;

// FOOD_KCAL_TOLERANCE in the backend: |kcal − 4/9/4 estimate| ≤ max(absolute, relative × estimate).
export const FOOD_KCAL_TOLERANCE = { absolute: 20, relative: 0.25 } as const;

// RECIPE_DESCRIPTION_MAX_LENGTH, RECIPE_INSTRUCTIONS_MAX_LENGTH, INGREDIENT_MAX_QUANTITY_G and
// MAX_RECIPE_INGREDIENTS in the backend.
export const RECIPE_DESCRIPTION_MAX_LENGTH = 2000;
export const RECIPE_INSTRUCTIONS_MAX_LENGTH = 10_000;
export const INGREDIENT_MAX_QUANTITY_G = 10_000;
export const MAX_RECIPE_INGREDIENTS = 100;

// MAX_SERVING_WEIGHT_G and MAX_SERVING_KCAL in the backend (all ingredients, optional included).
export const MAX_SERVING_WEIGHT_G = 2000;
export const MAX_SERVING_KCAL = 2500;

// PREFERENCE_VALUE_MAX_LENGTH in the backend.
export const PREFERENCE_VALUE_MAX_LENGTH = 120;

// MESSAGE_MAX_LENGTH in the backend (`constants/chat.ts`).
export const MESSAGE_MAX_LENGTH = 300;

// MENU_TITLE_MAX_LENGTH in the backend (`constants/menu.ts`).
export const MENU_TITLE_MAX_LENGTH = 255;
