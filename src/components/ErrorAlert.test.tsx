import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/http';
import { ErrorAlert } from './ErrorAlert';

describe('ErrorAlert', () => {
  it('shows the API message', () => {
    render(<ErrorAlert error={new ApiError(404, 'Recipe not found')} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/^Recipe not found$/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lists the validation details', () => {
    render(
      <ErrorAlert error={new ApiError(400, 'Bad Request', ['name is empty', 'servings < 1'])} />,
    );

    expect(screen.getByText('Validation failed.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'name is empty',
      'servings < 1',
    ]);
  });

  it('puts a title above the message', () => {
    render(<ErrorAlert error={new Error('boom')} title="Could not save" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not saveSomething went wrong. Please try again.',
    );
  });

  it('retries on request', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorAlert error={new ApiError(0, 'The server is unavailable.')} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
