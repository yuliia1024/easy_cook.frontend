import type {
  ActivityLevel,
  CalculationMode,
  DietTag,
  FoodSource,
  FoodState,
  Goal,
  Macro,
  MealType,
  Sex,
} from '../api/types';

export const FOOD_STATE_LABELS: Record<FoodState, string> = {
  raw: 'сирий',
  cooked: 'приготований',
  boiled: 'варений',
  steamed: 'на пару',
  fried: 'смажений',
  baked: 'запечений',
  roasted: 'обсмажений',
  dried: 'сухий',
  canned: 'консервований',
  frozen: 'заморожений',
  other: 'інше',
};

export const FOOD_SOURCE_LABELS: Record<FoodSource, string> = {
  usda_fdc: 'USDA FDC',
  seed: 'базовий набір',
  manual: 'вручну',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
};

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  vegetarian: 'вегетаріанське',
  vegan: 'веганське',
  pescatarian: 'пескетаріанське',
  gluten_free: 'без глютену',
  dairy_free: 'без молочного',
  high_protein: 'багато білка',
  low_carb: 'мало вуглеводів',
};

export const SEX_LABELS: Record<Sex, string> = { male: 'чоловіча', female: 'жіноча' };

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Мінімальна (сидяча робота)',
  light: 'Легка (1–3 тренування на тиждень)',
  moderate: 'Помірна (3–5 тренувань)',
  active: 'Висока (6–7 тренувань)',
  very_active: 'Дуже висока (щоденні важкі тренування, фізична праця)',
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: 'Схуднення',
  maintain: 'Підтримка ваги',
  gain_muscle: "Набір м'язової маси",
};

export const CALCULATION_MODE_LABELS: Record<CalculationMode, string> = {
  manual: 'вручну',
  rule_based: 'за формулою',
};

export const MACRO_LABELS: Record<Macro, string> = {
  kcal: 'Калорії',
  proteinG: 'Білки',
  fatG: 'Жири',
  carbsG: 'Вуглеводи',
};

export const MACRO_UNITS: Record<Macro, string> = {
  kcal: 'ккал',
  proteinG: 'г',
  fatG: 'г',
  carbsG: 'г',
};

export const MACROS: Macro[] = ['kcal', 'proteinG', 'fatG', 'carbsG'];

/** `{ value, label }` pairs for a select, in the declaration order of the labels. */
export function toOptions<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
