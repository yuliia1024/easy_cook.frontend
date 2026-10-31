import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function renderModal() {
  const onClose = vi.fn();
  const result = render(
    <Modal title="Oatmeal" onClose={onClose} actions={<button type="button">Action</button>}>
      <input aria-label="Amount" />
    </Modal>,
  );
  return { ...result, onClose, user: userEvent.setup() };
}

describe('Modal', () => {
  it('shows the title with focus on Close and locks the page scroll', () => {
    const { unmount } = renderModal();

    expect(screen.getByRole('dialog', { name: 'Oatmeal' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes with the button, Escape or a click outside', async () => {
    const { onClose, user } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('stays open when a press inside ends outside or a click is inside', async () => {
    const { onClose, user } = renderModal();
    const backdrop = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(screen.getByLabelText('Amount'));
    fireEvent.click(backdrop);
    await user.click(screen.getByLabelText('Amount'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the focus inside', async () => {
    const { user } = renderModal();

    await user.tab();
    expect(screen.getByLabelText('Amount')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Action' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByLabelText('Amount')).toHaveFocus();
  });
});
