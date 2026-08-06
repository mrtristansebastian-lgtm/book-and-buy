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
  getPublicPaymentOptions: (payload: object) =>
    callCallable(callableNames.getPublicPaymentOptions, payload),
  getPublicServiceAvailability: (payload: object) =>
    callCallable(callableNames.getPublicServiceAvailability, payload),
  createPublicBookingRequest: (payload: object) =>
    callCallable(callableNames.createPublicBookingRequest, payload),
  createOwnerBookingRequest: (payload: object) =>
    callCallable(callableNames.createOwnerBookingRequest, payload),
  initiatePayment: (payload: object) => callCallable(callableNames.initiatePayment, payload),
  markManualBookingPaid: (payload: object) =>
    callCallable(callableNames.markManualBookingPaid, payload),
  savePaymentGatewaySettings: (payload: object) =>
    callCallable(callableNames.savePaymentGatewaySettings, payload),
  createPublicProductOrder: (payload: object) =>
    callCallable(callableNames.createPublicProductOrder, payload)
};
