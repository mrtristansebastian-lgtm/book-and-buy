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
  return {
    ...formData,
    name: collectClientName ? formData.name : 'Client',
    phone: collectClientPhone ? formData.phone : '',
    email: collectClientEmail ? formData.email : '',
    note: collectClientNotes ? formData.note : '',
    emailOptIn: Boolean(emailOptInEnabled && formData.emailOptIn),
    serviceId: selectedService?.id || '',
    serviceName: selectedService?.name || '',
    serviceDescription: selectedService?.description || '',
    servicePrice: selectedService?.price || '',
    servicePriceType: selectedService?.priceType || '',
    serviceDuration: selectedService?.duration || '',
    serviceCategory: selectedService?.category || '',
    staffId: staffAssignmentMode === 'client' ? selectedStaffId : '',
    staffName: staffAssignmentMode === 'client' ? (selectedAvailabilityStaff?.name || '') : '',
    staffPhotoURL: staffAssignmentMode === 'client' ? (selectedAvailabilityStaff?.photoURL || '') : '',
    paymentMethod: selectedManualPaymentOption?.id || '',
    paymentGateway: selectedManualPaymentOption?.gatewayType || selectedManualPaymentOption?.id || '',
    paymentProviderName: selectedManualPaymentOption?.name || ''
  };
}
