import { Pencil, Trash2 } from 'lucide-react';
import {
  formatServiceDurationLabel,
  formatServicePrice
} from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function ServiceCatalogCard({ service, onEdit, onRemove }) {
  const imageSrc = service.imageUrls?.[0] || '';
  const category = String(service.category || '').trim();
  const duration = formatServiceDurationLabel(service);
  const price = formatServicePrice(service);
  const meta = getScheduleTypeMeta(service.scheduleType);
  const hidden = service.active === false;

  return (
    <article className={`bb-public-product-card bb-services-catalog-card${hidden ? ' is-hidden' : ''}`}>
      <button
        type="button"
        className="bb-public-product-surface"
        onClick={() => onEdit?.(service)}
        aria-label={`Edit ${service.name}`}
      >
        <div className="bb-public-product-media">
          {imageSrc ? <img src={imageSrc} alt="" /> : null}
          {category ? <span className="bb-public-product-sticker">{category}</span> : null}
          {hidden ? (
            <span className="bb-public-product-sticker bb-public-product-sticker--ink bb-public-product-sticker--end">
              Hidden
            </span>
          ) : duration ? (
            <span className="bb-public-product-sticker bb-public-product-sticker--ink bb-public-product-sticker--end">
              {duration}
            </span>
          ) : null}
        </div>
        <div className="bb-public-product-body">
          <h2>{service.name}</h2>
          {service.description ? (
            <p className="bb-public-product-desc">{service.description}</p>
          ) : (
            <p className="bb-public-product-desc">{meta.singular}</p>
          )}
        </div>
        <div className="bb-public-product-price-row">
          <span className="bb-public-product-price-label">Price</span>
          <span className="bb-public-product-price-value">{price || '—'}</span>
        </div>
      </button>
      <div className="bb-services-catalog-actions">
        <button type="button" className="bb-services-catalog-edit" onClick={() => onEdit?.(service)}>
          <Pencil size={15} strokeWidth={2.2} />
          <span>Edit</span>
        </button>
        {onRemove ? (
          <button
            type="button"
            className="bb-services-catalog-remove"
            aria-label={`Remove ${service.name}`}
            onClick={() => onRemove(service)}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
