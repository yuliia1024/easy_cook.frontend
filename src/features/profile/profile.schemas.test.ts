import { buildGoal, buildProfile } from '../../test/fixtures';
import {
  kcalFromMacros,
  manualGoalSchema,
  profileFormSchema,
  toManualGoalFormValues,
  toManualGoalInput,
  toProfileFormValues,
} from './profile.schemas';

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

  it('starts empty without a profile', () => {
    expect(toProfileFormValues(null).age).toBe('');
  });
});

describe('manualGoalSchema', () => {
  it('round-trips a goal and sends no date by default', () => {
    const values = toManualGoalFormValues(buildGoal());
    expect(toManualGoalInput(manualGoalSchema.parse(values))).toEqual({
      caloriesKcal: 2100,
      proteinG: 105,
      fatG: 58,
      carbsG: 289,
    });
  });

  it('turns a picked day into an ISO timestamp', () => {
    const values = { ...toManualGoalFormValues(buildGoal()), effectiveFrom: '2026-11-01' };
    const input = toManualGoalInput(manualGoalSchema.parse(values));
    expect(new Date(input.effectiveFrom!).getDate()).toBe(1);
  });

  it('rejects calories out of range', () => {
    const values = { ...toManualGoalFormValues(buildGoal()), caloriesKcal: '500' };
    expect(manualGoalSchema.safeParse(values).success).toBe(false);
  });
});

describe('kcalFromMacros', () => {
  it('uses 4/9/4 kcal per gram', () => {
    expect(kcalFromMacros(100, 50, 200)).toBe(1650);
  });
});
