import { screen, within } from '@testing-library/react';
import { buildSuggestedMenu } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { SuggestedMenuTable } from './SuggestedMenuTable';

describe('SuggestedMenuTable', () => {
  it('lists every meal with its macros and the day total', () => {
    renderPage(<SuggestedMenuTable menu={buildSuggestedMenu()} />);

    const table = screen.getByRole('table', { name: 'Suggested menu, day 1' });
    const rows = within(table)
      .getAllByRole('row')
      .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Meal', 'Recipe', 'Calories, kcal', 'Protein, g', 'Fat, g', 'Carbs, g'],
      ['Breakfast', 'Oatmeal', '302.8', '11.2', '5.9', '53.8'],
      ['Lunch', 'Rice bowl', '520', '10.8', '1.2', '112'],
      ['Total', '822.8', '22', '7.1', '165.8'],
    ]);
  });

  it('links a recipe that still exists', () => {
    renderPage(<SuggestedMenuTable menu={buildSuggestedMenu()} />);

    expect(screen.getByRole('link', { name: 'Oatmeal' })).toHaveAttribute(
      'href',
      '/recipes/22222222-2222-4222-8222-222222222222',
    );
    expect(screen.queryByRole('link', { name: 'Rice bowl' })).not.toBeInTheDocument();
  });
});
