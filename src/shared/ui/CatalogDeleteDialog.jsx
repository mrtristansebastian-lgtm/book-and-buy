import { Button } from './Button';
import { useState } from 'react';
import { useDetailDialog } from './useDetailDialog';
export function CatalogDeleteDialog({ name, onClose, onDelete }) {
  const ref = useDetailDialog(true, onClose);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <div className="bb-services-sheet bb-catalog-delete" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="catalog-delete-title"><div className="bb-services-sheet-backdrop" onClick={busy ? undefined : onClose} /><div className="bb-services-sheet-panel"><header className="bb-services-sheet-head"><h2 id="catalog-delete-title" className="bb-services-sheet-title">Delete {name}?</h2></header><div className="bb-services-sheet-body"><p>This removes the item from your catalog. Existing bookings and order history are kept.</p>{error && <p role="alert">{error}</p>}</div><footer className="bb-services-sheet-footer"><Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" disabled={busy} onClick={onClose}>Keep item</Button><Button action="delete" variant="destructive" type="button" className="bb-ghost-btn" busy={busy} busyLabel="Deleting…" onClick={async () => { setBusy(true); try { await onDelete(); onClose(); } catch { setError('Could not delete this item. Please try again.'); setBusy(false); } }}>Delete item</Button></footer></div></div>;
}
