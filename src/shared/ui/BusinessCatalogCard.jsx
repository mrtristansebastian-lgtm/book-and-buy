import { Button } from './Button';
import { useCallback, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, X } from 'lucide-react';
import { useDetailDialog } from './useDetailDialog';

export function CatalogCardActions({ name, image, onClose, onView, onEdit, onDelete }) {
  const titleId = useId();
  const ref = useDetailDialog(true, onClose);
  const choose = (action) => { onClose(); action?.(); };
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="bb-catalog-actions-overlay" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="bb-catalog-actions-backdrop" onClick={onClose} />
      <section className="bb-catalog-actions-dialog">
        <header>
          {image ? <img src={image} alt="" /> : null}
          <div><p>Manage item</p><h2 id={titleId}>{name}</h2></div>
          <button type="button" className="bb-catalog-actions-close" aria-label="Close item actions" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="bb-catalog-actions-options">
          {onView && <Button action="view" variant="secondary" onClick={() => choose(onView)}>View</Button>}
          {onEdit && <Button action="edit" variant="secondary" onClick={() => choose(onEdit)}>Edit</Button>}
          {onDelete && <Button action="delete" variant="destructive" onClick={() => choose(onDelete)}>Delete</Button>}
        </div>
      </section>
    </div>, document.body
  );
}

export function BusinessCatalogCard({ name, image, price, annotation, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <><article className="bb-public-product-card bb-business-catalog-card">
    <button type="button" className="bb-public-product-surface" onClick={onView} aria-label={`View ${name}`}>
      <div className="bb-public-product-media">{image ? <img src={image} alt="" /> : null}</div>
      <div className="bb-public-product-price-row"><h2 className="bb-public-product-name">{name}</h2><p className="bb-public-product-price">{price || '—'}</p>{annotation && <span className="bb-business-card-note">{annotation}</span>}</div>
    </button>
    <button type="button" className="bb-business-card-settings" aria-label={`Settings for ${name}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Settings2 size={18} strokeWidth={1.6} aria-hidden="true" /></button>
  </article>
    {open && <CatalogCardActions name={name} image={image} onClose={close} onView={onView} onEdit={onEdit} onDelete={onDelete} />}
  </>;
}
