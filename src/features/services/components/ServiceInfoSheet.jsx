import { Button } from '../../../shared/ui/Button';
import { X } from 'lucide-react';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { formatServicePrice, formatServiceCardMeta } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function ServiceInfoSheet({ service, staff = [], onClose, onEdit }) {
  const dialogRef = useDetailDialog(Boolean(service), onClose);
  if (!service) return null;
  const assigned = staff.filter((person) => (service.staffIds || []).includes(person.id));
  return <div ref={dialogRef} className="bb-services-sheet bb-catalog-detail" role="dialog" aria-modal="true" aria-labelledby="service-info-title">
    <div className="bb-services-sheet-backdrop" onClick={onClose} />
    <div className="bb-services-sheet-panel">
      <header className="bb-services-sheet-head">
        <div><p className="bb-services-sheet-eyebrow">Service details</p><h2 className="bb-services-sheet-title" id="service-info-title">{service.name}</h2></div>
        <button className="bb-ghost-btn bb-services-sheet-close" type="button" onClick={onClose} aria-label="Close service details"><X size={18} /></button>
      </header>
      <div className="bb-services-sheet-body"><div className="bb-product-info">
        <div className="bb-product-info-hero">
          <div className="bb-product-info-media">{service.imageUrls?.[0] ? <img src={service.imageUrls[0]} alt="" /> : <span className="bb-product-info-media-empty" />}</div>
          <div className="bb-product-info-copy"><StatusBadge status={service.active === false ? 'inactive' : 'active'} label={service.active === false ? 'Hidden' : 'Active'} /><p className="bb-product-info-price">{formatServicePrice(service) || '—'}</p><p className="bb-product-info-desc">{formatServiceCardMeta(service)}</p></div>
        </div>
        {service.description && <section className="bb-product-info-block"><h3 className="bb-stock-section-label">About this service</h3><p className="bb-product-info-desc">{service.description}</p></section>}
        <dl className="bb-stock-info-facts">
          <div><dt>Category</dt><dd>{service.category || 'Not set'}</dd></div>
          <div><dt>Booking type</dt><dd>{getScheduleTypeMeta(service.scheduleType).singular}</dd></div>
          <div><dt>Duration</dt><dd>{service.duration ? `${service.duration} minutes` : 'Varies by option'}</dd></div>
          <div><dt>Assigned staff</dt><dd>{assigned.map(person => person.name).join(', ') || 'No staff assigned'}</dd></div>
        </dl>
        {service.variants?.length > 0 && <section className="bb-product-info-block"><h3 className="bb-stock-section-label">Service options</h3><ul className="bb-stock-info-variant-list">{service.variants.map(option => <li key={option.id}><strong>{option.name || 'Option'}</strong><span>{[option.description, option.minDuration ? `${option.minDuration} minutes` : null, option.available === false ? 'Unavailable' : null].filter(Boolean).join(' · ')}</span></li>)}</ul></section>}
      </div></div>
      <footer className="bb-services-sheet-footer"><div className="bb-services-sheet-footer-actions"><Button action="close" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>Close</Button><Button action="edit" variant="secondary" type="button" className="bb-primary-btn" onClick={() => onEdit(service)}>Edit service</Button></div></footer>
    </div>
  </div>;
}
