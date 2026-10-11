import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { BriefcaseBusiness, X } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { formatServicePrice, formatServiceCardMeta } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';
import { ServiceSpecifications } from './ServiceSpecifications';
import { DemoShowcaseGuide } from '../../showcase/DemoShowcaseGuide';
import { getServiceTemplate } from '../../../../functions/serviceTemplates';
import { serviceTimingLabel } from '../../../../functions/serviceTiming';
import '../../../shared/ui/owner-catalog-detail.css';

export function ServiceInfoSheet({ service, staff = [], onClose, onEdit, isDemo = false, variant = 'sheet' }) {
  const isPage = variant === 'page';
  const dialogRef = useDetailDialog(Boolean(service), onClose, isPage);
  const [imageIndex, setImageIndex] = useState(0);
  if (!service) return null;
  const assigned = staff.filter((person) => (service.staffIds || []).includes(person.id));
  const images = (service.imageUrls || []).filter(Boolean);
  const selectedImage = Math.min(imageIndex, images.length - 1);
  const imageSrc = images[selectedImage] || '';
  const isClass = service.scheduleType === 'class_session';
  const meta = formatServiceCardMeta(service);

  return <div ref={dialogRef} className={isPage ? 'bb-owner-catalog-detail' : 'bb-services-sheet bb-catalog-detail'} role={isPage ? 'region' : 'dialog'} aria-modal={isPage ? undefined : true} aria-labelledby="service-info-title">
    {!isPage && <div className="bb-services-sheet-backdrop" onClick={onClose} />}
    <div className={isPage ? 'bb-owner-catalog-detail-panel' : 'bb-services-sheet-panel'}>
      <header className={isPage ? 'bb-owner-catalog-detail-head' : 'bb-services-sheet-head'}>
        {isPage && <PageBackButton ariaLabel="Back to Services" onClick={onClose} />}
        <div>
          <p className="bb-services-sheet-eyebrow">Service</p>
          {isPage ? <h1 id="service-info-title">{service.name || 'Service'}</h1> : <h2 className="bb-services-sheet-title" id="service-info-title">{service.name || 'Service'}</h2>}
        </div>
        {isPage ? <Button action="edit" variant="secondary" type="button" onClick={() => onEdit?.(service)}>Edit service</Button> : <button className="bb-ghost-btn bb-services-sheet-close" type="button" onClick={onClose} aria-label="Close service details"><X size={18} /></button>}
      </header>
      <div className={isPage ? 'bb-owner-catalog-detail-body' : 'bb-services-sheet-body'}>
        {isPage && <div className="bb-owner-catalog-detail-gallery">
          <div className="bb-owner-catalog-detail-image">{imageSrc ? <img src={imageSrc} alt={service.name || 'Service'} /> : <BriefcaseBusiness size={52} strokeWidth={1} aria-hidden="true" />}</div>
          {images.length > 1 && <div className="bb-owner-catalog-detail-thumbnails" aria-label="Service images">{images.map((src, index) => <button type="button" key={`${src}-${index}`} aria-label={`View service image ${index + 1}`} aria-pressed={index === selectedImage} onClick={() => setImageIndex(index)}><img src={src} alt="" /></button>)}</div>}
        </div>}
        <div className="bb-product-info">
          <div className="bb-product-info-hero">
            {!isPage && <div className="bb-product-info-media">{imageSrc ? <img src={imageSrc} alt="" /> : <span className="bb-product-info-media-empty" />}</div>}
            <div className="bb-product-info-copy">
              <div className="bb-product-info-badges"><StatusBadge status={service.active === false ? 'inactive' : 'active'} label={service.active === false ? 'Hidden' : 'Active'} />{service.category && <span className="bb-product-info-badge is-soft">{service.category}</span>}</div>
              <p className="bb-product-info-price">{formatServicePrice(service) || '—'}</p>
              {meta && <p className="bb-product-info-desc">{meta}</p>}
            </div>
          </div>
          {service.description && <section className="bb-product-info-block"><h3 className="bb-stock-section-label">About this service</h3><p className="bb-product-info-desc">{service.description}</p></section>}
          <DemoShowcaseGuide isDemo={isDemo} kind="service" itemId={service.id} onEdit={onEdit ? () => onEdit(service) : undefined} />
          <ServiceSpecifications service={service} />
          <dl className="bb-stock-info-facts">
            <div><dt>Store Category</dt><dd>{service.category || 'Not set'}</dd></div>
            <div><dt>Booking type</dt><dd>{getScheduleTypeMeta(service.scheduleType).singular}</dd></div>
            <div><dt>When</dt><dd>{serviceTimingLabel(service)}</dd></div>
            {service.timingNotes && <div><dt>Timing details</dt><dd>{service.timingNotes}</dd></div>}
            {!isClass && <div><dt>Duration</dt><dd>{service.fixedDuration === false ? `From ${service.minDuration || service.duration || '—'} minutes` : service.duration ? `${service.duration} minutes` : 'Varies by option'}</dd></div>}
            {isClass && <div><dt>Capacity</dt><dd>{service.capacity || 1} spots</dd></div>}
            <div><dt>Assigned staff</dt><dd>{assigned.map(person => person.name).join(', ') || 'No staff assigned'}</dd></div>
          </dl>
          {service.variants?.length > 0 && <section className="bb-product-info-block"><h3 className="bb-stock-section-label">Service options</h3><ul className="bb-stock-info-variant-list">{service.variants.map(option => <li key={option.id}><strong>{option.name || 'Option'}</strong><span>{[formatServicePrice(service, option), option.description, !isClass && option.minDuration ? `${option.minDuration} minutes` : null, option.available === false ? 'Unavailable' : null].filter(Boolean).join(' · ')}</span></li>)}</ul></section>}
        </div>
      </div>
      {!isPage && <footer className="bb-services-sheet-footer"><div className="bb-services-sheet-footer-actions"><Button action="close" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>Close</Button>{onEdit && <Button action="edit" variant="secondary" type="button" className="bb-primary-btn" onClick={() => onEdit(service)}>Edit service</Button>}</div></footer>}
    </div>
  </div>;
}
