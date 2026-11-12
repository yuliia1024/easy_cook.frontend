const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Whether the element is not rendered or not focusable because of itself or an ancestor:
 * `hidden`, `inert` or `display: none` anywhere up the tree, or `visibility: hidden` (inherited,
 * so the element's own computed value already says it). Walks the tree instead of using
 * `getClientRects()`, which is empty for everything in jsdom.
 */
function isHidden(element: HTMLElement): boolean {
  if (element.closest('[hidden], [inert]')) return true;
  if (getComputedStyle(element).visibility === 'hidden') return true;
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return true;
  }
  return false;
}

/** The elements inside `root` that Tab can reach, in document order. */
export function tabbableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && !element.matches(':disabled') && !isHidden(element),
  );
}

/** Open dialogs, the last one on top. Only the topmost reacts to Escape and traps Tab. */
const stack: symbol[] = [];

/** Puts a dialog on top; returns a function that takes it off. */
export function openDialog(): { isTopmost: () => boolean; close: () => void } {
  const token = Symbol('dialog');
  stack.push(token);
  return {
    isTopmost: () => stack[stack.length - 1] === token,
    close: () => {
      const index = stack.indexOf(token);
      if (index !== -1) stack.splice(index, 1);
    },
  };
}

/**
 * The keydown handler shared by the dialogs: Escape calls `onEscape`, Tab cycles through the
 * tabbable elements of `dialog`. Ignored unless the dialog is the topmost one.
 */
export function handleDialogKeyDown(
  event: KeyboardEvent,
  dialog: HTMLElement | null,
  isTopmost: boolean,
  onEscape: () => void,
): void {
  if (!isTopmost) return;
  if (event.key === 'Escape') {
    onEscape();
    return;
  }
  if (event.key !== 'Tab' || !dialog) return;
  const items = tabbableElements(dialog);
  const first = items[0];
  const last = items[items.length - 1];
  const edge = event.shiftKey ? first : last;
  if (document.activeElement === edge || !dialog.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}
