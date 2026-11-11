import { render, screen } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('labels the control and describes it with the hint', () => {
    render(
      <Field label="Servings" htmlFor="servings" hint="Whole servings">
        <input id="servings" aria-describedby="servings-msg" />
      </Field>,
    );

    const input = screen.getByLabelText('Servings');
    expect(input).toHaveAccessibleDescription('Whole servings');
    expect(screen.getByText('Whole servings')).toHaveClass('text-sage-500');
  });

  it('shows the error instead of the hint', () => {
    render(
      <Field label="Servings" htmlFor="servings" hint="Whole servings" error="Too many">
        <input id="servings" aria-describedby="servings-msg" />
      </Field>,
    );

    expect(screen.getByLabelText('Servings')).toHaveAccessibleDescription('Too many');
    expect(screen.getByText('Too many')).toHaveClass('text-red-600');
    expect(screen.queryByText('Whole servings')).not.toBeInTheDocument();
  });

  it('renders no message without a hint or an error', () => {
    const { container } = render(
      <Field label="Name" htmlFor="name" className="col-span-2">
        <input id="name" />
      </Field>,
    );

    expect(container.querySelector('p')).toBeNull();
    expect(container.firstElementChild).toHaveClass('col-span-2');
  });
});
