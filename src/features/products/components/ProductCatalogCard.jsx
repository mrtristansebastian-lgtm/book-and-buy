import { Pencil, Trash2 } from 'lucide-react';
import { formatProductPrice, formatStockNote } from '../../../utils/products';

export function ProductCatalogCard({ product, onEdit, onRemove }) {
  const imageSrc = product.imageUrls?.[0] || '';
  const category = String(product.category || '').trim();
  const stock = formatStockNote(product);
  const price = formatProductPrice(product);
  const hidden = product.active === false;

  return (
    <article
      className={`bb-public-product-card bb-services-catalog-card${hidden ? ' is-hidden' : ''}`}
    >
      <button
        type="button"
        className="bb-public-product-surface"
        onClick={() => onEdit?.(product)}
        aria-label={`Edit ${product.name}`}
      >
        <div className="bb-public-product-media">
          {imageSrc ? <img src={imageSrc} alt="" /> : null}
          {category ? <span className="bb-public-product-sticker">{category}</span> : null}
          {hidden ? (
            <span className="bb-public-product-sticker bb-public-product-sticker--ink bb-public-product-sticker--end">
              Hidden
            </span>
          ) : stock ? (
            <span className="bb-public-product-sticker bb-public-product-sticker--ink bb-public-product-sticker--end">
              {stock}
            </span>
          ) : null}
        </div>
        <div className="bb-public-product-body">
          <h2>{product.name}</h2>
          {product.description ? (
            <p className="bb-public-product-desc">{product.description}</p>
          ) : (
            <p className="bb-public-product-desc">Product</p>
          )}
        </div>
        <div className="bb-public-product-price-row">
          <span className="bb-public-product-price-label">Price</span>
          <span className="bb-public-product-price-value">{price || '—'}</span>
        </div>
      </button>
      <div className="bb-services-catalog-actions">
        <button type="button" className="bb-services-catalog-edit" onClick={() => onEdit?.(product)}>
          <Pencil size={15} strokeWidth={2.2} />
          <span>Edit</span>
        </button>
        {onRemove ? (
          <button
            type="button"
            className="bb-services-catalog-remove"
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
