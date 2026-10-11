import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { formatProductPrice, normalizeProductStatus } from '../../../utils/products';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { listingFacts, isEnquiryListing, getListingType, publicListingDetails } from '../../../../functions/listingTypes.js';

export function ProductCatalogCard({ product, onView, onEdit, stockLabel }) {
  const status = normalizeProductStatus(product);
  const enquiry = isEnquiryListing(product);
  const variants = (product.variants || []).filter(variant => variant.available !== false && variant.active !== false);
  const variantCount = variants.length;
  const details = publicListingDetails(product);
  const specs = getListingType(product) === 'vehicle'
    ? [details.year, details.mileage != null ? `${Number(details.mileage).toLocaleString('en-ZA')} km` : ''].filter(Boolean)
    : listingFacts(product).slice(0, 2);
  const facts = specs.map(value => ({ value }));
  return <BusinessCatalogCard name={product.name} facts={facts} image={product.imageUrls?.[0]} kind={enquiry ? 'Enquiry listing' : 'Product'}
    category={getCatalogCategory(product)} price={stockLabel || formatProductPrice(product)}
    priceLabel={stockLabel ? 'Availability' : enquiry ? 'Asking price' : 'Price'} optionCount={!stockLabel && !enquiry ? variantCount : 0}
    annotation={status === 'active' ? 'Active' : status}
    onView={() => onView?.(product)} onEdit={onEdit ? () => onEdit(product) : undefined} />;
}
