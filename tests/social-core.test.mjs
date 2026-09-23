import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  SOCIAL_COUNTER_SHARDS,
  canonicalSocialId,
  rankExplorePost,
  socialMutationId,
  socialShardFor,
  stableSocialKey,
  verifyCloudflareWebhook
} from '../functions/socialCore.js';
import { evaluateSocialText } from '../functions/socialSafety.js';

test('canonical social IDs are stable and URL safe', () => {
  assert.equal(canonicalSocialId('Flame & Flour', 'Post 5'), 'flame-flour--post-5');
  assert.equal(canonicalSocialId('  ', ''), 'business--post');
});

test('mutation IDs reject short or unsafe input', () => {
  assert.equal(socialMutationId('mutation_123'), 'mutation_123');
  assert.throws(() => socialMutationId('tiny'));
  assert.throws(() => socialMutationId('unsafe mutation'));
});

test('stable keys are deterministic and input-sensitive', () => {
  assert.equal(stableSocialKey('like', 'post', 'actor'), stableSocialKey('like', 'post', 'actor'));
  assert.notEqual(stableSocialKey('like', 'post', 'actor'), stableSocialKey('unlike', 'post', 'actor'));
});

test('viral actors distribute across all counter shards', () => {
  const used = new Set(Array.from({ length: 20_000 }, (_, index) => socialShardFor(`actor-${index}`)));
  assert.equal(SOCIAL_COUNTER_SHARDS, 128);
  assert.equal(used.size, SOCIAL_COUNTER_SHARDS);
});

test('Explore ranking uses the documented weighted signals', () => {
  const now = 1_800_000_000_000;
  const score = rankExplorePost({
    publishedAtMs: now,
    counts: { likes: 50, comments: 10, shares: 5 },
    impressionCount: 100,
    categoryAffinity: 1,
    localityScore: 1,
    qualityScore: 1
  }, now);
  assert.equal(score, 1);
  const stale = rankExplorePost({ publishedAtMs: now - 30 * 24 * 60 * 60_000, counts: {} }, now);
  assert.ok(stale < 0.06);
});

test('Cloudflare webhook signatures require a fresh valid HMAC', () => {
  const secret = 'test-secret';
  const rawBody = Buffer.from('{"uid":"video-1"}');
  const time = 1_800_000_000;
  const signature = createHmac('sha256', secret).update(`${time}.${rawBody.toString('utf8')}`).digest('hex');
  assert.equal(verifyCloudflareWebhook({
    header: `time=${time},sig1=${signature}`,
    rawBody,
    secret,
    nowSeconds: time
  }), true);
  assert.equal(verifyCloudflareWebhook({
    header: `time=${time},sig1=${signature}`,
    rawBody,
    secret: 'wrong-secret',
    nowSeconds: time
  }), false);
  assert.equal(verifyCloudflareWebhook({
    header: `time=${time},sig1=${signature}`,
    rawBody,
    secret,
    nowSeconds: time + 301
  }), false);
});

test('text safety allows normal posts and contains high-confidence abuse', () => {
  assert.equal(evaluateSocialText('Fresh pastries from the oven this morning.').state, 'visible');
  assert.equal(evaluateSocialText('Buy followers now https://spam.test').state, 'pending_review');
  assert.equal(evaluateSocialText('explicit content involving a minor').state, 'blocked');
});
