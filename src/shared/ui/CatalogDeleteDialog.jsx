import { Button } from './Button';
import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDetailDialog } from './useDetailDialog';

export function CatalogDeleteDialog({ name, onClose, onDelete }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const close = () => { if (!busy) onClose(); };
  const ref = useDetailDialog(true, close);
  if (typeof document === 'undefined') return null;

  const remove = async () => {
    setError('');
    setBusy(true);
    // Keep focus inside the dialog when both action buttons become disabled.
    ref.current?.focus();
    try {
      await onDelete();
      onClose();
    } catch {
      setError('Could not delete this item. Please try again.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="bb-services-sheet bb-catalog-delete" ref={ref} tabIndex={-1}
      role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`} aria-busy={busy || undefined}>
      <div className="bb-services-sheet-backdrop" onClick={close} />
      <div className="bb-services-sheet-panel">
        <header className="bb-services-sheet-head">
          <h2 id={`${id}-title`} className="bb-services-sheet-title">Delete {name}?</h2>
        </header>
        <div className="bb-services-sheet-body">
          <p id={`${id}-description`}>This removes the item from your catalog. Existing bookings and order history are kept.</p>
          {error && <p role="alert">{error}</p>}
        </div>
        <footer className="bb-services-sheet-footer">
          <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" disabled={busy} onClick={close}>Keep item</Button>
          <Button action="delete" variant="destructive" type="button" className="bb-ghost-btn" busy={busy} busyLabel="Deleting…" onClick={remove}>Delete item</Button>
        </footer>
      </div>
    </div>, document.body
  );
}
