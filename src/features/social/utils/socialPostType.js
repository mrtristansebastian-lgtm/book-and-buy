/** Resolve Social post kind for tabs and layouts. */
export function getSocialPostKind(post) {
  if (!post) return 'text';
  if (post.type === 'video') return 'video';
  if (post.type === 'text') return 'text';
  if (post.type === 'image') return 'image';
  if (post.mediaUrl) return 'image';
  return 'text';
}

export function formatSocialTime(createdAt) {
  const ts = Number(createdAt) || 0;
  if (!ts) return '';
  const delta = Date.now() - ts;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
