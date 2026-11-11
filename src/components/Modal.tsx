import { useEffect, useId, useRef, type ReactNode } from 'react';
import { handleDialogKeyDown, openDialog } from './dialog-stack';
import { CloseIcon } from './icons';

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** Shown next to the close button, e.g. a link to the full page. */
  actions?: ReactNode;
}

/**
 * A modal window over the page. Focus starts on Close and stays inside; Escape or a click
 * outside closes it; the page behind does not scroll. Over another dialog only the top one reacts.
 */
export function Modal({ title, children, onClose, actions }: Props) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The latest callback, so a parent re-render does not re-run the focus effect.
  const onCloseRef = useRef(onClose);
  const pressedOutside = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const dialog = openDialog();
    const onKeyDown = (event: KeyboardEvent): void =>
      handleDialogKeyDown(event, dialogRef.current, dialog.isTopmost(), () => onCloseRef.current());
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/50 p-4 sm:p-6"
      // Only a press that starts and ends on the backdrop closes, not a drag out of the dialog.
      onMouseDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) onClose();
        pressedOutside.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="flex max-h-full w-full max-w-4xl flex-col rounded-3xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
      >
        <header className="flex items-start gap-3 border-b border-sage-100 px-6 py-4">
          <h2 id={`${id}-title`} className="flex-1 pt-1.5 text-xl font-bold">
            {title}
          </h2>
          {actions}
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sage-500 hover:bg-sage-100 hover:text-sage-900"
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
