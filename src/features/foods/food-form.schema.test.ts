import { buildFood } from '../../test/fixtures';
import {
  createFoodFormSchema,
  foodFormSchema,
  toFoodFormValues,
  toFoodInput,
} from './food-form.schema';

const valid = {
  name: 'Rice',
  nameEn: '',
  state: 'dried',
  kcalPer100g: '360',
  proteinG: '7',
  fatG: '0,6',
  carbsG: '80',
};

describe('foodFormSchema', () => {
  it('parses numbers and keeps empty values as unknown (null)', () => {
    const result = foodFormSchema.parse({ ...valid, fatG: '' });
    expect(result).toMatchObject({ kcalPer100g: 360, proteinG: 7, fatG: null, carbsG: 80 });
  });

  it('accepts a comma decimal separator', () => {
    expect(foodFormSchema.parse(valid).fatG).toBe(0.6);
  });

  it('rejects out of range and malformed values', () => {
    expect(foodFormSchema.safeParse({ ...valid, kcalPer100g: '901' }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...valid, proteinG: '-1' }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...valid, proteinG: 'abc' }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...valid, proteinG: '1.234' }).success).toBe(false);
  });

  it('rejects macros above 100 g per 100 g', () => {
    const result = foodFormSchema.safeParse({ ...valid, proteinG: '30', carbsG: '80' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['carbsG']);
  });

  it('checks the calories against protein, fat and carbs (4/9/4)', () => {
    // 7 / 0.6 / 80 g give ≈ 353 kcal.
    expect(foodFormSchema.safeParse({ ...valid, kcalPer100g: '420' }).success).toBe(true);
    const result = foodFormSchema.safeParse({ ...valid, kcalPer100g: '130' });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['kcalPer100g'],
        message: '130 kcal does not match protein, fat and carbs (≈ 353 kcal by 4/9/4)',
      }),
    ]);
  });

  it('skips the calorie check while a value is unknown', () => {
    expect(foodFormSchema.safeParse({ ...valid, kcalPer100g: '130', fatG: '' }).success).toBe(true);
  });

  it('when editing, checks the calories only after a nutrient changes', () => {
    const odd = buildFood({ kcalPer100g: 130, proteinG: 7, fatG: 0.6, carbsG: 80 });
    const schema = createFoodFormSchema(odd);
    const values = toFoodFormValues(odd);
    expect(schema.safeParse({ ...values, name: 'Renamed' }).success).toBe(true);
    expect(schema.safeParse({ ...values, proteinG: '8' }).success).toBe(false);
  });

  it('requires a name', () => {
    expect(foodFormSchema.safeParse({ ...valid, name: '  ' }).success).toBe(false);
  });
});

describe('form mapping', () => {
  it('round-trips a food, nulls as empty strings', () => {
    const values = toFoodFormValues(buildFood({ fatG: null, nameEn: null }));
    expect(values.fatG).toBe('');
    expect(toFoodInput(foodFormSchema.parse(values))).toMatchObject({ fatG: null, nameEn: null });
  });

  it('never sends the source (the API sets it)', () => {
    const food = buildFood({ source: 'usda_fdc' });
    expect(
      toFoodInput(createFoodFormSchema(food).parse(toFoodFormValues(food))),
    ).not.toHaveProperty('source');
  });
});
