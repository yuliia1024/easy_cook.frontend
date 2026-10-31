import { render, screen, within } from '@testing-library/react';
import { MenuSkeleton } from './MenuSkeleton';

describe('MenuSkeleton', () => {
  it('shows a placeholder card per meal of the planned menu', () => {
    render(
      <MenuSkeleton menu={{ days: 1, mealTypes: ['breakfast', 'lunch', 'snack', 'dinner'] }} />,
    );

    const skeleton = screen.getByRole('group', { name: 'Menu being planned' });
    expect(
      within(skeleton)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
    expect(within(skeleton).queryByRole('list', { name: 'Days' })).not.toBeInTheDocument();
  });

  it('shows the days of a menu of several days', () => {
    render(<MenuSkeleton menu={{ days: 3, mealTypes: ['dinner'] }} />);

    const days = screen.getByRole('list', { name: 'Days' });
    expect(
      within(days)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Day 1', 'Day 2', 'Day 3']);
  });
});
