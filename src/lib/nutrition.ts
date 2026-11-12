import type { FoodItem, Macro, Macros } from '../api/types';
import {
  FOOD_KCAL_TOLERANCE,
  KCAL_PER_GRAM,
  MACRO_SHARE_LIMITS,
  MACRO_SHARE_TOLERANCE,
} from './limits';

export interface NutritionLine {
  food: Pick<FoodItem, 'kcalPer100g' | 'proteinG' | 'fatG' | 'carbsG'>;
  quantityG: number;
  isOptional: boolean;
}

export interface NutritionEstimate {
  total: Macros;
  perServing: Macros;
  /** Macros with an unknown value in a counted ingredient. */
  missing: Macro[];
}

const PER_100G: Record<Macro, keyof NutritionLine['food']> = {
  kcal: 'kcalPer100g',
  proteinG: 'proteinG',
  fatG: 'fatG',
  carbsG: 'carbsG',
};

/** `round()` of the backend (`common/utils/decimal.ts`): EPSILON keeps 2.45 from landing on 2.4. */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const round1 = (value: number): number => round(value);

/**
 * Live preview in the recipe form, the same maths as the backend `NutritionService`:
 * `quantity / 100 × per100g`, summed; unknown values count as 0 and are reported in `missing`.
 * The saved recipe shows the server result.
 */
export function estimateNutrition(
  lines: NutritionLine[],
  servings: number,
  includeOptional = false,
): NutritionEstimate {
  const total: Macros = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  const missing = new Set<Macro>();

  for (const line of lines) {
    if (line.isOptional && !includeOptional) continue;
    if (!Number.isFinite(line.quantityG) || line.quantityG <= 0) continue;
    for (const macro of Object.keys(PER_100G) as Macro[]) {
      const per100g = line.food[PER_100G[macro]];
      if (per100g === null) missing.add(macro);
      else total[macro] += (line.quantityG / 100) * per100g;
    }
  }

  const divisor = Number.isFinite(servings) && servings >= 1 ? servings : 1;
  const map = (fn: (value: number) => number): Macros => ({
    kcal: fn(total.kcal),
    proteinG: fn(total.proteinG),
    fatG: fn(total.fatG),
    carbsG: fn(total.carbsG),
  });

  return {
    total: map(round1),
    perServing: map((value) => round1(value / divisor)),
    missing: [...missing],
  };
}

export type MacroGrams = Record<keyof typeof KCAL_PER_GRAM, number>;

/** Body mass index: kg / m². */
export function bmi(heightCm: number, weightKg: number): number {
  return weightKg / (heightCm / 100) ** 2;
}

/** Energy of the macros by 4/9/4 kcal per gram, unrounded. */
export function kcalFromMacros({ proteinG, fatG, carbsG }: MacroGrams): number {
  return (
    proteinG * KCAL_PER_GRAM.proteinG + fatG * KCAL_PER_GRAM.fatG + carbsG * KCAL_PER_GRAM.carbsG
  );
}

/** Share of each macro in the macro energy (0–1); null when the macros give no energy. */
export function macroShares(grams: MacroGrams): MacroGrams | null {
  const total = kcalFromMacros(grams);
  if (!(total > 0)) return null;
  return {
    proteinG: (grams.proteinG * KCAL_PER_GRAM.proteinG) / total,
    fatG: (grams.fatG * KCAL_PER_GRAM.fatG) / total,
    carbsG: (grams.carbsG * KCAL_PER_GRAM.carbsG) / total,
  };
}

/** Whether a share fits `MACRO_SHARE_LIMITS`, with the rounding tolerance (and float slack). */
export function isMacroShareAllowed(macro: keyof MacroGrams, share: number): boolean {
  const { min, max } = MACRO_SHARE_LIMITS[macro];
  const slack = MACRO_SHARE_TOLERANCE + 1e-9;
  return share >= min - slack && share <= max + slack;
}

/** The 4/9/4 estimate when the stated kcal of a food is too far from it, else null. */
export function foodKcalMismatch(kcal: number, grams: MacroGrams): number | null {
  const estimate = kcalFromMacros(grams);
  const tolerance = Math.max(FOOD_KCAL_TOLERANCE.absolute, FOOD_KCAL_TOLERANCE.relative * estimate);
  return Math.abs(kcal - estimate) > tolerance ? estimate : null;
}

/**
 * Weight and calories of one serving with every ingredient, optional ones included: what the
 * backend limits (`MAX_SERVING_WEIGHT_G`, `MAX_SERVING_KCAL`). Unknown kcal counts as 0.
 */
export function servingLoad(
  lines: NutritionLine[],
  servings: number,
): { weightG: number; kcal: number } {
  let weightG = 0;
  let kcal = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.quantityG) || line.quantityG <= 0) continue;
    weightG += line.quantityG;
    kcal += (line.quantityG / 100) * (line.food.kcalPer100g ?? 0);
  }
  const divisor = Number.isFinite(servings) && servings >= 1 ? servings : 1;
  return { weightG: weightG / divisor, kcal: kcal / divisor };
}
