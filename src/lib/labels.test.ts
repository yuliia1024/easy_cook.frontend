import {
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
