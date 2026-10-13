import { buildFood } from '../../test/fixtures';
import { foodFormSchema, toFoodFormValues, toFoodInput } from './food-form.schema';

const valid = {
  name: 'Рис',
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
});
