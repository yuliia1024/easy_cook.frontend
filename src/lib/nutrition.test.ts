import { buildFood } from '../test/fixtures';
import { estimateNutrition } from './nutrition';

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
