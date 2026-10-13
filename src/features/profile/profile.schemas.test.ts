import { buildGoal, buildProfile } from '../../test/fixtures';
import {
  effectiveFromRange,
  manualGoalSchema,
  profileFormSchema,
  toDateInputValue,
  toManualGoalFormValues,
  toManualGoalInput,
  toProfileFormValues,
} from './profile.schemas';

/** `yyyy-mm-dd` of today shifted by `days`. */
const day = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const issues = (result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.error?.issues.map(({ path, message }) => ({ path: path.join('.'), message }));

describe('profileFormSchema', () => {
  const valid = toProfileFormValues(buildProfile());

  it('parses a filled in profile', () => {
    expect(profileFormSchema.parse(valid)).toEqual({
      age: 30,
      heightCm: 170,
      weightKg: 65.5,
      sex: 'female',
      activityLevel: 'moderate',
      goal: 'maintain',
    });
  });

  it('enforces the backend limits', () => {
    expect(profileFormSchema.safeParse({ ...valid, age: '13' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, age: '30.5' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, heightCm: '251' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, weightKg: '65.55' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, weightKg: '' }).success).toBe(false);
  });

  it.each([
    ['250', '30', '4.8'],
    ['100', '75', '75.0'],
  ])('rejects an implausible BMI (%s cm, %s kg)', (heightCm, weightKg, value) => {
    const result = profileFormSchema.safeParse({ ...valid, heightCm, weightKg });
    expect(issues(result)).toEqual([
      {
        path: 'weightKg',
        message: `Weight and height give an implausible BMI (${value}); check the values`,
      },
    ]);
  });

  it('does not allow losing weight when underweight', () => {
    const underweight = { ...valid, heightCm: '170', weightKg: '50', goal: 'lose_weight' };
    expect(issues(profileFormSchema.safeParse(underweight))).toEqual([
      { path: 'goal', message: 'Losing weight is not allowed with a BMI below 18.5' },
    ]);
    expect(profileFormSchema.safeParse({ ...underweight, goal: 'maintain' }).success).toBe(true);
    // 74 kg at 2 m is exactly 18.5.
    const boundary = { ...underweight, heightCm: '200', weightKg: '74' };
    expect(profileFormSchema.safeParse(boundary).success).toBe(true);
  });

  it('skips the BMI checks while a field is invalid', () => {
    const result = profileFormSchema.safeParse({ ...valid, heightCm: '50', weightKg: '300' });
    expect(issues(result)).toEqual([{ path: 'heightCm', message: 'At least 100 cm' }]);
  });

  it('starts empty without a profile', () => {
    expect(toProfileFormValues(null).age).toBe('');
  });
});

describe('manualGoalSchema', () => {
  const values = toManualGoalFormValues(buildGoal());

  it('round-trips a goal and sends no date by default', () => {
    expect(toManualGoalInput(manualGoalSchema('female').parse(values))).toEqual({
      caloriesKcal: 2100,
      proteinG: 105,
      fatG: 58,
      carbsG: 289,
    });
  });

  it('turns a picked day into an ISO timestamp', () => {
    const picked = day(10);
    const input = toManualGoalInput(
      manualGoalSchema('female').parse({ ...values, effectiveFrom: picked }),
    );
    expect(toDateInputValue(new Date(input.effectiveFrom!))).toBe(picked);
  });

  it('rejects calories out of range', () => {
    expect(manualGoalSchema('female').safeParse({ ...values, caloriesKcal: '6001' }).success).toBe(
      false,
    );
  });

  it.each([
    ['female', '1200', '1199', { proteinG: '60', fatG: '33', carbsG: '165' }],
    ['male', '1500', '1499', { proteinG: '75', fatG: '42', carbsG: '206' }],
  ] as const)('%s: allows %s kcal, rejects %s', (sex, allowed, rejected, macros) => {
    const goal = { ...values, ...macros };
    expect(manualGoalSchema(sex).safeParse({ ...goal, caloriesKcal: allowed }).success).toBe(true);
    const result = manualGoalSchema(sex).safeParse({ ...goal, caloriesKcal: rejected });
    expect(issues(result)).toEqual([{ path: 'caloriesKcal', message: `At least ${allowed} kcal` }]);
  });

  it('requires the macros to give the calories within 10 %', () => {
    // 105 / 58 / 289 g give 2098 kcal.
    expect(manualGoalSchema('female').safeParse({ ...values, caloriesKcal: '2000' }).success).toBe(
      true,
    );
    const result = manualGoalSchema('female').safeParse({ ...values, caloriesKcal: '1900' });
    expect(issues(result)).toEqual([
      {
        path: 'caloriesKcal',
        message:
          'Protein, fat and carbs give 2098 kcal, more than 10 % away from the 1900 kcal goal',
      },
    ]);
  });

  it('accepts macro shares on the 1 percentage point tolerance', () => {
    // 36 % protein, 20 % fat, 44 % carbs of 1800 kcal.
    const edge = { ...values, caloriesKcal: '1800', proteinG: '162', fatG: '40', carbsG: '198' };
    expect(manualGoalSchema('female').safeParse(edge).success).toBe(true);
  });

  it('rejects macro shares out of the healthy ranges, with the current share', () => {
    const highProtein = {
      ...values,
      caloriesKcal: '1800',
      proteinG: '166.5',
      fatG: '40',
      carbsG: '193.5',
    };
    expect(issues(manualGoalSchema('female').safeParse(highProtein))).toEqual([
      { path: 'proteinG', message: 'Protein must be 10–35 % of the calories (now 37 %)' },
      { path: 'carbsG', message: 'Carbs must be 45–65 % of the calories (now 43 %)' },
    ]);
    const lowFat = { ...values, caloriesKcal: '1800', proteinG: '90', fatG: '30', carbsG: '292.5' };
    expect(issues(manualGoalSchema('female').safeParse(lowFat))).toEqual([
      { path: 'fatG', message: 'Fat must be 20–35 % of the calories (now 15 %)' },
    ]);
  });

  it('accepts a start from today up to 365 days ahead', () => {
    const schema = manualGoalSchema('female');
    expect(schema.safeParse({ ...values, effectiveFrom: day(0) }).success).toBe(true);
    expect(schema.safeParse({ ...values, effectiveFrom: day(365) }).success).toBe(true);
    expect(issues(schema.safeParse({ ...values, effectiveFrom: day(-1) }))).toEqual([
      { path: 'effectiveFrom', message: 'Cannot be in the past' },
    ]);
    expect(issues(schema.safeParse({ ...values, effectiveFrom: day(366) }))).toEqual([
      { path: 'effectiveFrom', message: 'At most 365 days ahead' },
    ]);
    expect(issues(schema.safeParse({ ...values, effectiveFrom: '13.10.2026' }))).toEqual([
      { path: 'effectiveFrom', message: 'Enter a date' },
    ]);
  });
});

describe('effectiveFromRange', () => {
  it('spans today and the next 365 days in local dates', () => {
    expect(effectiveFromRange(new Date(2026, 0, 15, 23, 30))).toEqual({
      min: '2026-01-15',
      max: '2027-01-15',
    });
  });
});
