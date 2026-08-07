import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from './client';
import { saveOwnerWorkspaceToFirestore } from './ownerWorkspace';
import { publicWorkspacePath } from './paths';
import { buildPublicWorkspaceSnapshot } from './publicSnapshot';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function sanitizeFolder(pathHint: string) {
  const allowed = new Set(['brand', 'venue', 'services', 'website', 'social', 'account-avatars']);
  const folder = String(pathHint || 'website')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return allowed.has(folder) ? folder : 'website';
}

function sanitizeFileName(name: string) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a public site image to Firebase Storage when configured + signed in.
 * Falls back to a local data URL so Pages studio still works offline/demo.
 */
export async function uploadPublicImage(file: File, pathHint = 'website') {
  if (!(file instanceof File)) {
    throw new Error('Choose an image file.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPG, or WebP).');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be under 6MB.');
  }

  const firebase = getFirebase();
  if (!firebase) {
    const url = await fileToDataUrl(file);
    return {
      ok: true as const,
      localOnly: true,
      url,
      reason: 'Saved locally until Firebase Storage is configured.'
    };
  }

  const ownerId = firebase.auth.currentUser?.uid;
  if (!ownerId) {
    const url = await fileToDataUrl(file);
    return {
      ok: true as const,
      localOnly: true,
      url,
      reason: 'Sign in to upload to Storage. Saved locally for now.'
    };
  }

  const storage = getStorage(firebase.app);
  const folder = sanitizeFolder(pathHint);
  const fileName = `${Date.now()}-${sanitizeFileName(file.name || 'image.jpg')}`;
  const objectPath = `artifacts/${APP_ID}/users/${ownerId}/${folder}/${fileName}`;
  const storageRef = ref(storage, objectPath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return { ok: true as const, localOnly: false, url };
}

const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const CHAT_ALLOWED_PREFIXES = ['image/', 'audio/', 'application/pdf', 'text/plain'];
const CHAT_ALLOWED_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

function isAllowedChatMime(mime: string) {
  const type = String(mime || '').toLowerCase();
  if (!type) return false;
  if (CHAT_ALLOWED_EXACT.has(type)) return true;
  return CHAT_ALLOWED_PREFIXES.some((prefix) => type.startsWith(prefix));
}

function attachmentKindFromMime(mime: string): 'image' | 'voice' | 'file' {
  const type = String(mime || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'voice';
  return 'file';
}

/**
 * Upload a chat attachment (image/doc/audio) for Support inbox.
 * Falls back to a local data URL offline / when unsigned-in.
 */
export async function uploadChatAttachment(
  file: File,
  { threadId = 'local', messageId = `m-${Date.now()}` }: { threadId?: string; messageId?: string } = {}
) {
  if (!(file instanceof File)) {
    throw new Error('Choose a file.');
  }
  if (!isAllowedChatMime(file.type)) {
    throw new Error('Use an image, PDF, document, or audio file.');
  }
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error('Attachment must be under 25MB.');
  }

  const kind = attachmentKindFromMime(file.type);
  const meta = {
    id: `att-${Date.now()}`,
    kind,
    name: file.name || 'attachment',
    mime: file.type,
    size: file.size
  };

  const firebase = getFirebase();
  const ownerId = firebase?.auth.currentUser?.uid;
  if (!firebase || !ownerId) {
    const url = await fileToDataUrl(file);
    return {
      ok: true as const,
      localOnly: true,
      attachment: { ...meta, url },
      reason: 'Saved locally until Storage is available.'
    };
  }

  const storage = getStorage(firebase.app);
  const safeThread = String(threadId || 'local').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeMessage = String(messageId || `m-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = sanitizeFileName(file.name || 'attachment');
  const objectPath = `artifacts/${APP_ID}/clientThreads/${safeThread}/attachments/${safeMessage}/${fileName}`;
  const storageRef = ref(storage, objectPath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);
  return {
    ok: true as const,
    localOnly: false,
    attachment: { ...meta, url }
  };
}

/** Placeholder until a Places callable + API key ship. */
export async function fetchGooglePlaceReviews(placeId: string) {
  const id = String(placeId || '').trim();
  if (!id) {
    return { ok: false as const, reviews: [], reason: 'Add a Google Place ID first.' };
  }
  if (!isFirebaseConfigured()) {
    return {
      ok: false as const,
      reviews: [],
      reason: 'Google Places reviews need Firebase + a Places API key (next deploy).'
    };
  }
  return {
    ok: false as const,
    reviews: [],
    reason: 'Places reviews callable is not deployed yet. Keep curated reviews for now.'
  };
}

export function buildGoogleCalendarUrl({
  title,
  details,
  location,
  startIso,
  endIso
}: {
  title: string;
  details?: string;
  location?: string;
  startIso: string;
  endIso: string;
}) {
  const toGCal = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: details || '',
    location: location || '',
    dates: `${toGCal(startIso)}/${toGCal(endIso)}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build a Calendar URL from a booking request (local times → ISO). */
export function buildBookingCalendarUrl({
  serviceName,
  brandName,
  dateKey,
  time,
  durationMinutes = 60,
  address = '',
  note = ''
}: {
  serviceName: string;
  brandName?: string;
  dateKey: string;
  time: string;
  durationMinutes?: number;
  address?: string;
  note?: string;
}) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
  const end = new Date(start.getTime() + Math.max(15, Number(durationMinutes) || 60) * 60_000);
  return buildGoogleCalendarUrl({
    title: brandName ? `${serviceName} · ${brandName}` : serviceName,
    details: note || 'Booking request via Book and Buy',
    location: address,
    startIso: start.toISOString(),
    endIso: end.toISOString()
  });
}

/**
 * Publish a public-safe workspace snapshot to Firestore.
 * Requires signed-in owner; also refreshes owner settings doc.
 */
export async function publishWorkspaceToFirestore(workspace: Record<string, unknown>) {
  const firebase = getFirebase();
  const uid = firebase?.auth.currentUser?.uid || '';
  const ownerId = String(workspace.ownerId || uid || '');
  const slug = String(workspace.slug || '');

  if (!firebase || !slug) {
    return {
      ok: false as const,
      localOnly: true,
      reason: 'Published locally. Connect Firebase to sync the public slug.'
    };
  }
  if (!uid || !ownerId) {
    return {
      ok: false as const,
      localOnly: true,
      reason: 'Sign in as the owner to publish to the live public slug.'
    };
  }
  if (ownerId !== uid) {
    return {
      ok: false as const,
      localOnly: true,
      reason: 'Only the workspace owner can publish this site.'
    };
  }

  const snapshot = buildPublicWorkspaceSnapshot({
    ...workspace,
    ownerId
  });

  if (!snapshot.ownerId) {
    return {
      ok: false as const,
      localOnly: true,
      reason: 'Missing ownerId — sign in and try Publish again.'
    };
  }

  const path = publicWorkspacePath(APP_ID, slug);
  await setDoc(doc(firebase.db, ...path), snapshot, { merge: true });
  await saveOwnerWorkspaceToFirestore(ownerId, {
    ...workspace,
    ownerId,
    publishedAt: snapshot.publishedAt,
    website: {
      ...(workspace.website as object),
      published: true
    }
  });

  return { ok: true as const, localOnly: false, reason: 'Published to Firestore.' };
}
