import { Pencil, Trash2 } from 'lucide-react';
import {
  formatCompareAtPrice,
  formatProductPrice,
  formatStockNote,
  normalizeProductStatus
} from '../../../utils/products';

export function ProductCatalogCard({ product, onEdit, onRemove }) {
  const imageSrc = product.imageUrls?.[0] || '';
  const category = String(product.category || '').trim();
  const stock = formatStockNote(product);
  const price = formatProductPrice(product);
  const compareAt = formatCompareAtPrice(product);
  const status = normalizeProductStatus(product);
  const notLive = status !== 'active';

  const statusLabel =
    status === 'draft' ? 'Draft' : status === 'archived' ? 'Archived' : '';

  return (
    <article className={`bb-catalog-card${notLive ? ' is-hidden' : ''}`}>
      <div className="bb-catalog-card-media">
        {imageSrc ? <img src={imageSrc} alt="" /> : <span className="bb-catalog-card-media-empty" />}
        {category ? <span className="bb-catalog-card-badge">{category}</span> : null}
        {notLive ? (
          <span className="bb-catalog-card-badge is-ink is-end">{statusLabel || 'Hidden'}</span>
        ) : stock ? (
          <span className="bb-catalog-card-badge is-ink is-end">{stock}</span>
        ) : null}
      </div>

      <div className="bb-catalog-card-copy">
        <h2 className="bb-catalog-card-title">{product.name}</h2>
        <p className="bb-catalog-card-desc">{product.description || 'Product'}</p>
      </div>

      <div className="bb-catalog-card-price">
        <span className="bb-catalog-card-price-label">Price</span>
        <span className="bb-catalog-card-price-value">
          {compareAt && price ? (
            <>
              <s className="bb-products-compare-at">{compareAt}</s> {price}
            </>
          ) : (
            price || '—'
          )}
        </span>
      </div>

      <div className="bb-catalog-card-actions">
        <button
          type="button"
          className="bb-catalog-card-action is-edit"
          onClick={() => onEdit?.(product)}
        >
          <Pencil size={15} strokeWidth={2.2} />
          <span>Edit</span>
        </button>
        {onRemove ? (
          <button
            type="button"
            className="bb-catalog-card-action is-danger"
            aria-label={`Remove ${product.name}`}
            onClick={() => onRemove(product)}
          >
            <Trash2 size={15} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
