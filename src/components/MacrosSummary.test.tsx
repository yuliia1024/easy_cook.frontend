import { render, screen } from '@testing-library/react';
import { MacrosSummary } from './MacrosSummary';

const values = { kcal: 1200, proteinG: 90, fatG: null, carbsG: 135.25 };

describe('MacrosSummary', () => {
  it('shows each value with its unit, unknown as a dash', () => {
    render(<MacrosSummary caption="Current goal" values={values} />);

    const summary = screen.getByRole('region', { name: 'Current goal' });
    expect(summary).toHaveTextContent('Current goalCalories1,200kcalProtein90gFat—gCarbs135.3g');
  });

  it('marks the macros that miss ingredient values', () => {
    render(<MacrosSummary values={values} missing={['proteinG']} />);

    const star = screen.getByTitle('Some ingredients have unknown values');
    expect(star).toHaveAttribute('aria-hidden', 'true');
    // Screen readers get the note as text; a title alone is not read reliably.
    expect(screen.getByText('(some ingredients have unknown values)')).toHaveClass('sr-only');
    expect(star.closest('dd')).toHaveTextContent('90g*(some ingredients have unknown values)');
  });

  it('can sit inside a card without its own frame', () => {
    const { container } = render(<MacrosSummary values={values} framed={false} />);

    expect(container.firstElementChild).not.toHaveClass('border');
  });

  it('colors each value on request', () => {
    render(<MacrosSummary caption="Per serving" values={values} highlight />);

    const tile = (label: string) => screen.getByText(label).parentElement!;
    expect(tile('Calories')).toHaveClass('bg-sage-900');
    expect(tile('Protein')).toHaveClass('bg-protein-bg');
    expect(tile('Fat')).toHaveClass('bg-fat-bg');
    expect(tile('Carbs')).toHaveClass('bg-carbs-bg');
  });
});
