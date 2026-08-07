export function clientInitials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatRelativeTime(at) {
  const ts = Number(at) || 0;
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMessageTime(at) {
  const ts = Number(at) || 0;
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLabel(at) {
  const ts = Number(at) || 0;
  if (!ts) return '';
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function formatPresenceLabel(presence) {
  const status = presence?.status || 'offline';
  if (status === 'online') return 'Online';
  if (status === 'away') return 'Away';
  const lastSeenAt = Number(presence?.lastSeenAt) || 0;
  if (!lastSeenAt) return 'Offline';
  const rel = formatRelativeTime(lastSeenAt);
  return rel === 'Just now' ? 'Last seen just now' : `Last seen ${rel} ago`;
}

export function formatFileSize(bytes = 0) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms = 0) {
  const total = Math.max(0, Math.round(Number(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function messagePreview(message) {
  if (!message) return '';
  if (message.type === 'system') return message.body || 'Update';
  if (message.type === 'voice') return 'Voice note';
  if (message.type === 'image') return message.body || 'Photo';
  if (message.type === 'file') {
    return message.attachments?.[0]?.name || message.body || 'File';
  }
  return message.body || '';
}

export const SUPPORT_FOCUS_KEY = 'bb-support-focus-thread';

export function setSupportFocusThread(threadId) {
  try {
    if (threadId) sessionStorage.setItem(SUPPORT_FOCUS_KEY, threadId);
  } catch {
    /* ignore */
  }
}

export function takeSupportFocusThread() {
  try {
    const id = sessionStorage.getItem(SUPPORT_FOCUS_KEY) || '';
    if (id) sessionStorage.removeItem(SUPPORT_FOCUS_KEY);
    return id;
  } catch {
    return '';
  }
}
