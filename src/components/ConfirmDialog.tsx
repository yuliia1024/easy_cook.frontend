import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { handleDialogKeyDown, openDialog } from './dialog-stack';
import { TrashIcon } from './icons';

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A modal question about a destructive action. Focus starts on Cancel and stays inside;
 * Escape or a click outside cancels. Over another dialog only the top one reacts.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The latest callback, so a parent re-render does not re-run the focus effect.
  const onCancelRef = useRef(onCancel);
  const pressedOutside = useRef(false);

  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const dialog = openDialog();
    const onKeyDown = (event: KeyboardEvent): void =>
      handleDialogKeyDown(event, dialogRef.current, dialog.isTopmost(), () =>
        onCancelRef.current(),
      );
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50 p-6"
      // Only a press that starts and ends on the backdrop cancels, not a drag out of the dialog.
      onMouseDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) onCancel();
        pressedOutside.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className="w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
      >
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-danger-bg text-danger">
          <TrashIcon size={24} />
        </span>
        <h2 id={`${id}-title`} className="mt-4 text-lg font-bold">
          {title}
        </h2>
        <p id={`${id}-text`} className="mt-2 mb-6 text-sm/relaxed text-sage-600">
          {children}
        </p>
        <div className="flex justify-end gap-2.5">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
