import { screen, within } from '@testing-library/react';
import { buildSuggestedMenu } from '../../test/fixtures';
import { renderPage } from '../../test/render';
import { SuggestedMenuDays } from './SuggestedMenuDays';

const twoDays = () => {
  const menu = buildSuggestedMenu();
  const [first] = menu.days;
  return buildSuggestedMenu({
    days: [
      first!,
      {
        ...first!,
        dayIndex: 1,
        meals: [{ ...first!.meals[1]!, position: 0, recipeName: 'Lentil soup' }],
        totals: { kcal: 410, proteinG: 24, fatG: 6.5, carbsG: 60 },
      },
    ],
  });
};

describe('SuggestedMenuDays', () => {
  it('shows every meal with its calories and macros and the day total', () => {
    renderPage(<SuggestedMenuDays menu={buildSuggestedMenu()} />);

    const day = screen.getByRole('region', { name: 'Suggested menu, day 1' });
    const meals = within(day)
      .getAllByRole('listitem')
      .map((meal) => meal.textContent);
    expect(meals).toEqual([
      'BreakfastOatmeal302.8 kcalP 11.2 gF 5.9 gC 53.8 g',
      'LunchRice bowl520 kcalP 10.8 gF 1.2 gC 112 g',
    ]);
    expect(day).toHaveTextContent('Day 1 total822.8 kcalProtein 22 gFat 7.1 gCarbs 165.8 g');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('links a recipe that still exists', () => {
    renderPage(<SuggestedMenuDays menu={buildSuggestedMenu()} />);

    expect(screen.getByRole('link', { name: 'Oatmeal' })).toHaveAttribute(
      'href',
      '/recipes/22222222-2222-4222-8222-222222222222',
    );
    expect(screen.queryByRole('link', { name: 'Rice bowl' })).not.toBeInTheDocument();
  });

  it('switches days with the tabs and the arrow keys', async () => {
    const { user } = renderPage(<SuggestedMenuDays menu={twoDays()} />);

    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Day 2' }));

    const panel = screen.getByRole('tabpanel', { name: 'Suggested menu, day 2' });
    expect(within(panel).getByText('Lentil soup')).toBeInTheDocument();
    expect(panel).toHaveTextContent('Day 2 total410 kcal');
    expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Suggested menu, day 1' })).toBeInTheDocument();
  });
});
