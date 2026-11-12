import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';
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

  it('skips hidden, disabled and tabindex=-1 controls when wrapping the focus', async () => {
    const user = userEvent.setup();
    render(
      <Modal title="Oatmeal" onClose={vi.fn()}>
        <input aria-label="Amount" />
        <button type="button" disabled>
          Disabled
        </button>
        <button type="button" tabIndex={-1}>
          Skipped
        </button>
        <input type="hidden" name="id" />
      </Modal>,
    );

    await user.tab();
    expect(screen.getByLabelText('Amount')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByLabelText('Amount')).toHaveFocus();
  });

  it('only lets the topmost dialog react to Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <Modal title="Oatmeal" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    rerender(
      <Modal title="Oatmeal" onClose={onClose}>
        <ConfirmDialog
          title="Delete?"
          confirmLabel="Delete"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        >
          Sure?
        </ConfirmDialog>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <Modal title="Oatmeal" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
