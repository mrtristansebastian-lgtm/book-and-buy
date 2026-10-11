import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { formatServicePrice, formatServiceCardMeta, formatServiceSpotsLabel, getServiceActiveVariants } from '../../../utils/services';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { serviceFacts } from '../../../../functions/serviceTemplates';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { Clock3, CalendarDays, Users, SlidersHorizontal } from 'lucide-react';

export function ServiceCatalogCard({ service, onView, onEdit, bookings = [] }) {
  const isClass = getServiceScheduleType(service) === 'class_session';
  const timing = formatServiceCardMeta(service);
  const spots = formatServiceSpotsLabel(service, bookings);
  const variants = getServiceActiveVariants(service);
  const options = variants.length;
  const facts = [
    timing && { icon: isClass ? CalendarDays : Clock3, label: isClass ? 'Session' : 'Duration', value: timing },
    isClass && spots ? { icon: Users, label: 'Availability', value: spots } : null,
    ...serviceFacts(service).slice(0, 1).map(value => ({ icon: SlidersHorizontal, value }))
  ].filter(Boolean);
  return <BusinessCatalogCard name={service.name} image={service.imageUrls?.[0]} price={formatServicePrice(service)} optionCount={options}
    kind={isClass ? 'Spot' : 'Slot'} category={getCatalogCategory(service)} facts={facts}
    annotation={service.active === false ? 'Hidden' : 'Active'}
    onView={() => onView?.(service)} onEdit={onEdit ? () => onEdit(service) : undefined} />;
}
