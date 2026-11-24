import { KCAL_PER_GRAM, MACRO_SHARE_LIMITS, MACRO_SHARE_TOLERANCE } from './limits';

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
