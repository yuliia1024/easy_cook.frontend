import { buildPreference } from '../../test/fixtures';
import { isInEffect, preferenceChangeText, sameChange } from './preference-change';

describe('preferenceChangeText', () => {
  it('reads the action, the type and the value', () => {
    expect(
      preferenceChangeText({ action: 'add', preferenceType: 'allergy', value: 'peanut' }),
    ).toBe('Add allergy: peanut');
    expect(
      preferenceChangeText({ action: 'remove', preferenceType: 'disliked_food', value: 'olives' }),
    ).toBe('Remove disliked food: olives');
  });

  it('names a diet by its label', () => {
    expect(
      preferenceChangeText({ action: 'add', preferenceType: 'diet', value: 'gluten_free' }),
    ).toBe('Add diet: gluten-free');
  });
});

describe('isInEffect', () => {
  const saved = [buildPreference({ preferenceType: 'allergy', value: 'peanut' })];

  it('takes an added preference as in effect once it is saved, whatever the case', () => {
    expect(isInEffect({ action: 'add', preferenceType: 'allergy', value: ' Peanut ' }, saved)).toBe(
      true,
    );
    expect(isInEffect({ action: 'add', preferenceType: 'allergy', value: 'soy' }, saved)).toBe(
      false,
    );
    // The same value of another type is another preference.
    expect(
      isInEffect({ action: 'add', preferenceType: 'disliked_food', value: 'peanut' }, saved),
    ).toBe(false);
  });

  it('takes a removed preference as in effect once it is gone', () => {
    expect(
      isInEffect({ action: 'remove', preferenceType: 'allergy', value: 'peanut' }, saved),
    ).toBe(false);
    expect(isInEffect({ action: 'remove', preferenceType: 'allergy', value: 'peanut' }, [])).toBe(
      true,
    );
  });
});

describe('sameChange', () => {
  it('compares values as they are saved', () => {
    const change = { action: 'add', preferenceType: 'allergy', value: 'peanut' } as const;
    expect(sameChange(change, { ...change, value: ' Peanut' })).toBe(true);
    expect(sameChange(change, { ...change, action: 'remove' })).toBe(false);
  });
});
