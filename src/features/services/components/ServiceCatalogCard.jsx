import { useState } from 'react';
import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { CatalogDeleteDialog } from '../../../shared/ui/CatalogDeleteDialog';
import { formatServicePrice } from '../../../utils/services';
export function ServiceCatalogCard({ service, onView, onEdit, onRemove }) {
  const [deleting, setDeleting] = useState(false);
  return <><BusinessCatalogCard name={service.name} image={service.imageUrls?.[0]} price={formatServicePrice(service)} annotation={service.active === false ? 'Hidden' : null} onView={() => onView?.(service)} onEdit={() => onEdit?.(service)} onDelete={onRemove ? () => setDeleting(true) : undefined} />
    {deleting && <CatalogDeleteDialog name={service.name} onClose={() => setDeleting(false)} onDelete={() => onRemove(service)} />}
  </>;
}
