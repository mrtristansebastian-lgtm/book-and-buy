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
    }>(callableNames.getGooglePlaceReviews, payload),
  socialToggleReaction: (payload: object) => callCallable(callableNames.socialToggleReaction, payload),
  socialToggleSave: (payload: object) => callCallable(callableNames.socialToggleSave, payload),
  socialCreateComment: (payload: object) => callCallable(callableNames.socialCreateComment, payload),
  socialToggleCommentLike: (payload: object) => callCallable(callableNames.socialToggleCommentLike, payload),
  socialDeleteComment: (payload: object) => callCallable(callableNames.socialDeleteComment, payload),
  socialModerateComment: (payload: object) => callCallable(callableNames.socialModerateComment, payload),
  socialRecordShare: (payload: object) => callCallable(callableNames.socialRecordShare, payload),
  socialFollowBusiness: (payload: object) => callCallable(callableNames.socialFollowBusiness, payload),
  socialMarkNotificationsRead: (payload: object) => callCallable(callableNames.socialMarkNotificationsRead, payload),
  socialUpsertPost: (payload: object) => callCallable(callableNames.socialUpsertPost, payload),
  socialDeletePost: (payload: object) => callCallable(callableNames.socialDeletePost, payload),
  socialSearch: (payload: object) => callCallable(callableNames.socialSearch, payload)
};
