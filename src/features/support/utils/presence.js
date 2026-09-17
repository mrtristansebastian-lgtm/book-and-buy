/** Chat activity status helpers — online / offline + optional last seen. */

export function normalizePresenceStatus(status) {
  return String(status || '').toLowerCase() === 'online' ? 'online' : 'offline';
}

/** Whether the peer chose to share activity (default: yes). */
export function isPresenceVisible(presence) {
  if (!presence || typeof presence !== 'object') return false;
  if (presence.visible === false) return false;
  if (presence.showActivityStatus === false) return false;
  return true;
}

export function formatLastSeen(lastSeenAt) {
  const ts = Number(lastSeenAt) || 0;
  if (!ts) return 'Offline';
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Last seen just now';
  if (mins === 1) return 'Last seen 1 minute ago';
  if (mins < 60) return `Last seen ${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return 'Last seen 1 hour ago';
  if (hours < 24) return `Last seen ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last seen yesterday';
  if (days < 7) return `Last seen ${days} days ago`;
  return `Last seen ${new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })}`;
}

/** Subtitle under the chat name. Empty when activity sharing is off. */
export function formatPresenceLabel(presence) {
  if (!isPresenceVisible(presence)) return '';
  if (normalizePresenceStatus(presence?.status) === 'online') return 'Online';
  return formatLastSeen(presence?.lastSeenAt);
}

export function buildPresence({
  status = 'offline',
  lastSeenAt = Date.now(),
  visible = true
} = {}) {
  return {
    status: normalizePresenceStatus(status),
    lastSeenAt: Number(lastSeenAt) || Date.now(),
    visible: visible !== false
  };
}
