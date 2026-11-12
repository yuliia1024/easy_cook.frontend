import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} limit={20} total={20} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();

    render(<Pagination page={1} limit={20} total={0} onChange={vi.fn()} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('shows the position and disables Previous on the first page', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={1} limit={20} total={45} onChange={onChange} />);

    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toHaveTextContent('Page 1 of 3 · 45 records');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables Next on the last page and goes back', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={3} limit={20} total={45} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
