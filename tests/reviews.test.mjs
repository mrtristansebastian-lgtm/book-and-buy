import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrustpilotReviews, fetchTrustpilotReviews } from '../functions/reviewProviders.js';

const review = { id: '507f191e810c19729de860ea', stars: 2, text: 'An honest review', title: 'Feedback', consumer: { displayName: 'Alex' }, createdAt: '2026-10-02T09:00:00Z' };
test('review normalization preserves ratings, source links and wording', () => {
  const rows = normalizeTrustpilotReviews({ reviews: [review, { ...review, stars: 9 }, { ...review, id: 'bad/url' }, { ...review, text: '' }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rating, 2);
  assert.equal(rows[0].quote, review.text);
  assert.equal(rows[0].reviewUrl, 'https://www.trustpilot.com/reviews/' + review.id);
  assert.equal(normalizeTrustpilotReviews({ reviews: Array(20).fill(review) }).length, 6);
});
test('Trustpilot blocks unlicensed and malformed requests before contacting provider', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; };
  await assert.rejects(fetchTrustpilotReviews({ businessUnitId: review.id, apiKey: 'test', fetchImpl }), /approved API/);
  await assert.rejects(fetchTrustpilotReviews({ businessUnitId: '../private', apiKey: 'test', licensed: true, fetchImpl }), /24-character/);
  assert.equal(called, false);
});
test('Trustpilot uses a secret header, bounded latest-review request and genuine failure states', async () => {
  const result = await fetchTrustpilotReviews({ businessUnitId: review.id, apiKey: 'test-key', licensed: true, fetchImpl: async (url, options) => {
    assert.equal(options.headers.apikey, 'test-key');
    assert.ok(!url.includes('test-key'));
    assert.ok(url.includes('perPage=6'));
    assert.ok(url.includes('createdat.desc'));
    return { ok: true, json: async () => ({ reviews: [review] }) };
  } });
  assert.equal(result.reviews.length, 1);
  await assert.rejects(fetchTrustpilotReviews({ businessUnitId: review.id, apiKey: 'test', licensed: true, fetchImpl: async () => ({ ok: false, status: 429 }) }), /limiting requests/);
});
