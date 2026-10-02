export const MAX_VOICE_DURATION_MS = 300000;

export function mediaDurationSeconds(duration, fallbackMs = 0) {
  return Number.isFinite(duration) && duration > 0 ? duration : Math.max(0, Number(fallbackMs) || 0) / 1000;
}

export function chatAttachmentMetadata(file, now = Date.now()) {
  const mime = String(file.type || '').split(';')[0].trim().toLowerCase();
  const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'voice' : 'file';
  return { id: `att-${now}`, kind, type: kind === 'file' ? 'document' : kind,
    name: String(file.name || 'attachment').slice(0, 120), mime, mimeType: mime,
    durationMs: 0, createdAtMs: now, size: file.size };
}
