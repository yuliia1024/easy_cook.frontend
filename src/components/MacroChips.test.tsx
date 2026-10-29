import { render, screen } from '@testing-library/react';
import { MacroChips } from './MacroChips';

const values = { kcal: 339.4, proteinG: 9.8, fatG: 12.13, carbsG: 50 };

describe('MacroChips', () => {
  it('shows protein, fat and carbs with their names as titles', () => {
    render(<MacroChips values={values} />);

    expect(screen.getByTitle('Protein')).toHaveTextContent('P 9.8');
    expect(screen.getByTitle('Fat')).toHaveTextContent('F 12.1');
    expect(screen.getByTitle('Carbs')).toHaveTextContent('C 50');
    expect(screen.queryByText(/339/)).not.toBeInTheDocument();
  });

  it('adds grams on request', () => {
    render(<MacroChips values={values} unit />);

    expect(screen.getByTitle('Protein')).toHaveTextContent('P 9.8 g');
  });
});
