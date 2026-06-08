import { useCallback, useState } from 'react';
import { buildPublicBookingPayload } from '../utils/bookingSubmission';

export function useBookingFlowSubmission({
  activeDate,
  canSubmitBooking,
  collectClientEmail,
  collectClientName,
  collectClientNotes,
  collectClientPhone,
  emailOptInEnabled,
  formData,
  isPreview,
  isWaitlistMode,
  onComplete,
  selectedAvailabilityStaff,
  selectedHostedPaymentOption,
  selectedManualPaymentOption,
  selectedService,
  selectedStaffId,
  selectedTime,
  setPaymentCheckout,
  setStep,
  setSubmittedBooking,
  staffAssignmentMode
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleAction = useCallback(async () => {
    if (isPreview) {
      setSubmittedBooking({
        bookingId: 'Preview',
        paymentReference: 'Preview'
      });
      setStep(selectedHostedPaymentOption ? 'payment' : 'success');
      return;
    }

    if (!canSubmitBooking) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const completed = await onComplete(
        buildPublicBookingPayload({
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
        }),
        activeDate.full,
        isWaitlistMode ? 'Waitlist' : selectedTime,
        isWaitlistMode ? 'waitlist' : 'pending',
        activeDate.localDateStr
      );
      if (completed === false) {
        setSubmitError('Booking could not be sent. Please try again.');
        return;
      }
      setSubmittedBooking(completed && typeof completed === 'object' ? completed : null);
      setPaymentCheckout({ checkoutUrl: '', error: '', isStarting: false });
      setStep(selectedHostedPaymentOption ? 'payment' : 'success');
    } catch (error) {
      console.error(error);
      setSubmitError('Booking could not be sent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeDate,
    canSubmitBooking,
    collectClientEmail,
    collectClientName,
    collectClientNotes,
    collectClientPhone,
    emailOptInEnabled,
    formData,
    isPreview,
    isWaitlistMode,
    onComplete,
    selectedAvailabilityStaff,
    selectedHostedPaymentOption,
    selectedManualPaymentOption,
    selectedService,
    selectedStaffId,
    selectedTime,
    setPaymentCheckout,
    setStep,
    setSubmittedBooking,
    staffAssignmentMode
  ]);

  return {
    handleAction,
    isSubmitting,
    submitError
  };
}
