import { CompassIcon } from '../../../shared/ui/CompassIcon';
import { CalendarIcon } from '../../../shared/ui/CalendarIcon';
import { ShoppingBagIcon } from '../../../shared/ui/ShoppingBagIcon';
import { reportArtworkUrl } from '../../../shared/ui/reportArtwork';

// Original generated artwork shared by report headings and inventory summaries.
// Static PNG cutouts use 320px source images so they stay sharp on high-density screens.
const REPORT_ARTWORK = new Set(['audience', 'products', 'services', 'checkout', 'revenue', 'profit', 'payments', 'averages', 'conversion', 'discovery', 'places', 'buy', 'book', 'inventory', 'stock-healthy', 'stock-low', 'stock-out']);

export function ReportCategoryIcon({ category }) {
  const artwork = REPORT_ARTWORK.has(category) ? category : 'discovery';
  const sharedIcon = { discovery: CompassIcon, services: CalendarIcon, products: ShoppingBagIcon }[artwork];
  const SharedIcon = sharedIcon;
  return <span className="bb-report-category-icon" aria-hidden="true">
    {SharedIcon ? <SharedIcon size={56} loading="lazy" /> :
      <img src={reportArtworkUrl(artwork)} alt="" width="56" height="56"
        loading="lazy" decoding="async" draggable="false" />}
  </span>;
}
