import { MEAL_TYPE_LABELS, toOptions } from './labels';

describe('toOptions', () => {
  it('maps labels to select options in order', () => {
    expect(toOptions(MEAL_TYPE_LABELS)[0]).toEqual({ value: 'breakfast', label: 'Сніданок' });
    expect(toOptions(MEAL_TYPE_LABELS)).toHaveLength(4);
  });
});
