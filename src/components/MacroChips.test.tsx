import { render, screen, within } from '@testing-library/react';
import { MacroChips } from './MacroChips';

const values = { kcal: 339.4, proteinG: 9.8, fatG: 12.13, carbsG: 50 };

describe('MacroChips', () => {
  it('shows protein, fat and carbs with their names as titles', () => {
    render(<MacroChips values={values} />);

    expect(screen.getByTitle('Protein')).toHaveTextContent('PProtein 9.8');
    expect(screen.getByTitle('Fat')).toHaveTextContent('FFat 12.1');
    expect(screen.getByTitle('Carbs')).toHaveTextContent('CCarbs 50');
    expect(screen.queryByText(/339/)).not.toBeInTheDocument();
  });

  it('adds grams on request', () => {
    render(<MacroChips values={values} unit />);

    expect(screen.getByTitle('Protein')).toHaveTextContent(/9\.8 g$/);
  });

  it('reads the full nutrient name, not the letter', () => {
    render(<MacroChips values={values} unit />);

    const protein = screen.getByTitle('Protein');
    expect(within(protein).getByText('P')).toHaveAttribute('aria-hidden', 'true');
    expect(within(protein).getByText('Protein')).toHaveClass('sr-only');
    expect(protein).toHaveTextContent('Protein 9.8 g');
  });
});
