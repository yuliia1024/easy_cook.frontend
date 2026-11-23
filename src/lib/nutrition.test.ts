import { bmi, isMacroShareAllowed, kcalFromMacros, macroShares } from './nutrition';

describe('bmi', () => {
  it('is kg per m²', () => {
    expect(bmi(200, 74)).toBe(18.5);
  });
});

describe('kcalFromMacros', () => {
  it('uses 4/9/4 kcal per gram', () => {
    expect(kcalFromMacros({ proteinG: 100, fatG: 50, carbsG: 200 })).toBe(1650);
  });
});

describe('macroShares', () => {
  it('splits the macro energy', () => {
    expect(macroShares({ proteinG: 90, fatG: 40, carbsG: 270 })).toEqual({
      proteinG: 0.2,
      fatG: 0.2,
      carbsG: 0.6,
    });
  });

  it('is null without energy', () => {
    expect(macroShares({ proteinG: 0, fatG: 0, carbsG: 0 })).toBeNull();
  });
});

describe('isMacroShareAllowed', () => {
  it.each([
    ['proteinG', 0.09, true],
    ['proteinG', 0.089, false],
    ['proteinG', 0.36, true],
    ['proteinG', 0.361, false],
    ['fatG', 0.19, true],
    ['fatG', 0.18, false],
    ['carbsG', 0.66, true],
    ['carbsG', 0.67, false],
  ] as const)('%s at %s: %s', (macro, share, allowed) => {
    expect(isMacroShareAllowed(macro, share)).toBe(allowed);
  });
});
