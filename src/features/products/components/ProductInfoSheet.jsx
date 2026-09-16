import { Pencil, X } from 'lucide-react';
import {
  formatCompareAtPrice,
  formatProductPrice,
  formatStockNote,
  normalizeProductStatus,
  productHasVariants
} from '../../../utils/products';

export function ProductInfoSheet({
  product,
  onClose,
  onEdit,
  variant = 'sheet'
}) {
  if (!product) return null;

  const isPage = variant === 'page';
  const imageSrc = product.imageUrls?.[0] || '';
  const category = String(product.category || '').trim();
  const stock = formatStockNote(product);
  const price = formatProductPrice(product);
  const compareAt = formatCompareAtPrice(product);
  const status = normalizeProductStatus(product);
  const hasVariants = productHasVariants(product);
  const statusLabel =
    status === 'draft' ? 'Draft' : status === 'archived' ? 'Archived' : 'Live';

  return (
    <div
      className={`bb-services-sheet${isPage ? ' is-page' : ''}`}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="product-info-title"
    >
      {isPage ? null : (
        <div className="bb-services-sheet-backdrop" onClick={onClose} />
      )}
      <div className="bb-services-sheet-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Product</p>
            <h2 id="product-info-title" className="bb-services-sheet-title">
              {product.name || 'Product'}
            </h2>
            <p className="bb-services-sheet-lede">
              Preview how this item looks in your catalog.
            </p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="bb-services-sheet-body">
          <div className="bb-product-info">
            <div className="bb-product-info-hero">
              <div className="bb-product-info-media">
                {imageSrc ? (
                  <img src={imageSrc} alt="" />
                ) : (
                  <span className="bb-product-info-media-empty" />
                )}
              </div>
              <div className="bb-product-info-copy">
                <div className="bb-product-info-badges">
                  <span className="bb-product-info-badge">{statusLabel}</span>
                  {category ? (
                    <span className="bb-product-info-badge is-soft">{category}</span>
                  ) : null}
                  {stock ? (
                    <span className="bb-product-info-badge is-soft">{stock}</span>
                  ) : null}
                </div>
                <p className="bb-product-info-price">
                  {compareAt && price ? (
                    <>
                      <s className="bb-products-compare-at">{compareAt}</s>
                      {price}
                    </>
                  ) : (
                    price || '—'
                  )}
                </p>
              </div>
            </div>

            {product.description ? (
              <div className="bb-product-info-block">
                <p className="bb-stock-section-label">Description</p>
                <p className="bb-product-info-desc">{product.description}</p>
              </div>
            ) : null}

            <dl className="bb-stock-info-facts">
              <div>
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{category || '—'}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{price || '—'}</dd>
              </div>
              <div>
                <dt>Compare-at</dt>
                <dd>{compareAt || '—'}</dd>
              </div>
            </dl>

            {hasVariants ? (
              <div className="bb-product-info-block">
                <p className="bb-stock-section-label">Variants</p>
                <ul className="bb-stock-info-variant-list">
                  {(product.variants || []).map((variant) => (
                    <li key={variant.id}>
                      <strong>
                        {variant.title ||
                          Object.values(variant.optionValues || {}).join(' / ') ||
                          'Variant'}
                      </strong>
                      <span>
                        {[
                          formatProductPrice(product, variant),
                          variant.sku ? `SKU ${variant.sku}` : null
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <footer className="bb-services-sheet-footer">
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Close
            </button>
            {onEdit ? (
              <button
                type="button"
                className="bb-primary-btn"
                onClick={() => onEdit(product)}
              >
                <Pencil size={15} strokeWidth={2.2} />
                Edit
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
