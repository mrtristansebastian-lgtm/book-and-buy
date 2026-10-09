import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { formatProductPrice, normalizeProductStatus } from '../../../utils/products';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { listingFacts, isEnquiryListing } from '../../../../functions/listingTypes.js';
import { Layers3, SlidersHorizontal } from 'lucide-react';

export function ProductCatalogCard({ product, onView, onEdit, stockLabel }) {
  const status = normalizeProductStatus(product);
  const enquiry = isEnquiryListing(product);
  const variantCount = (product.variants || []).filter(variant => variant.available !== false).length;
  const specs = listingFacts(product);
  const facts = [...(variantCount ? [{ icon: Layers3, label: 'Selection', value: `${variantCount} ${variantCount === 1 ? 'variant' : 'variants'}` }] : []), ...specs.slice(0, variantCount ? 1 : 2).map(value => ({ icon: SlidersHorizontal, value }))];
  return <BusinessCatalogCard name={product.name} facts={facts} image={product.imageUrls?.[0]} summary={product.description} kind={enquiry ? 'Enquiry listing' : 'Product'}
    category={getCatalogCategory(product)} price={stockLabel || formatProductPrice(product)}
    priceLabel={stockLabel ? 'Availability' : enquiry ? 'Asking price' : 'Price'}
    annotation={status === 'active' ? 'Active' : status}
    onView={() => onView?.(product)} onEdit={onEdit ? () => onEdit(product) : undefined} />;
}
