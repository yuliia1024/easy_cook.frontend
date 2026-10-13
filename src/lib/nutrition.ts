import type { FoodItem, Macro, Macros } from '../api/types';

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

const round1 = (value: number): number => Math.round(value * 10) / 10;

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
