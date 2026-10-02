import { HttpsError } from 'firebase-functions/v2/https';

export function normalizeTrustpilotReviews(payload) {
  return (Array.isArray(payload?.reviews) ? payload.reviews : []).filter((review) => /^[a-f0-9]{24}$/i.test(String(review.id)) && Number.isInteger(review.stars) && review.stars >= 1 && review.stars <= 5 && String(review.text || '').trim()).slice(0, 6).map((review) => ({
    id: `trustpilot-${review.id}`, source: 'trustpilot', quote: String(review.text).trim(), title: String(review.title || ''), name: String(review.consumer?.displayName || 'Trustpilot reviewer'), rating: review.stars, publishedAt: review.createdAt || '', reviewUrl: `https://www.trustpilot.com/reviews/${review.id}`
  }));
}

export async function fetchTrustpilotReviews({ businessUnitId, apiKey, licensed = false, fetchImpl = fetch }) {
  if (!licensed) throw new HttpsError('failed-precondition', 'Trustpilot imports require approved API and display access. Contact Book & Buy support to enable this integration.');
  if (!/^[a-f0-9]{24}$/i.test(String(businessUnitId || ''))) throw new HttpsError('invalid-argument', 'Enter a valid 24-character Trustpilot Business Unit ID.');
  if (!apiKey) throw new HttpsError('failed-precondition', 'Trustpilot API access is not configured yet. No reviews have been imported.');
  const response = await fetchImpl(`https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews?perPage=6&page=1&orderBy=createdat.desc&includeReportedReviews=false`, { headers: { apikey: apiKey }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new HttpsError(response.status === 429 ? 'resource-exhausted' : 'failed-precondition', response.status === 429 ? 'Trustpilot is limiting requests. Please try again later.' : 'Trustpilot could not return reviews. Check API access and the Business Unit ID.');
  return { ok: true, reviews: normalizeTrustpilotReviews(await response.json()) };
}
