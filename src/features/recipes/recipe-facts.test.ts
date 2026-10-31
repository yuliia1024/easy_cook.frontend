import { buildRecipe } from '../../test/fixtures';
import { recipeFacts } from './recipe-facts';

describe('recipeFacts', () => {
  it('joins the meal type, servings, prep time and diet tags', () => {
    expect(recipeFacts(buildRecipe())).toBe('Lunch · 2 serv. · 30 min · high protein');
  });

  it('leaves out an unknown prep time and missing tags', () => {
    expect(recipeFacts(buildRecipe({ prepTimeMinutes: null, dietType: [] }))).toBe(
      'Lunch · 2 serv.',
    );
  });
});
