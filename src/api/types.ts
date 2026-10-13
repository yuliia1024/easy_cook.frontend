// Mirrors the backend response DTOs (`easy_cook.backend/src/entrypoints/api`). Dates come as ISO strings.

export type FoodState =
  | 'raw'
  | 'cooked'
  | 'boiled'
  | 'steamed'
  | 'fried'
  | 'baked'
  | 'roasted'
  | 'dried'
  | 'canned'
  | 'frozen'
  | 'other';
export type FoodSource = 'usda_fdc' | 'seed' | 'manual';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietTag =
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'high_protein'
  | 'low_carb';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle';
export type CalculationMode = 'manual' | 'rule_based';
export type Macro = 'kcal' | 'proteinG' | 'fatG' | 'carbsG';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Values per 100 g of the food in `state`. Null = unknown, never 0. */
export interface FoodItem {
  id: string;
  name: string;
  nameEn: string | null;
  kcalPer100g: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  state: FoodState;
  source: FoodSource;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoodItemInput {
  name: string;
  nameEn?: string | null;
  kcalPer100g?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  carbsG?: number | null;
  state: FoodState;
}

export interface FoodQuery {
  search?: string;
  state?: FoodState;
  source?: FoodSource;
  page?: number;
  limit?: number;
}

export type Macros = Record<Macro, number>;

export interface RecipeIngredient {
  id: string;
  foodItemId: string;
  quantityG: number;
  isOptional: boolean;
  notes: string | null;
  position: number;
  foodItem: FoodItem;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  mealType: MealType;
  dietType: DietTag[];
  servings: number;
  prepTimeMinutes: number | null;
  source: string;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  /** Without optional ingredients. */
  nutritionPerServing: Macros;
  nutritionComplete: boolean;
}

export interface RecipeIngredientInput {
  foodItemId: string;
  quantityG: number;
  isOptional?: boolean;
  notes?: string | null;
}

export interface RecipeInput {
  name: string;
  description?: string | null;
  instructions: string;
  mealType: MealType;
  dietType?: DietTag[];
  servings: number;
  prepTimeMinutes?: number | null;
  ingredients: RecipeIngredientInput[];
}

export interface RecipeQuery {
  search?: string;
  mealType?: MealType;
  dietType?: DietTag[];
  page?: number;
  limit?: number;
}

export interface IngredientNutrition {
  ingredientId: string;
  foodItemId: string;
  foodName: string;
  state: FoodState;
  quantityG: number;
  isOptional: boolean;
  /** False for an optional ingredient left out of the totals. */
  counted: boolean;
  macros: Macros;
  missing: Macro[];
}

export interface RecipeNutrition {
  recipeId: string;
  servings: number;
  includeOptional: boolean;
  basis: 'ingredients_sum';
  total: Macros;
  perServing: Macros;
  complete: boolean;
  ingredients: IngredientNutrition[];
}

export interface Profile {
  id: string;
  age: number;
  heightCm: number;
  weightKg: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
  createdAt: string;
  updatedAt: string;
}

export type ProfileInput = Pick<
  Profile,
  'age' | 'heightCm' | 'weightKg' | 'sex' | 'activityLevel' | 'goal'
>;

export interface NutritionTargets {
  caloriesKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface NutritionGoal extends NutritionTargets {
  id: string;
  calculationMode: CalculationMode;
  ruleVersion: string | null;
  effectiveFrom: string;
}

export interface ManualGoalInput extends NutritionTargets {
  effectiveFrom?: string;
}
