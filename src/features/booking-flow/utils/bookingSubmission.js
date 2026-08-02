export function buildPublicBookingPayload({
  collectClientEmail,
  collectClientName,
  collectClientNotes,
  collectClientPhone,
  emailOptInEnabled,
  formData,
  selectedAvailabilityStaff,
  selectedManualPaymentOption,
  selectedService,
  selectedStaffId,
  staffAssignmentMode
}) {
  const scheduleType = selectedService?.scheduleType || selectedService?.bookingType || selectedService?.serviceType || 'appointment';
  return {
    ...formData,
    name: collectClientName ? formData.name : 'Client',
    phone: collectClientPhone ? formData.phone : '',
    email: collectClientEmail ? formData.email : '',
    country: formData.country || '',
    note: collectClientNotes ? formData.note : '',
    emailOptIn: Boolean(emailOptInEnabled && formData.emailOptIn),
    serviceId: selectedService?.id || '',
    serviceName: selectedService?.name || '',
    serviceDescription: selectedService?.description || '',
    servicePrice: selectedService?.price || '',
    servicePriceType: selectedService?.priceType || '',
    serviceDuration: selectedService?.duration || '',
    serviceCategory: selectedService?.category || '',
    scheduleType,
    serviceScheduleType: scheduleType,
    scheduleResourceId: selectedService?.resourceId || selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleResourceName: selectedService?.resourceLabel || selectedService?.resourceName || '',
    scheduleSessionId: selectedService?.sessionId || selectedService?.sessionLabel || '',
    scheduleSessionName: selectedService?.sessionLabel || '',
    partySize: formData.partySize || '',
    staffId: staffAssignmentMode === 'client' ? selectedStaffId : '',
    staffName: staffAssignmentMode === 'client' ? (selectedAvailabilityStaff?.name || '') : '',
    staffPhotoURL: staffAssignmentMode === 'client' ? (selectedAvailabilityStaff?.photoURL || '') : '',
    paymentMethod: selectedManualPaymentOption?.id || '',
    paymentGateway: selectedManualPaymentOption?.gatewayType || selectedManualPaymentOption?.id || '',
    paymentProviderName: selectedManualPaymentOption?.name || ''
  };
}
