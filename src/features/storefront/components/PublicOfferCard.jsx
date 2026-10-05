import { ChevronRight } from 'lucide-react';
import { BlankMedia } from '../../../shared/ui/BlankMedia';
import { getCatalogCategory } from '../../../utils/catalogCategories';

/** One clear browsing action across Book, Buy and Find. */
export function PublicOfferCard({
  item,
  kind = 'buy',
  price,
  meta = '',
  availability = '',
  onOpen,
  className = ''
}) {
  const image = item.imageUrls?.[0] || item.imageUrl || item.image || '';
  const category = getCatalogCategory(item, kind === 'book' ? 'Service' : 'Product');
  return (
    <article className={`bb-offer-card is-${kind}${className ? ` ${className}` : ''}`}>
      <button type="button" className="bb-offer-card-surface" onClick={onOpen} aria-label={`View ${item.name}`}
        data-analytics-item-id={item.id} data-analytics-item-name={item.name}
        data-analytics-item-kind={kind === 'book' ? 'service' : 'product'}>
        <div className="bb-offer-card-media">
          {image ? <img src={image} alt="" loading="lazy" /> : <BlankMedia variant="square" />}
          {availability ? <span className="bb-offer-card-availability">{availability}</span> : null}
        </div>
        <div className="bb-offer-card-content">
          <p className="bb-offer-card-category">{category}</p>
          <div className="bb-offer-card-title-row">
            <h2 className="bb-offer-card-title">{item.name}</h2>
            <ChevronRight size={16} aria-hidden="true" />
          </div>
          <p className="bb-offer-card-price">{price || 'Price on request'}</p>
          {meta ? <p className="bb-offer-card-meta">{meta}</p> : null}
        </div>
      </button>
    </article>
  );
}
