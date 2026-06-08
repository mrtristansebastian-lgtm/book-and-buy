import { useMemo, useState } from 'react';
import { getLocalDateStr } from '../../../utils/dates';
import { useBookingDesk } from './useBookingDesk';

export function useBookingPageRuntime({
  safeStaffList,
  visibleBookings,
  workspaceServices
}) {
  const [bookingDeskPeriod, setBookingDeskPeriod] = useState('all');
  const [bookingCustomRange, setBookingCustomRange] = useState(() => {
    const today = getLocalDateStr(new Date());
    return { from: today, to: today };
  });
  const [bookingRangeDialogOpen, setBookingRangeDialogOpen] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('upcoming');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingSort, setBookingSort] = useState('newest');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState('all');
  const [bookingInfoDialog, setBookingInfoDialog] = useState(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualBookingServiceId, setManualBookingServiceId] = useState('custom');

  const selectedManualBookingService = useMemo(() => (
    workspaceServices.find(service => service.id === manualBookingServiceId) || null
  ), [manualBookingServiceId, workspaceServices]);

  const bookingDesk = useBookingDesk({
    bookingCustomRange,
    bookingDeskPeriod,
    bookingFilter,
    bookingPaymentFilter,
    bookingSearch,
    bookingSort,
    safeStaffList,
    visibleBookings
  });

  return {
    bookingCustomRange,
    bookingDesk,
    bookingDeskPeriod,
    bookingFilter,
    bookingInfoDialog,
    bookingPaymentFilter,
    bookingRangeDialogOpen,
    bookingRows: bookingDesk.filteredRows,
    bookingSearch,
    bookingSort,
    manualBookingOpen,
    manualBookingServiceId,
    selectedManualBookingService,
    setBookingCustomRange,
    setBookingDeskPeriod,
    setBookingFilter,
    setBookingInfoDialog,
    setBookingPaymentFilter,
    setBookingRangeDialogOpen,
    setBookingSearch,
    setBookingSort,
    setManualBookingOpen,
    setManualBookingServiceId
  };
}
