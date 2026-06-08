import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, functions, isFirebaseConfigured } from '../../../services/firebase';
import { makeOwnerNotification, NOTIFICATION_TYPES } from '../../../services/notifications';
import {
  buildOwnerBookingIdempotencyKey,
  buildPublicBookingIdempotencyKey,
  createBookingRecordFromFlow,
  createManualBookingRecordFromChat,
  createManualBookingRecordFromForm
} from '../utils/bookingActionHelpers';

export function createBookingSubmissionActions({
  createOwnerNotification,
  publicSlug,
  publicWorkspace,
  setBookingFilter,
  setBookingsAndCache,
  setManualBookingOpen,
  setManualBookingServiceId,
  settings,
  showToast,
  user,
  workspaceOwnerId,
  workspaceServices
}) {
  const directSaveOwnerBooking = async (bookingRecord, notificationMeta = {}) => {
    const bookingRef = await FirebaseSDK.addDoc(FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'bookings'), bookingRecord);
    await createOwnerNotification(makeOwnerNotification({
      type: NOTIFICATION_TYPES.BOOKING_REQUEST,
      title: notificationMeta.title || `Manual booking added for ${bookingRecord.clientName}`,
      body: notificationMeta.body || `${bookingRecord.serviceName ? `${bookingRecord.serviceName} / ` : ''}${bookingRecord.date} at ${bookingRecord.time}.`,
      ownerId: workspaceOwnerId,
      booking: { ...bookingRecord, id: bookingRef.id },
      bookingId: bookingRef.id,
      tab: 'bookings',
      priority: notificationMeta.priority || 'normal'
    }));
    return { ok: true, bookingId: bookingRef.id };
  };

  const saveOwnerBookingRequest = async (bookingRecord, notificationMeta = {}) => {
    if (functions && FirebaseSDK.httpsCallable) {
      try {
        const createOwnerBookingRequest = FirebaseSDK.httpsCallable(functions, 'createOwnerBookingRequest');
        const result = await createOwnerBookingRequest({
          appId,
          ownerId: workspaceOwnerId,
          idempotencyKey: buildOwnerBookingIdempotencyKey({ ownerId: workspaceOwnerId, booking: bookingRecord }),
          booking: bookingRecord
        });
        return result?.data || true;
      } catch (error) {
        const fallbackAllowed = ['functions/not-found', 'functions/unimplemented'].includes(error?.code);
        if (!fallbackAllowed) {
          console.error(error);
          if (error?.code === 'functions/already-exists') {
            showToast('That time is already held. Pick another slot.');
          } else if (error?.code === 'functions/permission-denied') {
            showToast('You do not have access to save bookings for this workspace.');
          } else {
            showToast(error?.message || 'Booking could not be saved.');
          }
          return false;
        }
        console.warn('createOwnerBookingRequest is not deployed yet; falling back to direct booking save.');
      }
    }
    return directSaveOwnerBooking(bookingRecord, notificationMeta);
  };

  const handleBookingComplete = async (formData, date, time, status, dateKey) => {
    const bookingRecord = createBookingRecordFromFlow({
      formData,
      date,
      dateKey,
      status,
      time,
      extra: {
        timestamp: Date.now(),
        noShowHistory: false
      }
    });

    if (!isFirebaseConfigured || !user) {
      setBookingsAndCache(prev => [{ id: `local-${Date.now()}`, ...bookingRecord }, ...prev]);
      return true;
    }
    try {
      return await saveOwnerBookingRequest(bookingRecord, {
        title: `New booking request from ${bookingRecord.clientName}`,
        body: `${bookingRecord.serviceName ? `${bookingRecord.serviceName} / ` : ''}${bookingRecord.date} at ${bookingRecord.time}. Review, confirm, or reply from Bookings.`,
        priority: 'high'
      });
    } catch (err) {
      console.error(err);
      showToast('Booking could not be saved.');
      return false;
    }
  };

  const handleManualBookingSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const bookingRecord = createManualBookingRecordFromForm({
      formData,
      settings,
      workspaceServices
    });

    if (!bookingRecord.clientName || !bookingRecord.dateKey || !bookingRecord.time) {
      showToast('Add a client name, date, and time first.');
      return;
    }

    if (!isFirebaseConfigured || !user) {
      setBookingsAndCache(prev => [{ id: `manual-${bookingRecord.timestamp}`, ...bookingRecord }, ...prev]);
      setManualBookingOpen(false);
      setBookingFilter('upcoming');
      form.reset();
      setManualBookingServiceId(workspaceServices[0]?.id || 'custom');
      showToast('Manual booking added.');
      return;
    }

    try {
      const saved = await saveOwnerBookingRequest(bookingRecord, {
        title: `Manual booking added for ${bookingRecord.clientName}`,
        body: `${bookingRecord.serviceName} / ${bookingRecord.date} at ${bookingRecord.time}.`,
        priority: 'normal'
      });
      if (saved === false) return;
      setManualBookingOpen(false);
      setBookingFilter('upcoming');
      form.reset();
      setManualBookingServiceId(workspaceServices[0]?.id || 'custom');
      showToast('Manual booking added.');
    } catch (error) {
      console.error(error);
      showToast('Manual booking could not be saved.');
    }
  };

  const createManualBookingFromChat = async (payload = {}) => {
    const bookingRecord = createManualBookingRecordFromChat({
      payload,
      settings,
      workspaceServices
    });

    if (!bookingRecord.clientName || !bookingRecord.dateKey || !bookingRecord.time) {
      showToast('Add a client name, date, and time first.');
      return false;
    }

    if (!isFirebaseConfigured || !user) {
      setBookingsAndCache(prev => [{ id: `manual-chat-${bookingRecord.timestamp}`, ...bookingRecord }, ...prev]);
      setBookingFilter('upcoming');
      showToast('Booking added from chat.');
      return true;
    }

    try {
      const saved = await saveOwnerBookingRequest(bookingRecord, {
        title: `Chat booking added for ${bookingRecord.clientName}`,
        body: `${bookingRecord.serviceName} / ${bookingRecord.date} at ${bookingRecord.time}.`,
        priority: 'normal'
      });
      if (saved === false) return false;
      setBookingFilter('upcoming');
      showToast('Booking added from chat.');
      return true;
    } catch (error) {
      console.error(error);
      showToast('Chat booking could not be saved.');
      return false;
    }
  };

  const handlePublicBookingComplete = async (formData, date, time, status, dateKey) => {
    if (!publicWorkspace?.ownerId) {
      showToast('Booking page is missing an owner.');
      return false;
    }
    const bookingRecord = createBookingRecordFromFlow({
      formData,
      date,
      dateKey,
      status,
      time,
      extra: {
        ownerId: publicWorkspace.ownerId,
        source: 'public-booking-page',
        workspaceSlug: publicSlug,
        workspaceName: publicWorkspace.workspaceName || publicWorkspace.brandName || '',
        timestamp: Date.now(),
        createdAt: FirebaseSDK.serverTimestamp()
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

    try {
      if (!functions || !FirebaseSDK.httpsCallable) {
        showToast('Secure booking service is not available yet.');
        return false;
      }
      const createPublicBookingRequest = FirebaseSDK.httpsCallable(functions, 'createPublicBookingRequest');
      const result = await createPublicBookingRequest({
        appId,
        workspaceSlug: publicSlug,
        idempotencyKey,
        booking: {
          clientName: bookingRecord.clientName,
          clientPhone: bookingRecord.clientPhone,
          clientEmail: bookingRecord.clientEmail,
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
  };

  return {
    createManualBookingFromChat,
    handleBookingComplete,
    handleManualBookingSubmit,
    handlePublicBookingComplete
  };
}
