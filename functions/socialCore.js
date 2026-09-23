import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SOCIAL_COUNTER_SHARDS = 128;
export const SOCIAL_SCHEMA_VERSION = 2;

export function cleanSocialValue(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

export function cleanSocialId(value, max = 240) {
  const id = cleanSocialValue(value, max);
  if (!id || id.includes('/')) throw new Error('Invalid identifier.');
  return id;
}

export function canonicalSocialId(slug, postId) {
  const part = (value) =>
    cleanSocialValue(value, 160)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${part(slug) || 'business'}--${part(postId) || 'post'}`;
}

export function socialShardFor(value, count = SOCIAL_COUNTER_SHARDS) {
  const digest = createHash('sha256').update(String(value || 'anonymous')).digest();
  return digest.readUInt32BE(0) % count;
}

export function stableSocialKey(...parts) {
  return createHash('sha256')
    .update(parts.map((part) => String(part || '')).join('|'))
    .digest('hex');
}

export function socialMutationId(value) {
  const id = cleanSocialValue(value, 100);
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) throw new Error('A valid mutationId is required.');
  return id;
}

export function rankExplorePost(post, nowMs = Date.now()) {
  const ageHours = Math.max(0, (nowMs - Number(post.publishedAtMs || post.createdAtMs || nowMs)) / 3_600_000);
  const freshness = Math.exp(-ageHours / 72);
  const counts = post.counts || {};
  const engagement = Math.min(
    1,
    (Number(counts.likes || 0) + Number(counts.comments || 0) * 3 + Number(counts.shares || 0) * 4) /
      Math.max(20, Number(post.impressionCount || 0) || 200)
  );
  const categoryAffinity = Math.max(0, Math.min(1, Number(post.categoryAffinity || 0)));
  const locality = Math.max(0, Math.min(1, Number(post.localityScore || 0)));
  const quality = Math.max(0, Math.min(1, Number(post.qualityScore ?? 0.5)));
  return Number((freshness * 0.4 + engagement * 0.25 + categoryAffinity * 0.15 + locality * 0.1 + quality * 0.1).toFixed(6));
}

export function verifyCloudflareWebhook({ header, rawBody, secret, toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000) }) {
  const values = Object.fromEntries(
    String(header || '')
      .split(',')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
  );
  const timestamp = Number(values.time || 0);
  const signature = String(values.sig1 || '');
  if (!timestamp || !signature || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', String(secret || ''))
    .update(`${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '')}`)
    .digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
