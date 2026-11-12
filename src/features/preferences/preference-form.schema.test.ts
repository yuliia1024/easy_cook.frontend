import {
  EMPTY_PREFERENCE_FORM,
  preferenceFormSchema,
  toPreferenceInput,
} from './preference-form.schema';

const parse = (patch: object) =>
  preferenceFormSchema.safeParse({ ...EMPTY_PREFERENCE_FORM, ...patch });

describe('preferenceFormSchema', () => {
  it('sends the chosen diet tag for a diet', () => {
    const result = parse({ preferenceType: 'diet', diet: 'vegan', value: '' });
    expect(result.success && toPreferenceInput(result.data)).toEqual({
      preferenceType: 'diet',
      value: 'vegan',
    });
  });

  it('sends the trimmed text for other types', () => {
    const result = parse({ preferenceType: 'allergy', value: '  peanut ' });
    expect(result.success && toPreferenceInput(result.data)).toEqual({
      preferenceType: 'allergy',
      value: 'peanut',
    });
  });

  it('requires a value and caps its length', () => {
    expect(parse({ value: ' ' }).error?.issues[0].message).toBe('Enter a value');
    expect(parse({ value: 'x'.repeat(121) }).error?.issues[0].message).toBe(
      'At most 120 characters',
    );
  });

  it('ignores the hidden text of a diet', () => {
    const result = parse({ preferenceType: 'diet', diet: 'vegan', value: 'x'.repeat(121) });
    expect(result.success && toPreferenceInput(result.data)).toEqual({
      preferenceType: 'diet',
      value: 'vegan',
    });
  });
});
