import { Button } from '../../../shared/ui/Button';
import { useState } from 'react';
import { Package, X } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { isEnquiryListing, hasListingSpecifications } from '../../../../functions/listingTypes.js';
import { ListingSpecifications } from './ListingSpecifications';
import '../../../shared/ui/owner-catalog-detail.css';
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
  const dialogRef = useDetailDialog(Boolean(product), onClose, variant === 'page');
  const [imageIndex, setImageIndex] = useState(0);
  if (!product) return null;

  const isPage = variant === 'page';
  const images = (product.imageUrls || []).filter(Boolean);
  const imageSrc = images[Math.min(imageIndex, images.length - 1)] || '';
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
      ref={dialogRef}
      className={isPage ? 'bb-owner-catalog-detail' : 'bb-services-sheet bb-catalog-detail'}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="product-info-title"
    >
      {isPage ? null : (
        <div className="bb-services-sheet-backdrop" onClick={onClose} />
      )}
      <div className={isPage ? 'bb-owner-catalog-detail-panel' : 'bb-services-sheet-panel'}>
        <header className={isPage ? 'bb-owner-catalog-detail-head' : 'bb-services-sheet-head'}>
          {isPage && <PageBackButton ariaLabel="Back to Products" onClick={onClose} />}
          <div>
            <p className="bb-services-sheet-eyebrow">Product</p>
            {isPage ? <h1 id="product-info-title">{product.name || 'Product'}</h1> : <h2 id="product-info-title" className="bb-services-sheet-title">{product.name || 'Product'}</h2>}
          </div>
          {isPage ? <Button action="edit" variant="secondary" type="button" onClick={() => onEdit?.(product)}>Edit product</Button> : <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>}
        </header>

        <div className={isPage ? 'bb-owner-catalog-detail-body' : 'bb-services-sheet-body'}>
          {isPage && <div className="bb-owner-catalog-detail-gallery">
            <div className="bb-owner-catalog-detail-image">{imageSrc ? <img src={imageSrc} alt={product.name || 'Product'} /> : <Package size={52} strokeWidth={1} aria-hidden="true" />}</div>
            {images.length > 1 && <div className="bb-owner-catalog-detail-thumbnails" aria-label="Product images">{images.map((src, index) => <button type="button" key={`${src}-${index}`} aria-label={`View product image ${index + 1}`} aria-pressed={index === Math.min(imageIndex, images.length - 1)} onClick={() => setImageIndex(index)}><img src={src} alt="" /></button>)}</div>}
          </div>}
          <div className="bb-product-info">
            <div className="bb-product-info-hero">
              {!isPage && <div className="bb-product-info-media">
                {imageSrc ? (
                  <img src={imageSrc} alt="" />
                ) : (
                  <span className="bb-product-info-media-empty" />
                )}
              </div>}
              <div className="bb-product-info-copy">
                <div className="bb-product-info-badges">
                  {isEnquiryListing(product) && <span className="bb-product-info-badge is-soft">Enquiries only</span>}
                  <StatusBadge status={status} label={statusLabel} />
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

            {hasListingSpecifications(product) && <ListingSpecifications product={product}/>}
            <dl className="bb-stock-info-facts">
              <div>
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{category || '—'}</dd>
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

        {!isPage && <footer className="bb-services-sheet-footer">
          <div className="bb-services-sheet-footer-actions">
            <Button action="close" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>
              Close
            </Button>
            {onEdit ? (
              <Button action="edit" variant="secondary"
                type="button"
                className="bb-primary-btn"
                onClick={() => onEdit(product)}
              >
                Edit
              </Button>
            ) : null}
          </div>
        </footer>}
      </div>
    </div>
  );
}
