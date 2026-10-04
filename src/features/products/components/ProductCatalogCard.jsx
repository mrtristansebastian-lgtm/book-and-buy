import { useState } from 'react';
import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { CatalogDeleteDialog } from '../../../shared/ui/CatalogDeleteDialog';
import { formatProductPrice, normalizeProductStatus } from '../../../utils/products';
export function ProductCatalogCard({ product, onView, onEdit, onRemove, stockLabel }) {
  const [deleting, setDeleting] = useState(false);
  const status = normalizeProductStatus(product);
  return <><BusinessCatalogCard name={product.name} image={product.imageUrls?.[0]} price={stockLabel || formatProductPrice(product)} annotation={status !== 'active' ? status : null} onView={() => onView?.(product)} onEdit={() => onEdit?.(product)} onDelete={onRemove ? () => setDeleting(true) : undefined} />
    {deleting && <CatalogDeleteDialog name={product.name} onClose={() => setDeleting(false)} onDelete={() => onRemove(product)} />}
  </>;
}
