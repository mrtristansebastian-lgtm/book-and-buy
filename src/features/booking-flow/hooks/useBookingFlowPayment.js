import { useEffect, useMemo, useState } from 'react';
import {
  getPaymentOptionsForCheckout,
  isHostedPaymentOption,
  parseCheckoutAmountToCents
} from '../utils/checkoutUtils';

export function useBookingFlowPayment({
  formData,
  selectedManualPayment,
  selectedService,
  setSelectedManualPayment,
  setStep,
  settings,
  submittedBooking
}) {
  const [paymentCheckout, setPaymentCheckout] = useState({ checkoutUrl: '', error: '', isStarting: false });
  const amountInCents = useMemo(() => (
    parseCheckoutAmountToCents(selectedService?.price, selectedService?.priceType)
  ), [selectedService?.price, selectedService?.priceType]);
  const paymentOptions = useMemo(() => {
    const options = Array.isArray(settings.paymentOptions) && settings.paymentOptions.length
      ? settings.paymentOptions
      : (Array.isArray(settings.manualPaymentOptions) ? settings.manualPaymentOptions : []);
    return getPaymentOptionsForCheckout({ options, amountInCents });
  }, [amountInCents, settings.manualPaymentOptions, settings.paymentOptions]);
  const selectedManualPaymentOption = paymentOptions.find(option => option.id === selectedManualPayment) || null;
  const selectedHostedPaymentOption = selectedManualPaymentOption && isHostedPaymentOption(selectedManualPaymentOption)
    ? selectedManualPaymentOption
    : null;

  useEffect(() => {
    if (selectedManualPayment && !paymentOptions.some(option => option.id === selectedManualPayment)) {
      setSelectedManualPayment('');
    }
  }, [paymentOptions, selectedManualPayment, setSelectedManualPayment]);

  const buildPaymentReturnUrl = (status) => {
    if (typeof window === 'undefined') return '';
    const route = window.location.hash.split('?')[0] || `#/book/${settings.slug || ''}`;
    return `${window.location.origin}${window.location.pathname}${window.location.search}${route}?booking=${encodeURIComponent(submittedBooking?.bookingId || '')}&paymentStatus=${status}`;
  };

  const handleStartHostedPayment = async () => {
    if (!selectedHostedPaymentOption || !submittedBooking?.bookingId) {
      setStep('success');
      return;
    }
    if (paymentCheckout.checkoutUrl) {
      window.location.href = paymentCheckout.checkoutUrl;
      return;
    }
    setPaymentCheckout({ checkoutUrl: '', error: '', isStarting: true });
    try {
      const { appId, functions, httpsCallable } = await import('../../../services/firebase');
      if (!functions || !httpsCallable) {
        throw new Error('Secure payment is not available yet.');
      }
      const initiatePayment = httpsCallable(functions, 'initiatePayment');
      const result = await initiatePayment({
        appId,
        businessId: settings.ownerId,
        gatewayType: selectedHostedPaymentOption.gatewayType || selectedHostedPaymentOption.id,
        amountInCents,
        currency: settings.currency || 'ZAR',
        bookingId: submittedBooking.bookingId,
        description: selectedService?.name || 'Build A Booking payment',
        customerEmail: formData.email || '',
        customerName: formData.name || 'Client',
        successUrl: buildPaymentReturnUrl('success'),
        cancelUrl: buildPaymentReturnUrl('cancelled')
      });
      const checkoutUrl = result?.data?.checkoutUrl || '';
      if (!checkoutUrl) {
        throw new Error('Payment provider did not return a checkout link.');
      }
      setPaymentCheckout({ checkoutUrl, error: '', isStarting: false });
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      setPaymentCheckout({
        checkoutUrl: '',
        isStarting: false,
        error: error?.message || 'Payment could not be started. You can retry or finish later.'
      });
    }
  };

  return {
    amountInCents,
    handleStartHostedPayment,
    paymentCheckout,
    paymentOptions,
    selectedHostedPaymentOption,
    selectedManualPaymentOption,
    setPaymentCheckout
  };
}
