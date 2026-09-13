import { Pencil, Trash2 } from 'lucide-react';
import {
  formatServiceCardMeta,
  formatServicePrice,
  getServiceOpenSpots
} from '../../../utils/services';
import { getScheduleTypeMeta, getServiceScheduleType } from '../../../utils/scheduleTypes';

export function ServiceCatalogCard({ service, bookings = [], onEdit, onRemove }) {
  const imageSrc = service.imageUrls?.[0] || '';
  const category = String(service.category || '').trim();
  const cardMeta = formatServiceCardMeta(service);
  const isSpot = getServiceScheduleType(service) === 'class_session';
  const spotsLeft = isSpot ? getServiceOpenSpots(service, bookings) : null;
  const price = formatServicePrice(service);
  const meta = getScheduleTypeMeta(service.scheduleType);
  const hidden = service.active === false;

  const endBadge = hidden
    ? 'Hidden'
    : spotsLeft != null
      ? `${spotsLeft} ${spotsLeft === 1 ? 'spot left' : 'spots left'}`
      : cardMeta || '';

  return (
    <article className={`bb-catalog-card${hidden ? ' is-hidden' : ''}`}>
      <div className="bb-catalog-card-media">
        {imageSrc ? <img src={imageSrc} alt="" /> : <span className="bb-catalog-card-media-empty" />}
        {category ? <span className="bb-catalog-card-badge">{category}</span> : null}
        {endBadge ? (
          <span className="bb-catalog-card-badge is-ink is-end">{endBadge}</span>
        ) : null}
      </div>

      <div className="bb-catalog-card-copy">
        <h2 className="bb-catalog-card-title">{service.name}</h2>
        <p className="bb-catalog-card-desc">{service.description || meta.singular}</p>
      </div>

      <div className="bb-catalog-card-price">
        <span className="bb-catalog-card-price-label">Price</span>
        <span className="bb-catalog-card-price-value">{price || '—'}</span>
      </div>

      <div className="bb-catalog-card-actions">
        <button
          type="button"
          className="bb-catalog-card-action is-edit"
          onClick={() => onEdit?.(service)}
        >
          <Pencil size={15} strokeWidth={2.2} />
          <span>Edit</span>
        </button>
        {onRemove ? (
          <button
            type="button"
            className="bb-catalog-card-action is-danger"
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
