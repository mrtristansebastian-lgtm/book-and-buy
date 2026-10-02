import { useEffect, useRef } from 'react';

const scrollLocks = new Set();
let originalOverflow = '';
const controls = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

/** Keep portalled editors keyboard-accessible, including nested crop dialogs. */
export function useDialogFocus(ref, open, onClose, suspended = false) {
  const latest = useRef({ onClose, suspended });
  latest.current = { onClose, suspended };
  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const panel = ref.current;
    const previousFocus = document.activeElement;
    const lock = Symbol('dialog');
    if (!scrollLocks.size) originalOverflow = document.body.style.overflow;
    scrollLocks.add(lock);
    document.body.style.overflow = 'hidden';
    const visibleControls = () => [...panel.querySelectorAll(controls)].filter((element) => element.getClientRects().length);
    const frame = requestAnimationFrame(() => (visibleControls()[0] || panel).focus());
    const handleKey = (event) => {
      if (latest.current.suspended) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); latest.current.onClose?.();
      }
      if (event.key !== 'Tab') return;
      const items = visibleControls();
      if (!items.length) { event.preventDefault(); panel.focus(); return; }
      const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    panel.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(frame);
      panel.removeEventListener('keydown', handleKey);
      scrollLocks.delete(lock);
      if (!scrollLocks.size) document.body.style.overflow = originalOverflow;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, [open, ref]);
}
