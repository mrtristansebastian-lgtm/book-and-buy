import { useEffect, useState } from 'react';

export function useBookingFlowLifecycle({ settings, isPreview, previewStep }) {
  const [step, setStep] = useState(() => (isPreview ? previewStep : 'select'));
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(() => Boolean(settings.features?.loadingScreen));

  useEffect(() => {
    if (!isPreview) return;
    if (['select', 'cart', 'details', 'payment', 'success'].includes(previewStep)) {
      setStep(previewStep);
    }
  }, [isPreview, previewStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.location.hash.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const bookingId = params.get('booking');
    const paymentStatus = params.get('paymentStatus');
    if (!bookingId || !paymentStatus) return;
    setSubmittedBooking({
      bookingId,
      paymentStatus
    });
    setStep('success');
  }, []);

  useEffect(() => {
    if (settings.features?.loadingScreen) {
      setIsInitialLoading(true);
      const t = setTimeout(() => setIsInitialLoading(false), 1500);
      return () => clearTimeout(t);
    }
    setIsInitialLoading(false);
  }, [settings.features?.loadingScreen, isPreview]);

  return {
    isInitialLoading,
    setStep,
    setSubmittedBooking,
    step,
    submittedBooking
  };
}
