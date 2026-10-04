import { useEffect, useRef } from 'react';

export function useDetailDialog(open, onClose, isPage = false) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open || isPage || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(root.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(item => item.getClientRects().length);
    controls()[0]?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', keydown);
    return () => { root.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [open, onClose, isPage]);
  return ref;
}
