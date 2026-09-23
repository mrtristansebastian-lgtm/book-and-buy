import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { canonicalSocialId, SOCIAL_SCHEMA_VERSION, socialShardFor, stableSocialKey } from '../socialCore.js';

if (!getApps().length) initializeApp();
const db = getFirestore();
const APP_ID = process.env.APP_ID || 'book-and-buy-v1';
const ROOT = `artifacts/${APP_ID}`;
const apply = process.argv.includes('--apply');

function canonicalPost(workspace, post) {
  const slug = String(workspace.slug || '').trim().toLowerCase();
  const legacyId = String(post.id || stableSocialKey(slug, post.createdAt || Date.now()).slice(0, 20));
  const id = canonicalSocialId(slug, legacyId);
  const type = ['image', 'video', 'vertical', 'text'].includes(post.type) ? post.type : 'text';
  const status = ['draft', 'scheduled', 'published', 'archived'].includes(post.status)
    ? post.status
    : post.published === false ? 'draft' : 'published';
  const title = type === 'image' ? '' : String(post.title || '').slice(0, 240);
  const caption = String(post.caption || '').slice(0, 5000);
  const createdAtMs = Number(post.createdAt || post.createdAtMs || Date.now());
  return {
    id,
    legacyId,
    ownerId: String(workspace.ownerId || ''),
    businessSlug: slug,
    businessName: String(workspace.brandName || workspace.name || '').slice(0, 160),
    businessLogoUrl: String(workspace.website?.logoUrl || workspace.logoUrl || '').slice(0, 1000),
    type,
    title,
    caption,
    mediaUrl: String(post.mediaUrl || ''),
    mediaUrls: Array.isArray(post.mediaUrls) ? post.mediaUrls.slice(0, 20) : [],
    mediaItems: Array.isArray(post.mediaItems) ? post.mediaItems.slice(0, 20) : [],
    posterUrl: String(post.posterUrl || ''),
    duration: String(post.duration || ''),
    durationSeconds: Number(post.durationSeconds || 0),
    exploreMainCategoryId: String(post.exploreMainCategoryId || ''),
    exploreSubcategoryId: String(post.exploreSubcategoryId || ''),
    tags: Array.isArray(post.tags) ? post.tags.slice(0, 30) : [],
    location: String(post.location || ''),
    locationPlaceId: String(post.locationPlaceId || ''),
    locationLat: Number(post.locationLat || 0),
    locationLng: Number(post.locationLng || 0),
    status,
    moderationState: String(post.moderationState || 'visible'),
    scheduledAtMs: Number(post.scheduledAtMs || 0),
    publishedAtMs: Number(post.publishedAtMs || (status === 'published' ? createdAtMs : 0)),
    archivedAtMs: Number(post.archivedAtMs || 0),
    createdAtMs,
    updatedAtMs: Number(post.updatedAtMs || createdAtMs),
    schemaVersion: SOCIAL_SCHEMA_VERSION,
    version: 1,
    counts: {
      likes: Number(post.counts?.likes || post.likeCount || 0),
      comments: Number(post.counts?.comments || post.commentCount || 0),
      shares: Number(post.counts?.shares || post.shareCount || 0)
    },
    searchText: [workspace.brandName, title, caption, ...(post.tags || [])].join(' ').toLowerCase(),
    migrationVersion: SOCIAL_SCHEMA_VERSION
  };
}

async function commitWrites(writes) {
  if (!apply || !writes.length) return;
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    writes.slice(index, index + 400).forEach(({ ref, data, merge = true }) => batch.set(ref, data, { merge }));
    await batch.commit();
  }
}

async function main() {
  const writes = [];
  const workspaces = [];
  const ownerConfigs = await db.collectionGroup('config').get();
  ownerConfigs.docs.filter((entry) => entry.id === 'settings' && entry.ref.path.startsWith(`${ROOT}/users/`)).forEach((entry) => {
    workspaces.push({ ...entry.data(), ownerId: entry.ref.parent.parent?.id || entry.data().ownerId || '' });
  });
  const publicWorkspaces = await db.collection(`${ROOT}/public/data/workspaces`).get();
  publicWorkspaces.docs.forEach((entry) => {
    if (!workspaces.some((workspace) => workspace.slug === entry.id)) workspaces.push({ ...entry.data(), slug: entry.id });
  });

  let sourcePosts = 0;
  const canonicalIds = new Set();
  const shardCounts = new Map();
  workspaces.forEach((workspace) => {
    (Array.isArray(workspace.socialPosts) ? workspace.socialPosts : []).forEach((post) => {
      sourcePosts += 1;
      const record = canonicalPost(workspace, post);
      canonicalIds.add(record.id);
      writes.push({ ref: db.doc(`${ROOT}/socialPosts/${record.id}`), data: record });
    });
  });

  const profiles = await db.collection(`${ROOT}/userProfiles`).get();
  let reactions = 0;
  let saves = 0;
  let follows = 0;
  let comments = 0;
  profiles.docs.forEach((entry) => {
    const profile = entry.data();
    const uid = entry.id;
    Object.entries(profile.reactionsByKey || {}).forEach(([legacyKey, reaction]) => {
      const split = legacyKey.indexOf(':');
      if (split < 1) return;
      const postId = canonicalSocialId(legacyKey.slice(0, split), legacyKey.slice(split + 1));
      reactions += 1;
      writes.push({ ref: db.doc(`${ROOT}/socialPosts/${postId}/reactions/${uid}`), data: { uid, reaction, active: true, migratedAtMs: Date.now() } });
      const shardPath = `${ROOT}/socialPosts/${postId}/counterShards/${String(socialShardFor(uid)).padStart(3, '0')}`;
      shardCounts.set(shardPath, Number(shardCounts.get(shardPath) || 0) + 1);
    });
    (profile.savedKeys || []).forEach((legacyKey) => {
      const split = String(legacyKey).indexOf(':');
      if (split < 1) return;
      const postId = canonicalSocialId(String(legacyKey).slice(0, split), String(legacyKey).slice(split + 1));
      saves += 1;
      writes.push({ ref: db.doc(`${ROOT}/userProfiles/${uid}/savedPosts/${postId}`), data: { postId, migratedAtMs: Date.now() } });
    });
    (profile.followedSlugs || []).forEach((slug) => {
      follows += 1;
      writes.push({ ref: db.doc(`${ROOT}/userProfiles/${uid}/following/${String(slug)}`), data: { slug: String(slug), migratedAtMs: Date.now() } });
    });
    Object.entries(profile.commentsByKey || {}).forEach(([legacyKey, rows]) => {
      const split = legacyKey.indexOf(':');
      if (split < 1 || !Array.isArray(rows)) return;
      const postId = canonicalSocialId(legacyKey.slice(0, split), legacyKey.slice(split + 1));
      rows.forEach((comment, index) => {
        comments += 1;
        const commentId = stableSocialKey(uid, postId, comment.id || index, comment.at || '').slice(0, 48);
        writes.push({ ref: db.doc(`${ROOT}/socialPosts/${postId}/comments/${commentId}`), data: {
          id: commentId,
          postId,
          authorUid: uid,
          authorName: String(comment.author || profile.displayName || 'Client'),
          body: String(comment.body || comment.text || '').slice(0, 2000),
          parentId: '',
          moderationState: 'visible',
          createdAtMs: Number(comment.at || Date.now()),
          migratedAtMs: Date.now()
        } });
      });
    });
    writes.push({ ref: db.doc(`${ROOT}/socialMigrationParity/users_${uid}`), data: {
      uid, version: SOCIAL_SCHEMA_VERSION, reactions: Object.keys(profile.reactionsByKey || {}).length,
      saves: (profile.savedKeys || []).length, follows: (profile.followedSlugs || []).length,
      comments: Object.values(profile.commentsByKey || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0),
      checkedAtMs: Date.now(), applied: apply
    } });
  });
  shardCounts.forEach((likes, path) => {
    writes.push({ ref: db.doc(path), data: { likes, migrationVersion: SOCIAL_SCHEMA_VERSION } });
  });
  writes.push({ ref: db.doc(`${ROOT}/socialMigrationParity/summary_v${SOCIAL_SCHEMA_VERSION}`), data: {
    version: SOCIAL_SCHEMA_VERSION, sourcePosts, canonicalPosts: canonicalIds.size, reactions, saves, follows, comments,
    workspaceCount: workspaces.length, profileCount: profiles.size, checkedAtMs: Date.now(), applied: apply
  } });
  await commitWrites(writes);
  console.log(JSON.stringify({ apply, sourcePosts, canonicalPosts: canonicalIds.size, reactions, saves, follows, comments, writes: writes.length }, null, 2));
  if (!apply) console.log('Dry run only. Re-run with --apply after reviewing the parity totals.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
