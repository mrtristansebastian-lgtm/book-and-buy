import { ChevronRight } from 'lucide-react';
import { BlankMedia } from '../../../shared/ui/BlankMedia';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { listingFacts, isEnquiryListing, getListingType, hasListingSpecifications } from '../../../../functions/listingTypes.js';
import { serviceFacts, getServiceTemplate } from '../../../../functions/serviceTemplates.js';
import { getProductTemplate } from '../../../../functions/catalogTemplates.js';
import '../../products/components/listing-types.css';

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
  const enquiry = kind !== 'book' && isEnquiryListing(item);
  const templateLabel = kind === 'book' ? getServiceTemplate(item.catalogTemplateId)?.label : getProductTemplate(item.catalogTemplateId)?.label;
  const category = getCatalogCategory(item, templateLabel || (kind === 'book' ? 'Service' : enquiry ? getListingType(item) === 'vehicle' ? 'Vehicle' : 'Equipment' : getListingType(item) === 'electronics' ? 'Electronics' : 'Product'));
  const facts = kind === 'book' ? serviceFacts(item) : hasListingSpecifications(item) ? listingFacts(item) : [];
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
          {facts.length > 0 && <div className="bb-listing-card-facts">{facts.map((fact,index) => <span key={index}>{fact}</span>)}</div>}
          {enquiry && <p className="bb-offer-card-meta">{item.listingAvailability === 'sold' ? 'Sold' : item.listingAvailability === 'reserved' ? 'Reserved' : 'Enquire'}{(item.vehicleDetails?.location || item.equipmentDetails?.location) ? ` · ${item.vehicleDetails?.location || item.equipmentDetails?.location}` : ''}</p>}
          {meta ? <p className="bb-offer-card-meta">{meta}</p> : null}
        </div>
      </button>
    </article>
  );
}
