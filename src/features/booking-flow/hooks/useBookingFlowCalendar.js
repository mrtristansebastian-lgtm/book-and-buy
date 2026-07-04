import { useEffect, useMemo, useState } from 'react';
import {
  buildAvailableBookingDates,
  buildPreviewCalendarDates,
  getAvailableTimesForDate
} from '../utils/bookingFlowUtils';

export function useBookingFlowCalendar({ settings, isPreview }) {
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState(null);
  const [calendarDateLimit, setCalendarDateLimit] = useState(5);

  const dates = useMemo(() => buildAvailableBookingDates(settings.schedule), [settings.schedule]);
  const previewCalendarDates = useMemo(() => buildPreviewCalendarDates(), []);
  const displayDates = useMemo(() => (
    dates.length > 0 ? dates : (isPreview ? previewCalendarDates : [])
  ), [dates, isPreview, previewCalendarDates]);

  useEffect(() => {
    setSelectedDateIdx(0);
    setSelectedTime(null);
  }, [displayDates]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(max-width: 640px)');
    const syncLimit = () => setCalendarDateLimit(media.matches ? 3 : 5);
    syncLimit();
    media.addEventListener?.('change', syncLimit);
    return () => media.removeEventListener?.('change', syncLimit);
  }, []);

  const activeDate = displayDates[selectedDateIdx] || displayDates[0];
  const visibleDisplayDates = useMemo(() => (
    displayDates
      .slice(selectedDateIdx, selectedDateIdx + calendarDateLimit)
      .map((date, index) => ({ ...date, originalIndex: selectedDateIdx + index }))
  ), [calendarDateLimit, displayDates, selectedDateIdx]);
  const availableTimesForActiveDate = useMemo(() => getAvailableTimesForDate({
    activeDate,
    availabilityRules: settings.availabilityRules,
    schedule: settings.schedule,
    availableTimes: settings.availableTimes
  }), [activeDate, settings.availabilityRules, settings.schedule, settings.availableTimes]);

  return {
    activeDate,
    availableTimesForActiveDate,
    displayDates,
    selectedDateIdx,
    selectedTime,
    setSelectedDateIdx,
    setSelectedTime,
    visibleDisplayDates
  };
}
