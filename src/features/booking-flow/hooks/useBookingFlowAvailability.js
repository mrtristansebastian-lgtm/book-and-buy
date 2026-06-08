import { useEffect, useMemo, useState } from 'react';
import { previewTimeSlots } from '../config/bookingFlowConfig';
import { getPublicStaffOptions } from '../utils/bookingFlowUtils';

const emptyAvailability = { loading: false, times: null, staffOptions: [], unavailableReason: '' };

export function useBookingFlowAvailability({
  activeDate,
  availableTimesForActiveDate,
  isPreview,
  selectedService,
  selectedStaffId,
  setSelectedStaffId,
  settings,
  staffAssignmentMode
}) {
  const [serviceAvailability, setServiceAvailability] = useState(emptyAvailability);
  const publicStaffOptions = useMemo(() => getPublicStaffOptions({
    selectedService,
    publicStaff: settings.publicStaff
  }), [selectedService, settings.publicStaff]);
  const serviceStaffOptions = staffAssignmentMode === 'client'
    ? (serviceAvailability.staffOptions.length ? serviceAvailability.staffOptions : publicStaffOptions)
    : [];
  const selectedAvailabilityStaff = serviceStaffOptions.find(staff => staff.id === selectedStaffId) || null;
  const serviceAwareAvailabilityEnabled = Boolean(
    !isPreview &&
    settings.availabilityRules?.enabled !== false &&
    settings.ownerId &&
    settings.slug &&
    selectedService?.id &&
    activeDate?.localDateStr
  );
  const isPreviewTimePlaceholder = Boolean(isPreview && availableTimesForActiveDate.length === 0);
  const displayTimesForActiveDate = serviceAwareAvailabilityEnabled
    ? (serviceAvailability.loading ? [] : (serviceAvailability.times || []))
    : (availableTimesForActiveDate.length > 0 ? availableTimesForActiveDate : (isPreview ? previewTimeSlots : []));
  const isWaitlistMode = !serviceAvailability.loading && !isPreviewTimePlaceholder && displayTimesForActiveDate.length === 0 && settings.features?.waitlist;

  useEffect(() => {
    if (staffAssignmentMode !== 'client') setSelectedStaffId('');
  }, [setSelectedStaffId, staffAssignmentMode]);

  useEffect(() => {
    if (staffAssignmentMode !== 'client') return;
    if (!serviceStaffOptions.length) {
      if (selectedStaffId) setSelectedStaffId('');
      return;
    }
    if (!selectedStaffId || !serviceStaffOptions.some(staff => staff.id === selectedStaffId)) {
      setSelectedStaffId(serviceStaffOptions[0].id);
    }
  }, [selectedStaffId, serviceStaffOptions, setSelectedStaffId, staffAssignmentMode]);

  useEffect(() => {
    let cancelled = false;
    if (!serviceAwareAvailabilityEnabled) {
      setServiceAvailability(emptyAvailability);
      return () => { cancelled = true; };
    }
    setServiceAvailability(prev => ({ ...prev, loading: true, unavailableReason: '' }));
    const refreshAvailability = async () => {
      try {
        const { appId, functions, httpsCallable } = await import('../../../services/firebase');
        if (!functions || !httpsCallable) {
          throw new Error('Firebase Functions are not configured.');
        }
        const callable = httpsCallable(functions, 'getPublicServiceAvailability');
        const result = await callable({
          appId,
          workspaceSlug: settings.slug,
          dateKey: activeDate.localDateStr,
          staffId: staffAssignmentMode === 'client' ? selectedStaffId : '',
          service: {
            serviceId: selectedService.id,
            serviceDuration: selectedService.duration || ''
          }
        });
        if (cancelled) return;
        const data = result?.data || {};
        const staffOptions = Array.isArray(data.staffOptions) ? data.staffOptions : [];
        setServiceAvailability({
          loading: false,
          times: Array.isArray(data.times) ? data.times : [],
          staffOptions,
          unavailableReason: data.unavailableReason || ''
        });
        if (staffAssignmentMode === 'client') {
          if (!selectedStaffId && staffOptions[0]?.id) {
            setSelectedStaffId(staffOptions[0].id);
          } else if (selectedStaffId && !staffOptions.some(staff => staff.id === selectedStaffId)) {
            setSelectedStaffId(staffOptions[0]?.id || '');
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setServiceAvailability({
            loading: false,
            times: availableTimesForActiveDate,
            staffOptions: [],
            unavailableReason: 'Times could not refresh. The business will verify your request.'
          });
        }
      }
    };
    refreshAvailability();
    return () => { cancelled = true; };
  }, [
    activeDate?.localDateStr,
    availableTimesForActiveDate,
    selectedService?.duration,
    selectedService?.id,
    selectedStaffId,
    serviceAwareAvailabilityEnabled,
    setSelectedStaffId,
    settings.slug,
    staffAssignmentMode
  ]);

  return {
    displayTimesForActiveDate,
    isPreviewTimePlaceholder,
    isWaitlistMode,
    selectedAvailabilityStaff,
    serviceAvailability,
    serviceAwareAvailabilityEnabled,
    serviceStaffOptions
  };
}
