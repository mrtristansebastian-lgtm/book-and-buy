/** Do not advertise publication until the public write succeeds. Keep newer edits intact. */
export async function publishProfileDraft(workspace, { ownerId, publish, markPublished }) {
  if (workspace.isDemo) return { ok: false, localOnly: true, reason: 'Demo saved on this device. No public profile was changed.' };
  if (!String(workspace.brandName || '').trim() || !String(workspace.slug || '').trim()) {
    return { ok: false, reason: 'Add a business name and profile address in Business settings before publishing.' };
  }
  const snapshot = { ...workspace, ownerId: ownerId || workspace.ownerId,
    publishedAt: Date.now(), website: { ...workspace.website, published: true } };
  const result = await publish(snapshot);
  if (result?.ok === true) markPublished(snapshot.publishedAt);
  return result;
}
