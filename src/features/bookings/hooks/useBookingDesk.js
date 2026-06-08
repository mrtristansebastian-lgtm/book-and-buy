import { useMemo } from 'react';
import { Bell, CalendarCheck, Check, CheckCircle2, Clock, History, Layers } from 'lucide-react';
import { createBookingDeskModel } from '../utils/bookingDeskModel';

const bookingDeskIcons = {
  bell: Bell,
  calendarCheck: CalendarCheck,
  check: Check,
  checkCircle: CheckCircle2,
  clock: Clock,
  history: History,
  layers: Layers
};

const withBookingDeskIcons = (bookingDesk) => ({
  ...bookingDesk,
  filters: bookingDesk.filters.map(filter => ({
    ...filter,
    icon: bookingDeskIcons[filter.iconKey] || Layers
  })),
  metrics: bookingDesk.metrics.map(metric => ({
    ...metric,
    icon: bookingDeskIcons[metric.iconKey] || Layers
  }))
});

export const useBookingDesk = ({
  bookingCustomRange,
  bookingDeskPeriod,
  bookingFilter,
  bookingPaymentFilter,
  bookingSearch,
  bookingSort,
  safeStaffList = [],
  visibleBookings = []
}) => useMemo(() => withBookingDeskIcons(createBookingDeskModel({
  bookingCustomRange,
  bookingDeskPeriod,
  bookingFilter,
  bookingPaymentFilter,
  bookingSearch,
  bookingSort,
  safeStaffList,
  visibleBookings
})), [bookingDeskPeriod, bookingFilter, bookingSearch, bookingPaymentFilter, bookingSort, visibleBookings, safeStaffList, bookingCustomRange]);
