import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// Everything a keyboard user can move focus to while a dialog is open.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseDialogFocusOptions {
  /** Whether the dialog is currently rendered (hook no-ops when false). */
  open: boolean;
  /** Called on Escape; the caller decides what "closing" means. */
  onClose: () => void;
  /** Focus this element first (e.g. the close button); defaults to the first focusable node. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Shared modal behaviour: focus moves into the dialog when it opens, Tab and
 * Shift+Tab cycle inside it, Escape closes it, and focus returns to whatever
 * element opened it once it disappears. Every overlay in the app needs those
 * same four behaviours, so they live here once instead of being re-implemented
 * per modal (which is exactly how the app ended up with dialogs a screen-reader
 * user could not enter or leave).
 */
export function useDialogFocus({ open, onClose, initialFocusRef }: UseDialogFocusOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Whatever had focus before the dialog opened: that is the trigger button we
  // hand focus back to on close.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const preferred = initialFocusRef?.current;
    const target = preferred || dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) || dialogRef.current;
    // `preventScroll` keeps the page behind from jumping on open.
    target?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        // Nothing to move to inside the dialog: keep focus where it is.
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to the trigger so the next Tab press continues from
      // where the user was instead of the top of the document.
      const previous = previouslyFocused.current;
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
    // The effect must only re-run when the dialog opens/closes, never on
    // every render of its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return dialogRef;
}
