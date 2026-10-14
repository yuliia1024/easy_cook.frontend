import { buildMenu, buildMenuMeal, buildMenuVersion } from '../../test/fixtures';
import {
  emptyMeal,
  menuFormSchema,
  toMenuFormValues,
  toMenuInput,
  toMenuVersionInput,
  type MenuFormValues,
} from './menu-form.schema';
import { dayFromToday } from '../../test/dates';

const recipe = { id: '22222222-2222-4222-8222-222222222222', name: 'Soup' };
const values = (patch: Partial<MenuFormValues> = {}): MenuFormValues => ({
  title: 'Week',
  notes: '',
  days: [
    { date: dayFromToday(7), meals: [{ ...emptyMeal(), recipe, servings: '1.5' }] },
    { date: '', meals: [{ ...emptyMeal(), mealType: 'dinner', recipe }] },
  ],
  ...patch,
});

describe('menuFormSchema', () => {
  it('numbers the days in order and sends recipe ids', () => {
    const result = menuFormSchema(true).safeParse(values());
    expect(result.success && toMenuInput(result.data)).toEqual({
      title: 'Week',
      notes: null,
      days: [
        {
          dayIndex: 0,
          date: dayFromToday(7),
          meals: [{ mealType: 'lunch', recipeId: recipe.id, servings: 1.5 }],
        },
        {
          dayIndex: 1,
          date: null,
          meals: [{ mealType: 'dinner', recipeId: recipe.id, servings: 1 }],
        },
      ],
    });
  });

  it('requires a title only for a new menu', () => {
    expect(menuFormSchema(true).safeParse(values({ title: ' ' })).error?.issues[0].message).toBe(
      'Enter a title',
    );
    const version = menuFormSchema(false).safeParse(values({ title: '' }));
    expect(version.success && toMenuVersionInput(version.data)).not.toHaveProperty('title');
  });

  it.each([
    [{ ...emptyMeal() }, 'Choose a recipe'],
    [{ ...emptyMeal(), deletedName: 'Old stew' }, 'The recipe was deleted; choose another'],
    [{ ...emptyMeal(), recipe, servings: '0.1' }, 'At least 0.25'],
    [{ ...emptyMeal(), recipe, servings: '11' }, 'At most 10'],
  ])('rejects the meal %j', (meal, message) => {
    const result = menuFormSchema(true).safeParse(values({ days: [{ date: '', meals: [meal] }] }));
    expect(result.error?.issues[0].message).toBe(message);
  });

  it('needs days and meals', () => {
    expect(menuFormSchema(true).safeParse(values({ days: [] })).error?.issues[0].message).toBe(
      'Add at least one day',
    );
    expect(
      menuFormSchema(true).safeParse(values({ days: [{ date: '', meals: [] }] })).error?.issues[0]
        .message,
    ).toBe('Add at least one meal');
  });
  it('accepts dates from today up to a year ahead', () => {
    const dated = (date: string) =>
      menuFormSchema(true).safeParse(
        values({ days: [{ date, meals: [{ ...emptyMeal(), recipe }] }] }),
      );

    expect(dated(dayFromToday(0)).success).toBe(true);
    expect(dated(dayFromToday(365)).success).toBe(true);
    expect(dated(dayFromToday(-1)).error?.issues).toEqual([
      expect.objectContaining({ path: ['days', 0, 'date'], message: 'Cannot be in the past' }),
    ]);
    expect(dated(dayFromToday(366)).error?.issues[0].message).toBe('At most 365 days ahead');
  });
});

describe('toMenuFormValues', () => {
  it('starts a new menu with one empty day', () => {
    expect(toMenuFormValues().days).toEqual([{ date: '', meals: [emptyMeal()] }]);
  });

  it('copies the latest version and flags deleted recipes', () => {
    const deleted = buildMenuMeal({ id: 'm2', position: 1, recipeId: null, servings: 2 });
    const menu = buildMenu({
      versions: [
        buildMenuVersion({
          days: [{ ...buildMenuVersion().days[0], meals: [deleted, buildMenuMeal()] }],
        }),
      ],
    });

    expect(toMenuFormValues(menu)).toEqual({
      title: 'Menu for 1 day',
      notes: '',
      days: [
        {
          date: '2026-10-20',
          meals: [
            {
              mealType: 'lunch',
              recipe: {
                id: '22222222-2222-4222-8222-222222222222',
                name: 'Buckwheat with chicken',
              },
              deletedName: null,
              servings: '1',
            },
            {
              mealType: 'lunch',
              recipe: null,
              deletedName: 'Buckwheat with chicken',
              servings: '2',
            },
          ],
        },
      ],
    });
  });
});
