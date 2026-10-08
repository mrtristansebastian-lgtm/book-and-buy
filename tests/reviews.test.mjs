import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPlaceReviews } from '../functions/places.js';

test('Google reviews preserve original wording, ratings, authors and attribution', async () => {
  const review = { text: { text: 'An honest review' }, rating: 2, authorAttribution: { displayName: 'Alex', uri: 'https://www.google.com/maps/contrib/alex' }, googleMapsUri: 'https://www.google.com/maps/reviews/example', publishTime: '2026-10-02T09:00:00Z' };
  const result = await fetchPlaceReviews({ placeId: 'ChIJ-test', apiKey: 'test-only', fetchImpl: async () => ({ ok: true, json: async () => ({ reviews: [review, { ...review, text: { text: '' } }], attributions: [{ displayName: 'Source' }] }) }) });
  assert.equal(result.reviews.length, 1);
  assert.equal(result.reviews[0].quote, 'An honest review');
  assert.equal(result.reviews[0].source, 'google');
  assert.equal(result.reviews[0].rating, 2);
  assert.equal(result.reviews[0].name, 'Alex');
  assert.equal(result.reviews[0].reviewUrl, review.googleMapsUri);
  assert.deepEqual(result.attributions, [{ displayName: 'Source' }]);
});

test('Google rejects missing IDs and credentials without a provider request', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(fetchPlaceReviews({ placeId: '', apiKey: 'test-only', fetchImpl }), /Place ID is required/);
  await assert.rejects(fetchPlaceReviews({ placeId: 'ChIJ-test', apiKey: '', fetchImpl }), /not configured/);
  assert.equal(called, false);
});

test('Google keeps credentials in a header, caps reviews at five and reports failures', async () => {
  const result = await fetchPlaceReviews({ placeId: 'ChIJ/test', apiKey: 'test-only', fetchImpl: async (url, options) => {
    assert.ok(url.endsWith('ChIJ%2Ftest'));
    assert.ok(!url.includes('test-only'));
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-only');
    return { ok: true, json: async () => ({ reviews: Array(12).fill({ text: { text: 'Original' }, rating: 4 }) }) };
  } });
  assert.equal(result.reviews.length, 5);
  await assert.rejects(fetchPlaceReviews({ placeId: 'ChIJ-test', apiKey: 'test-only', fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Provider rate limit' } }) }) }), /Provider rate limit/);
});
