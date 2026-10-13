import { buildFood } from '../test/fixtures';
import {
  bmi,
  estimateNutrition,
  foodKcalMismatch,
  isMacroShareAllowed,
  kcalFromMacros,
  macroShares,
  servingLoad,
} from './nutrition';

const rice = buildFood({ kcalPer100g: 360, proteinG: 7, fatG: 0.6, carbsG: 80 });

describe('estimateNutrition', () => {
  it('scales per 100 g values and divides by servings', () => {
    const result = estimateNutrition([{ food: rice, quantityG: 150, isOptional: false }], 3);
    expect(result.total).toEqual({ kcal: 540, proteinG: 10.5, fatG: 0.9, carbsG: 120 });
    expect(result.perServing).toEqual({ kcal: 180, proteinG: 3.5, fatG: 0.3, carbsG: 40 });
    expect(result.missing).toEqual([]);
  });

  it('leaves optional ingredients out unless asked', () => {
    const lines = [
      { food: rice, quantityG: 100, isOptional: false },
      { food: rice, quantityG: 100, isOptional: true },
    ];
    expect(estimateNutrition(lines, 1).total.kcal).toBe(360);
    expect(estimateNutrition(lines, 1, true).total.kcal).toBe(720);
  });

  it('counts an unknown value as 0 and reports it', () => {
    const unknownFat = buildFood({ kcalPer100g: 100, proteinG: 1, fatG: null, carbsG: 20 });
    const result = estimateNutrition([{ food: unknownFat, quantityG: 200, isOptional: false }], 1);
    expect(result.total.fatG).toBe(0);
    expect(result.missing).toEqual(['fatG']);
  });

  it('ignores lines without a valid quantity and invalid servings', () => {
    const result = estimateNutrition([{ food: rice, quantityG: Number.NaN, isOptional: false }], 0);
    expect(result.total.kcal).toBe(0);
    expect(result.perServing.kcal).toBe(0);
  });
});

describe('bmi', () => {
  it('is kg per m²', () => {
    expect(bmi(200, 74)).toBe(18.5);
  });
});

describe('kcalFromMacros', () => {
  it('uses 4/9/4 kcal per gram', () => {
    expect(kcalFromMacros({ proteinG: 100, fatG: 50, carbsG: 200 })).toBe(1650);
  });
});

describe('macroShares', () => {
  it('splits the macro energy', () => {
    expect(macroShares({ proteinG: 90, fatG: 40, carbsG: 270 })).toEqual({
      proteinG: 0.2,
      fatG: 0.2,
      carbsG: 0.6,
    });
  });

  it('is null without energy', () => {
    expect(macroShares({ proteinG: 0, fatG: 0, carbsG: 0 })).toBeNull();
  });
});

describe('isMacroShareAllowed', () => {
  it.each([
    ['proteinG', 0.09, true],
    ['proteinG', 0.089, false],
    ['proteinG', 0.36, true],
    ['proteinG', 0.361, false],
    ['fatG', 0.19, true],
    ['fatG', 0.18, false],
    ['carbsG', 0.66, true],
    ['carbsG', 0.67, false],
  ] as const)('%s at %s: %s', (macro, share, allowed) => {
    expect(isMacroShareAllowed(macro, share)).toBe(allowed);
  });
});

describe('foodKcalMismatch', () => {
  it('allows 25 % of the estimate', () => {
    // ≈ 250 kcal by 4/9/4: 62.5 kcal of slack.
    const grams = { proteinG: 20, fatG: 10, carbsG: 20 };
    expect(foodKcalMismatch(312, grams)).toBeNull();
    expect(foodKcalMismatch(130, grams)).toBe(250);
  });

  it('allows at least 20 kcal for lean foods', () => {
    const grams = { proteinG: 5, fatG: 0, carbsG: 5 };
    expect(foodKcalMismatch(60, grams)).toBeNull();
    expect(foodKcalMismatch(61, grams)).toBe(40);
  });
});

describe('servingLoad', () => {
  it('counts every ingredient, optional ones too, per serving', () => {
    const lines = [
      { food: rice, quantityG: 300, isOptional: false },
      { food: buildFood({ kcalPer100g: null }), quantityG: 100, isOptional: true },
      { food: rice, quantityG: Number.NaN, isOptional: false },
    ];
    expect(servingLoad(lines, 2)).toEqual({ weightG: 200, kcal: 540 });
    expect(servingLoad(lines, 0)).toEqual({ weightG: 400, kcal: 1080 });
  });
});
