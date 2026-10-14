import type {
  ActivityLevel,
  CalculationMode,
  DietTag,
  FoodSource,
  FoodState,
  Goal,
  Macro,
  MealType,
  MenuGeneratedBy,
  PreferenceType,
  Sex,
} from '../api/types';

export const FOOD_STATE_LABELS: Record<FoodState, string> = {
  raw: 'raw',
  cooked: 'cooked',
  boiled: 'boiled',
  steamed: 'steamed',
  fried: 'fried',
  baked: 'baked',
  roasted: 'roasted',
  dried: 'dry',
  canned: 'canned',
  frozen: 'frozen',
  other: 'other',
};

export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = {
  usda_fdc: 'USDA FDC',
  seed: 'base set',
  manual: 'manual',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  pescatarian: 'pescatarian',
  gluten_free: 'gluten-free',
  dairy_free: 'dairy-free',
  high_protein: 'high protein',
  low_carb: 'low carb',
};

export const SEX_LABELS: Record<Sex, string> = { male: 'male', female: 'female' };

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1–3 workouts a week)',
  moderate: 'Moderate (3–5 workouts)',
  active: 'Active (6–7 workouts)',
  very_active: 'Very active (daily hard training, physical labour)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: 'Lose weight',
  maintain: 'Maintain weight',
  gain_muscle: 'Gain muscle',
};

export const CALCULATION_MODE_LABELS: Record<CalculationMode, string> = {
  manual: 'manually',
  rule_based: 'by formula',
};

export const MACRO_LABELS: Record<Macro, string> = {
  kcal: 'Calories',
  proteinG: 'Protein',
  fatG: 'Fat',
  carbsG: 'Carbs',
};

export const MACRO_UNITS: Record<Macro, string> = {
  kcal: 'kcal',
  proteinG: 'g',
  fatG: 'g',
  carbsG: 'g',
};

export const PREFERENCE_TYPE_LABELS: Record<PreferenceType, string> = {
  diet: 'Diet',
  allergy: 'Allergy',
  excluded_ingredient: 'Excluded ingredient',
  disliked_food: 'Disliked food',
};

export const MENU_GENERATED_BY_LABELS: Record<MenuGeneratedBy, string> = {
  manual: 'by hand',
  stub: 'stub planner',
  llm: 'AI assistant',
};

export const MACROS: Macro[] = ['kcal', 'proteinG', 'fatG', 'carbsG'];

/** `{ value, label }` pairs for a select, in the declaration order of the labels. */
export function toOptions<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
