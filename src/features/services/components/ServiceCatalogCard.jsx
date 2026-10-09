import { BusinessCatalogCard } from '../../../shared/ui/BusinessCatalogCard';
import { formatServicePrice, formatServiceCardMeta, formatServiceSpotsLabel, getServiceActiveVariants } from '../../../utils/services';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { serviceFacts, getServiceBookingFormat } from '../../../../functions/serviceTemplates';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { Clock3, CalendarDays, Layers3, Users, SlidersHorizontal } from 'lucide-react';

export function ServiceCatalogCard({ service, onView, onEdit, bookings = [] }) {
  const isClass = getServiceScheduleType(service) === 'class_session';
  const timing = formatServiceCardMeta(service);
  const options = getServiceActiveVariants(service).length;
  const facts = [
    timing && { icon: isClass ? CalendarDays : Clock3, label: isClass ? 'Session' : 'Duration', value: timing },
    isClass ? { icon: Users, label: 'Availability', value: formatServiceSpotsLabel(service, bookings) } : options > 0 ? { icon: Layers3, label: 'Packages', value: `${options} ${options === 1 ? 'option' : 'options'}` } : null,
    ...serviceFacts(service).slice(0, 1).map(value => ({ icon: SlidersHorizontal, value }))
  ].filter(Boolean);
  return <BusinessCatalogCard name={service.name} image={service.imageUrls?.[0]} price={formatServicePrice(service)}
    kind={getServiceBookingFormat(service) === 'event' ? 'Event' : isClass ? 'Spot' : 'Slot'} summary={service.description} category={getCatalogCategory(service)} facts={facts}
    annotation={service.active === false ? 'Hidden' : 'Active'}
    onView={() => onView?.(service)} onEdit={onEdit ? () => onEdit(service) : undefined} />;
}
