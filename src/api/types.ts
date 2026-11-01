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

export type PreferenceType = 'diet' | 'allergy' | 'disliked_food' | 'excluded_ingredient';

export interface DietaryPreference {
  id: string;
  preferenceType: PreferenceType;
  /** A `DietTag` for `diet`, lower-cased free text otherwise. */
  value: string;
}

export interface DietaryPreferenceInput {
  preferenceType: PreferenceType;
  value: string;
}

export type MenuGeneratedBy = 'manual' | 'stub' | 'llm';
export type MenuIssueSeverity = 'error' | 'warning';
export type MenuIssueCode =
  | 'diet_violation'
  | 'allergen'
  | 'excluded_ingredient'
  | 'disliked_food'
  | 'calories_off_target'
  | 'nutrition_incomplete';

/** Which menus `GET /menus` lists; a menu is a draft until one of its versions is confirmed. */
export type MenuStatus = 'confirmed' | 'draft' | 'all';

export interface MenuSummary {
  id: string;
  title: string;
  versionCount: number;
  confirmedVersionId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The goal a menu version was built for. */
export interface NutritionGoalSnapshot extends NutritionTargets {
  goalId: string;
  calculationMode: CalculationMode;
  ruleVersion: string | null;
}

export interface MenuIssue {
  severity: MenuIssueSeverity;
  code: MenuIssueCode;
  message: string;
  dayIndex?: number;
  position?: number;
  recipeId?: string | null;
}

/** The recipe as it was when the version was built. */
export interface RecipeSnapshot {
  id: string;
  name: string;
  mealType: string;
  dietType: string[];
  servings: number;
  prepTimeMinutes: number | null;
  perServing: Macros;
  complete: boolean;
  ingredients: {
    foodItemId: string;
    foodName: string;
    foodNameEn: string | null;
    state: string;
    quantityG: number;
    isOptional: boolean;
  }[];
}

export interface MenuMeal {
  id: string;
  mealType: MealType;
  position: number;
  /** Null once the recipe was deleted; `recipe` still describes it. */
  recipeId: string | null;
  servings: number;
  nutrition: Macros;
  complete: boolean;
  recipe: RecipeSnapshot;
}

export interface MenuDay {
  id: string;
  dayIndex: number;
  /** `YYYY-MM-DD`. */
  date: string | null;
  totals: Macros;
  complete: boolean;
  meals: MenuMeal[];
}

export interface MenuVersion {
  id: string;
  versionNumber: number;
  generatedBy: MenuGeneratedBy;
  notes: string | null;
  createdAt: string;
  isConfirmed: boolean;
  nutritionGoal: NutritionGoalSnapshot | null;
  dailyAverage: Macros;
  issues: MenuIssue[];
  days: MenuDay[];
}

export interface Menu {
  id: string;
  title: string;
  confirmedVersionId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Newest first. */
  versions: MenuVersion[];
}

export type MessageRole = 'user' | 'assistant';

export interface SuggestedMeal {
  position: number;
  mealType: MealType;
  recipeId: string | null;
  recipeName: string;
  servings: number;
  /** Per serving times `servings`. */
  nutrition: Macros;
  complete: boolean;
}

export interface SuggestedDay {
  dayIndex: number;
  /** `YYYY-MM-DD`. */
  date: string | null;
  meals: SuggestedMeal[];
  totals: Macros;
  complete: boolean;
}

/** A menu the assistant suggested in a reply: the `data-menu` part, or the version it was saved as. */
export interface SuggestedMenu {
  days: SuggestedDay[];
  dailyAverage: Macros;
  issues: MenuIssue[];
}

/** The `data-menu` part of a streamed reply: the menu and the draft version it was saved as. */
export interface StreamedMenu {
  menuId: string;
  versionId: string;
  composition: SuggestedMenu;
}

/** The step of a reply the backend is on, from a `data-status` part. */
export type ReplyStep =
  'thinking' | 'searching_breakfasts' | 'picking_lunches' | 'checking_constraints';

/** The transient `data-status` part of a streamed reply. */
export interface StreamedStatus {
  step: ReplyStep;
  message: string;
}

/** The transient `data-error` part of a failed reply; an `error` chunk with `message` follows it. */
export interface StreamedError {
  code: string;
  message: string;
  retryable: boolean;
}

/** The `code` of a `data-error` part when the conversation takes no more messages. */
export const CONVERSATION_LIMIT_REACHED = 'conversation_limit_reached';

/** The transient `data-menu-pending` part: the shape of the menu being planned. */
export interface PendingMenu {
  days: number;
  mealTypes: MealType[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  /** The menu version the assistant suggested with this reply, and its menu. */
  menuVersionId: string | null;
  menuId: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  menuId: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  menuId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Oldest first. */
  messages: Message[];
}

export interface ConversationInput {
  title?: string;
  menuId?: string | null;
  /** Carries the menu details and, unless `menuId` is given, the menu of that conversation. */
  fromConversationId?: string | null;
}
