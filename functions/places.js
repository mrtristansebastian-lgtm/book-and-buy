/**
 * Google Places helpers for Cloud Functions.
 */
import { HttpsError } from 'firebase-functions/v2/https';

function mapGoogleReview(review, index) {
  const name = String(
    review?.authorAttribution?.displayName || review?.author_name || review?.authorName || ''
  ).trim();
  const quote = String(
    review?.text?.text || review?.originalText?.text || (typeof review?.text === 'string' ? review.text : '') || review?.quote || ''
  ).trim();
  const rating = Math.max(0, Math.min(5, Number(review?.rating) || 0));
  const time = review?.publishTime || review?.time || index;
  return {
    id: `gplace-${time}-${index}`,
    quote,
    name: name || 'Google reviewer',
    rating,
    source: 'google',
    authorUrl: String(review?.authorAttribution?.uri || ''),
    reviewUrl: String(review?.googleMapsUri || ''),
    publishedAt: String(review?.publishTime || '')
  };
}

/**
 * Fetch reviews through Places API (New). The key is server-only and restricted
 * to places.googleapis.com in Google API Keys.
 * @param {{ placeId: string, apiKey: string }} params
 */
export async function fetchPlaceReviews({ placeId, apiKey, fetchImpl = fetch }) {
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

  const response = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'displayName,rating,reviews,googleMapsUri,attributions'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    const message = String(failure?.error?.message || `Places API HTTP ${response.status}`);
    throw new HttpsError('failed-precondition', message);
  }

  const payload = await response.json();
  const rawReviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
  const reviews = rawReviews
    .map(mapGoogleReview)
    .filter((item) => item.quote && item.rating >= 1 && item.rating <= 5)
    .slice(0, 5);

  return {
    ok: true,
    placeName: String(payload?.displayName?.text || ''),
    rating: Number(payload?.rating) || null,
    placeUrl: String(payload?.googleMapsUri || ''),
    attributions: payload?.attributions || [],
    reviews
  };
}
