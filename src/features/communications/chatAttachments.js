export const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_VOICE_MAX_MS = 5 * 60 * 1000;
export const CHAT_ATTACHMENT_MAX_COUNT = 4;

export const CHAT_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
];

export const CHAT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain'
];

export const CHAT_VOICE_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a'
];

const CHAT_ALLOWED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'heic',
  'heif',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'webm',
  'm4a',
  'mp3',
  'wav',
  'ogg'
]);

const CHAT_EXTENSIONS_BY_TYPE = {
  image: new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif']),
  document: new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt']),
  voice: new Set(['webm', 'm4a', 'mp3', 'wav', 'ogg'])
};

const CHAT_MIME_TYPES_BY_TYPE = {
  image: new Set(CHAT_IMAGE_MIME_TYPES),
  document: new Set(CHAT_DOCUMENT_MIME_TYPES),
  voice: new Set(CHAT_VOICE_MIME_TYPES)
};

export const createChatAttachmentId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getFileExtension = (fileName = '') => {
  const clean = String(fileName || '').trim().toLowerCase();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot < 0 || lastDot === clean.length - 1) return '';
  return clean.slice(lastDot + 1).replace(/[^a-z0-9]/g, '');
};

export const getBaseMimeType = (mimeType = '') => String(mimeType || '').toLowerCase().split(';')[0].trim();

export const sanitizeChatFileName = (fileName = 'attachment') => {
  const clean = String(fileName || 'attachment')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+/g, '.')
    .replace(/^-+|-+$/g, '')
    .replace(/^\.+/, '')
    .slice(0, 96);
  return clean || 'attachment';
};

export const getChatAttachmentType = (file = {}) => {
  const mimeType = getBaseMimeType(file.type);
  if (CHAT_IMAGE_MIME_TYPES.includes(mimeType)) return 'image';
  if (CHAT_DOCUMENT_MIME_TYPES.includes(mimeType)) return 'document';
  if (CHAT_VOICE_MIME_TYPES.includes(mimeType)) return 'voice';
  const extension = getFileExtension(file.name);
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif'].includes(extension)) return 'image';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'].includes(extension)) return 'document';
  if (['webm', 'm4a', 'mp3', 'wav', 'ogg'].includes(extension)) return 'voice';
  return '';
};

export const validateChatAttachmentFile = (file, options = {}) => {
  if (!file) return { ok: false, error: 'Choose a file first.' };
  const name = sanitizeChatFileName(file.name || 'attachment');
  const extension = getFileExtension(name);
  const type = options.type || getChatAttachmentType(file);
  const mimeType = getBaseMimeType(file.type);
  if (
    !type ||
    !CHAT_ALLOWED_EXTENSIONS.has(extension) ||
    !CHAT_EXTENSIONS_BY_TYPE[type]?.has(extension) ||
    (mimeType && !CHAT_MIME_TYPES_BY_TYPE[type]?.has(mimeType))
  ) {
    return { ok: false, error: 'That file type is not supported here.' };
  }
  if (type === 'voice' && options.durationMs > CHAT_VOICE_MAX_MS) {
    return { ok: false, error: 'Voice notes can be up to 5 minutes.' };
  }
  if (Number(file.size || 0) > CHAT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: 'Files can be up to 25MB.' };
  }
  return { ok: true, type, name, extension };
};

export const formatChatFileSize = (size = 0) => {
  const bytes = Number(size || 0);
  if (!bytes) return '0KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
};

export const formatVoiceDuration = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const buildChatAttachmentPreviewText = (attachment = {}) => {
  const type = String(attachment.type || '').toLowerCase();
  if (type === 'voice') return `Voice note · ${formatVoiceDuration(attachment.durationMs)}`;
  if (type === 'image') return 'Photo';
  if (type === 'document') return `Document${attachment.name ? `: ${attachment.name}` : ''}`;
  return 'Attachment';
};

export const getMessagePreviewText = (message = {}) => {
  const cleanText = String(message.text || '').trim();
  if (cleanText) return cleanText;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  if (!attachments.length) return '';
  if (attachments.length === 1) return buildChatAttachmentPreviewText(attachments[0]);
  return `${attachments.length} attachments`;
};

export const createStoredChatAttachment = (pendingAttachment = {}, uploadResult = {}) => ({
  id: pendingAttachment.id || createChatAttachmentId(),
  type: pendingAttachment.type || 'document',
  mimeType: pendingAttachment.mimeType || pendingAttachment.file?.type || '',
  name: sanitizeChatFileName(pendingAttachment.name || pendingAttachment.file?.name || 'attachment'),
  size: Number(pendingAttachment.size || pendingAttachment.file?.size || 0),
  url: uploadResult.url || '',
  path: uploadResult.path || '',
  durationMs: Number(pendingAttachment.durationMs || 0),
  createdAtMs: Date.now()
});
