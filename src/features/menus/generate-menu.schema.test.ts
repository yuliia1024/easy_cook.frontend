import {
  DEFAULT_GENERATE_VALUES,
  generateMenuSchema,
  toGenerateInput,
} from './generate-menu.schema';

const parse = (patch: object) =>
  generateMenuSchema.safeParse({ ...DEFAULT_GENERATE_VALUES, ...patch });

describe('generateMenuSchema', () => {
  it('builds the request with meals in day order and empty fields as null', () => {
    const result = parse({ mealTypes: ['dinner', 'breakfast'], days: '5' });
    expect(result.success && toGenerateInput(result.data)).toEqual({
      title: null,
      days: 5,
      mealTypes: ['breakfast', 'dinner'],
      startDate: null,
      instructions: null,
    });
  });

  it('keeps the optional fields when given', () => {
    const result = parse({ title: ' Week ', startDate: '2026-10-20', instructions: 'fish' });
    expect(result.success && toGenerateInput(result.data)).toMatchObject({
      title: 'Week',
      startDate: '2026-10-20',
      instructions: 'fish',
    });
  });

  it.each([
    [{ days: '0' }, 'At least 1 day'],
    [{ days: '15' }, 'At most 14 days'],
    [{ days: '2.5' }, 'Must be a whole number'],
    [{ mealTypes: [] }, 'Choose at least one meal'],
  ])('rejects %j', (patch, message) => {
    expect(parse(patch).error?.issues[0].message).toBe(message);
  });
});
