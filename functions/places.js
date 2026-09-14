/**
 * Google Places helpers for Cloud Functions.
 */
import { HttpsError } from 'firebase-functions/v2/https';

function mapGoogleReview(review, index) {
  const name = String(review?.author_name || review?.authorName || '').trim();
  const quote = String(review?.text || review?.quote || '').trim();
  const rating = Math.max(0, Math.min(5, Number(review?.rating) || 0));
  const time = review?.time || review?.publishTime || index;
  return {
    id: `gplace-${time}-${index}`,
    quote,
    name: name || 'Google reviewer',
    rating: rating || 5
  };
}

/**
 * Fetch Place Details reviews via Places API (legacy Place Details).
 * @param {{ placeId: string, apiKey: string }} params
 */
export async function fetchPlaceReviews({ placeId, apiKey }) {
  const id = String(placeId || '').trim();
  const key = String(apiKey || '').trim();
  if (!id) {
    throw new HttpsError('invalid-argument', 'Google Place ID is required.');
  }
  if (!key) {
    throw new HttpsError(
      'failed-precondition',
      'GOOGLE_PLACES_API_KEY is not configured. Set the secret and redeploy functions.'
    );
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', id);
  url.searchParams.set('fields', 'reviews,rating,name');
  url.searchParams.set('key', key);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new HttpsError('unavailable', `Places API HTTP ${response.status}`);
  }

  const payload = await response.json();
  const status = String(payload?.status || '');
  if (status !== 'OK' && status !== 'ZERO_RESULTS') {
    const message = payload?.error_message || status || 'Places request failed';
    throw new HttpsError('failed-precondition', message);
  }

  const rawReviews = Array.isArray(payload?.result?.reviews) ? payload.result.reviews : [];
  const reviews = rawReviews
    .map(mapGoogleReview)
    .filter((item) => item.quote)
    .slice(0, 6);

  return {
    ok: true,
    placeName: String(payload?.result?.name || ''),
    rating: Number(payload?.result?.rating) || null,
    reviews
  };
}
