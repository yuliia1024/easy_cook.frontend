import { render, screen, within } from '@testing-library/react';
import type { Allergen } from '../api/types';
import { AllergenList } from './AllergenList';

describe('AllergenList', () => {
  it('lists the allergens by their labels under a visible name', () => {
    render(<AllergenList allergens={['gluten', 'tree_nut']} label="Contains" />);

    const list = screen.getByRole('list', { name: 'Contains' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['gluten', 'tree nuts']);
  });

  it('shows a value it has no label for as sent', () => {
    render(<AllergenList allergens={['lupin' as Allergen]} />);
    expect(
      within(screen.getByRole('list', { name: 'Allergens' })).getByText('lupin'),
    ).toBeInTheDocument();
  });

  it('renders nothing without allergens', () => {
    const { container } = render(<AllergenList allergens={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
