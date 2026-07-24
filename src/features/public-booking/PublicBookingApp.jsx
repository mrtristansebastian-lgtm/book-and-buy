import { useCallback, useRef } from 'react';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { usePublicBookingWorkspace } from './hooks/usePublicBookingWorkspace';
import {
  buildPublicBookingIdempotencyKey,
  createBookingRecordFromFlow
} from '../bookings/utils/bookingActionHelpers';
import { exampleModeStorageKey, guestModeStorageKey, safeLocalGet } from '../../utils/publicBookingRoute';

export default function PublicBookingApp({ publicSlug }) {
  const emptySettingsRef = useRef({});
  const publicWorkspace = usePublicBookingWorkspace({
    guestMode: safeLocalGet(guestModeStorageKey) === 'true' || safeLocalGet(exampleModeStorageKey) === 'true',
    publicSlug,
    settings: {},
    settingsRef: emptySettingsRef,
    user: null
  });

  const showToast = useCallback((message) => {
    if (message) console.warn(message);
  }, []);

  const handlePublicBookingComplete = useCallback(async (formData, date, time, status, dateKey) => {
    if (publicWorkspace.publicWorkspace?.isExamplePreview) {
      return { simulated: true, reference: `KH-${Date.now().toString(36).toUpperCase()}` };
    }
    if (!publicWorkspace.publicWorkspace?.ownerId) {
      showToast('Booking page is missing an owner.');
      return false;
    }

    try {
      const {
        appId,
        functions,
        httpsCallable,
        serverTimestamp
      } = await import('../../services/firebase');
      if (!functions || !httpsCallable) {
        showToast('Secure booking service is not available yet.');
        return false;
      }

      const bookingRecord = createBookingRecordFromFlow({
        formData,
        date,
        dateKey,
        status,
        time,
        extra: {
          ownerId: publicWorkspace.publicWorkspace.ownerId,
          source: 'public-booking-page',
          workspaceSlug: publicSlug,
          workspaceName: publicWorkspace.publicWorkspace.workspaceName || publicWorkspace.publicWorkspace.brandName || '',
          timestamp: Date.now(),
          createdAt: serverTimestamp()
        }
      });
      const idempotencyKey = buildPublicBookingIdempotencyKey({
        workspaceSlug: publicSlug,
        formData,
        dateKey: bookingRecord.dateKey,
        date: bookingRecord.date,
        time: bookingRecord.time,
        serviceId: bookingRecord.serviceId
      });
      const createPublicBookingRequest = httpsCallable(functions, 'createPublicBookingRequest');
      const result = await createPublicBookingRequest({
        appId,
        workspaceSlug: publicSlug,
        idempotencyKey,
        booking: {
          clientName: bookingRecord.clientName,
          clientPhone: bookingRecord.clientPhone,
          clientEmail: bookingRecord.clientEmail,
          clientCountry: bookingRecord.clientCountry,
          clientEmailOptIn: bookingRecord.clientEmailOptIn,
          clientBirthday: bookingRecord.clientBirthday,
          clientNote: bookingRecord.clientNote,
          serviceId: bookingRecord.serviceId,
          serviceName: bookingRecord.serviceName,
          serviceDescription: bookingRecord.serviceDescription,
          servicePrice: bookingRecord.servicePrice,
          servicePriceType: bookingRecord.servicePriceType,
          serviceDuration: bookingRecord.serviceDuration,
          serviceCategory: bookingRecord.serviceCategory,
          staffId: bookingRecord.staffId,
          staffName: bookingRecord.staffName,
          staffPhotoURL: bookingRecord.staffPhotoURL,
          paymentMethod: bookingRecord.paymentMethod,
          paymentGateway: bookingRecord.paymentGateway,
          paymentProviderName: bookingRecord.paymentProviderName,
          paymentStatus: bookingRecord.paymentStatus,
          date: bookingRecord.date,
          dateKey: bookingRecord.dateKey,
          time: bookingRecord.time,
          status: bookingRecord.status,
          notificationChannels: bookingRecord.notificationChannels
        }
      });
      return result?.data || true;
    } catch (error) {
      console.error(error);
      if (error?.code === 'functions/already-exists') {
        showToast('That time was just requested. Pick another slot.');
      } else if (error?.code === 'functions/resource-exhausted') {
        showToast('Too many attempts. Please wait a few minutes and try again.');
      } else {
        showToast(error?.message || 'Booking could not be submitted.');
      }
      return false;
    }
  }, [publicSlug, publicWorkspace.publicWorkspace, showToast]);

  const handleAddToHomeScreen = useCallback(async () => {
    const shareData = {
      title: 'Build A Booking',
      text: 'Open Build A Booking.',
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.error(error);
    }
  }, []);

  return (
    <PublicBookingPage
      error={publicWorkspace.publicError}
      loading={publicWorkspace.publicLoading}
      manualPaymentOptions={publicWorkspace.publicManualPaymentOptions}
      paymentOptions={publicWorkspace.publicPaymentOptions}
      onComplete={handlePublicBookingComplete}
      onHome={() => { window.location.href = window.location.origin; }}
      onInstallApp={handleAddToHomeScreen}
      onRetry={publicWorkspace.reloadPublicWorkspace}
      slug={publicSlug}
      workspace={publicWorkspace.publicWorkspace}
    />
  );
}
