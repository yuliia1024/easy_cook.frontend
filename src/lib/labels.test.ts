import {
  ALLERGEN_LABELS,
  MENU_GENERATED_BY_LABELS,
  MEAL_TYPE_LABELS,
  PREFERENCE_TYPE_LABELS,
  toOptions,
} from './labels';

describe('toOptions', () => {
  it('maps labels to select options in order', () => {
    expect(toOptions(MEAL_TYPE_LABELS)[0]).toEqual({ value: 'breakfast', label: 'Breakfast' });
    expect(toOptions(MEAL_TYPE_LABELS)).toHaveLength(4);
  });
});

describe('menu and preference labels', () => {
  it('names the stub planner and every preference type', () => {
    expect(MENU_GENERATED_BY_LABELS.stub).toBe('stub planner');
    expect(toOptions(PREFERENCE_TYPE_LABELS).map((o) => o.value)).toEqual([
      'diet',
      'allergy',
      'excluded_ingredient',
      'disliked_food',
    ]);
  });
});

describe('allergen labels', () => {
  it('names every backend allergen in English', () => {
    expect(Object.keys(ALLERGEN_LABELS)).toEqual([
      'gluten',
      'milk',
      'egg',
      'fish',
      'shellfish',
      'peanut',
      'tree_nut',
      'soy',
      'sesame',
    ]);
    expect(ALLERGEN_LABELS.tree_nut).toBe('tree nuts');
  });
});
