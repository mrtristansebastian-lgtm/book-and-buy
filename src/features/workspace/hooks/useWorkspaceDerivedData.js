import { useMemo } from 'react';
import { normalizeServiceList } from '../../../utils/services';

export function useWorkspaceDerivedData({ settings }) {
  const workspaceServices = useMemo(
    () => normalizeServiceList(settings.services || []),
    [settings.services]
  );

  const serviceById = useMemo(
    () => new Map(workspaceServices.map(service => [service.id, service])),
    [workspaceServices]
  );

  const getBookingService = (booking = {}) => {
    if (booking.serviceName || booking.serviceId) {
      return {
        ...serviceById.get(booking.serviceId),
        serviceId: booking.serviceId,
        name: booking.serviceName || serviceById.get(booking.serviceId)?.name || '',
        description: booking.serviceDescription || serviceById.get(booking.serviceId)?.description || '',
        price: booking.servicePrice || serviceById.get(booking.serviceId)?.price || '',
        priceType: booking.servicePriceType || serviceById.get(booking.serviceId)?.priceType || '',
        duration: booking.serviceDuration || serviceById.get(booking.serviceId)?.duration || '',
        category: booking.serviceCategory || serviceById.get(booking.serviceId)?.category || ''
      };
    }
    return null;
  };

  return {
    getBookingService,
    workspaceServices
  };
}
