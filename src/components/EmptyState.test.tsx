import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows the title, the text, the icon and the action', () => {
    render(
      <EmptyState
        title="No menus yet"
        icon={<svg data-testid="icon" />}
        action={<button type="button">Open Chat</button>}
      >
        Ask the assistant.
      </EmptyState>,
    );

    expect(screen.getByText('No menus yet')).toBeInTheDocument();
    expect(screen.getByText('Ask the assistant.')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Chat' })).toBeInTheDocument();
  });

  it('works with the title alone', () => {
    const { container } = render(<EmptyState title="Nothing found" />);

    expect(container).toHaveTextContent(/^Nothing found$/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
