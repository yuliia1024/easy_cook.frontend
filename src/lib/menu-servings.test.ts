import { menuRecipePath, parseMenuServings, scaleMacros } from './menu-servings';

describe('menuRecipePath', () => {
  it('passes the servings of the meal', () => {
    expect(menuRecipePath('r1', 1.25)).toBe('/recipes/r1?servings=1.25');
  });
});

describe('parseMenuServings', () => {
  it('reads the servings a menu meal can have', () => {
    expect(parseMenuServings('1.25')).toBe(1.25);
    expect(parseMenuServings('0.5')).toBe(0.5);
    expect(parseMenuServings('2')).toBe(2);
  });

  it('ignores a missing or wrong value', () => {
    expect(parseMenuServings(null)).toBeNull();
    expect(parseMenuServings('')).toBeNull();
    expect(parseMenuServings('abc')).toBeNull();
    expect(parseMenuServings('0.25')).toBeNull();
    expect(parseMenuServings('3')).toBeNull();
  });
});

describe('scaleMacros', () => {
  it('multiplies every value', () => {
    expect(scaleMacros({ kcal: 400, proteinG: 20, fatG: 10, carbsG: 50 }, 1.25)).toEqual({
      kcal: 500,
      proteinG: 25,
      fatG: 12.5,
      carbsG: 62.5,
    });
  });
});
