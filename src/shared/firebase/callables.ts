import { httpsCallable } from 'firebase/functions';
import { callableNames } from './paths';
import { getFirebase } from './client';

async function callCallable<TReq extends object, TRes>(
  name: string,
  payload: TReq
): Promise<TRes> {
  const firebase = getFirebase();
  if (!firebase) {
    throw new Error(
      `Firebase is not configured. Set VITE_FIREBASE_CONFIG in .env.local before calling ${name}.`
    );
  }
  const fn = httpsCallable<TReq, TRes>(firebase.functions, name);
  const result = await fn(payload);
  return result.data;
}

export const firebaseCallables = {
  adjustInventory: (payload: object) => callCallable<object, any>('adjustInventory', payload),
  getPublicCommerceContext: (payload: object) => callCallable<object, any>('getPublicCommerceContext', payload),
  quotePublicCommerce: (payload: object) => callCallable<object, any>('quotePublicCommerce', payload),
  updateOwnerProductOrder: (payload: object) => callCallable<object, any>('updateOwnerProductOrder', payload),
  getPurchaseReview: (payload: object) => callCallable<object, any>('getPurchaseReview', payload),
  submitPurchaseReview: (payload: object) => callCallable<object, any>('submitPurchaseReview', payload),
  getPublicPlatformReviews: (payload: object) => callCallable<object, any>('getPublicPlatformReviews', payload),
  getPublicGoogleReviews: (payload: object) => callCallable<object, any>('getPublicGoogleReviews', payload),
  manageBusinessDomain: (payload: object) => callCallable<object, any>('manageBusinessDomain', payload),
  resolveBusinessDomain: (payload: object) => callCallable<object, { slug: string | null }>('resolveBusinessDomain', payload),
  getBookingRescheduleContext: (payload: object) => callCallable<object, any>('getBookingRescheduleContext', payload),
  respondToBookingReschedule: (payload: object) => callCallable<object, any>('respondToBookingReschedule', payload),
  getPublicPaymentOptions: (payload: object) =>
    callCallable(callableNames.getPublicPaymentOptions, payload),
  getPublicServiceAvailability: (payload: object) =>
    callCallable(callableNames.getPublicServiceAvailability, payload),
  createPublicBookingRequest: (payload: object) =>
    callCallable(callableNames.createPublicBookingRequest, payload),
  createOwnerBookingRequest: (payload: object) =>
    callCallable(callableNames.createOwnerBookingRequest, payload),
  initiatePayment: (payload: object) => callCallable(callableNames.initiatePayment, payload),
  confirmPaymentReturn: (payload: object) =>
    callCallable(callableNames.confirmPaymentReturn, payload),
  disconnectPaymentGateway: (payload: object) =>
    callCallable(callableNames.disconnectPaymentGateway, payload),
  markManualBookingPaid: (payload: object) =>
    callCallable(callableNames.markManualBookingPaid, payload),
  savePaymentGatewaySettings: (payload: object) =>
    callCallable(callableNames.savePaymentGatewaySettings, payload),
  createPublicProductOrder: (payload: object) =>
    callCallable(callableNames.createPublicProductOrder, payload),
  getGooglePlaceReviews: (payload: { placeId: string }) =>
    callCallable<{ placeId: string }, {
      ok: boolean;
      placeName?: string;
      rating?: number | null;
      reviews: Array<{ id: string; quote: string; name: string; rating: number }>;
    }>(callableNames.getGooglePlaceReviews, payload)
};
