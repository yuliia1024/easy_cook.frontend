import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete this?"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      It cannot be undone.
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel, user: userEvent.setup() };
}

describe('ConfirmDialog', () => {
  it('asks the question with focus on Cancel', () => {
    renderDialog();

    const dialog = screen.getByRole('alertdialog', { name: 'Delete this?' });
    expect(dialog).toHaveAccessibleDescription('It cannot be undone.');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('confirms', async () => {
    const { onConfirm, onCancel, user } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with the button, Escape or a click outside', async () => {
    const { onConfirm, onCancel, user } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('alertdialog').parentElement!);
    await user.click(screen.getByRole('alertdialog'));

    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the focus inside', async () => {
    const { user } = renderDialog();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('keeps the focus where it is when the parent re-renders', async () => {
    const user = userEvent.setup();
    // A parent passes a new `onCancel` arrow on every render.
    const dialog = () => (
      <ConfirmDialog
        title="Delete this?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={() => {}}
      >
        It cannot be undone.
      </ConfirmDialog>
    );
    const { rerender } = render(dialog());

    await user.tab();
    rerender(dialog());

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('stays open after a drag from the dialog onto the backdrop', () => {
    const { onCancel } = renderDialog();
    const backdrop = screen.getByRole('alertdialog').parentElement!;

    fireEvent.mouseDown(screen.getByRole('alertdialog'));
    fireEvent.click(backdrop);

    expect(onCancel).not.toHaveBeenCalled();
  });
});
