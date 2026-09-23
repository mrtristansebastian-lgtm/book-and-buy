import type { StorageReference, UploadMetadata, UploadTask } from 'firebase/storage';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable
} from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from './client';
import { firebaseCallables } from './callables';
import { saveOwnerWorkspaceToFirestore } from './ownerWorkspace';
import { publicWorkspacePath } from './paths';
import { buildPublicWorkspaceSnapshot } from './publicSnapshot';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function sanitizeFolder(pathHint: string) {
  const allowed = new Set([
    'brand',
    'venue',
    'services',
    'website',
    'products',
    'social',
    'account-avatars'
  ]);
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

/** Thrown when a caller cancels an in-flight upload, so UI can skip the error state. */
export class UploadCanceledError extends Error {
  canceled = true as const;

  constructor(message = 'Upload canceled.') {
    super(message);
    this.name = 'UploadCanceledError';
  }
}

export function isUploadCanceled(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      ((error as { canceled?: boolean }).canceled === true ||
        (error as { code?: string }).code === 'storage/canceled')
  );
}

export function formatBytes(bytes: number) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  const mb = value / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export type UploadOptions = {
  /** Called with completion fraction 0–1 plus raw byte counts. */
  onProgress?: (fraction: number, transferred: number, total: number) => void;
  /** Receives the live task so the caller can cancel or pause. */
  onTask?: (task: UploadTask) => void;
};

/**
 * Resumable upload with progress reporting. Rejects with UploadCanceledError
 * when the caller cancels via the task handed to `onTask`.
 */
function runResumableUpload(
  storageRef: StorageReference,
  file: File,
  metadata: UploadMetadata,
  options: UploadOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata);
    options.onTask?.(task);
    options.onProgress?.(0, 0, file.size);

    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || file.size || 0;
        const transferred = snapshot.bytesTransferred || 0;
        const fraction = total > 0 ? Math.min(1, transferred / total) : 0;
        options.onProgress?.(fraction, transferred, total);
      },
      (error) => {
        if (isUploadCanceled(error)) {
          reject(new UploadCanceledError());
          return;
        }
        reject(error);
      },
      () => {
        options.onProgress?.(1, file.size, file.size);
        getDownloadURL(task.snapshot.ref).then(resolve, reject);
      }
    );
  });
}

/**
 * Upload a public site image to Firebase Storage when configured + signed in.
 * Local data-URL fallback only when Firebase is not configured (demo mode).
 */
export async function uploadPublicImage(
  file: File,
  pathHint = 'website',
  options: UploadOptions = {}
) {
  if (!(file instanceof File)) {
    throw new Error('Choose an image file.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (PNG, JPG, or WebP).');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `That image is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_IMAGE_BYTES)}.`
    );
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
    throw new Error('Sign in to upload images to Storage.');
  }

  try {
    const storage = getStorage(firebase.app);
    const folder = sanitizeFolder(pathHint);
    const fileName = `${Date.now()}-${sanitizeFileName(file.name || 'image.jpg')}`;
    const objectPath = `artifacts/${APP_ID}/users/${ownerId}/${folder}/${fileName}`;
    const storageRef = ref(storage, objectPath);
    const url = await runResumableUpload(
      storageRef,
      file,
      { contentType: file.type },
      options
    );
    return { ok: true as const, localOnly: false, url };
  } catch (error) {
    if (isUploadCanceled(error)) throw error;
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Upload failed. Check Storage rules and that your email is verified.';
    throw new Error(message);
  }
}

export const MAX_VIDEO_BYTES = 48 * 1024 * 1024;

/**
 * Upload a short social video clip to Storage when configured + signed in.
 * Local object-URL fallback only when Firebase is not configured (demo mode).
 */
export async function uploadPublicVideo(
  file: File,
  pathHint = 'social',
  options: UploadOptions = {}
) {
  if (!(file instanceof File)) {
    throw new Error('Choose a video file.');
  }
  if (!file.type.startsWith('video/')) {
    throw new Error('Choose a video file (MP4, WebM, or MOV).');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `That video is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_VIDEO_BYTES)}. Trim it or export at a lower resolution.`
    );
  }

  const firebase = getFirebase();
  if (!firebase) {
    const url = URL.createObjectURL(file);
    return {
      ok: true as const,
      localOnly: true,
      url,
      reason: 'Saved locally until Firebase Storage is configured.'
    };
  }

  const ownerId = firebase.auth.currentUser?.uid;
  if (!ownerId) {
    throw new Error('Sign in to upload video to Storage.');
  }

  try {
    const storage = getStorage(firebase.app);
    const folder = sanitizeFolder(pathHint === 'social' ? 'social' : pathHint);
    if (folder !== 'social') {
      throw new Error('Videos can only be uploaded to the social folder.');
    }
    const fileName = `${Date.now()}-${sanitizeFileName(file.name || 'video.mp4')}`;
    const objectPath = `artifacts/${APP_ID}/users/${ownerId}/${folder}/${fileName}`;
    const storageRef = ref(storage, objectPath);
    const url = await runResumableUpload(
      storageRef,
      file,
      { contentType: file.type },
      options
    );
    return { ok: true as const, localOnly: false, url };
  } catch (error) {
    if (isUploadCanceled(error)) throw error;
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Video upload failed. Check Storage rules and that your email is verified.';
    throw new Error(message);
  }
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

/** Fetch Google Place reviews via authenticated Cloud Function (owner sync). */
export async function fetchGooglePlaceReviews(placeId: string) {
  const id = String(placeId || '').trim();
  if (!id) {
    return { ok: false as const, reviews: [], reason: 'Add a Google Place ID first.' };
  }
  if (!isFirebaseConfigured()) {
    return {
      ok: false as const,
      reviews: [],
      reason: 'Connect Firebase and deploy getGooglePlaceReviews to sync Places reviews.'
    };
  }
  try {
    const result = await firebaseCallables.getGooglePlaceReviews({ placeId: id });
    const reviews = Array.isArray(result?.reviews) ? result.reviews : [];
    if (!reviews.length) {
      return {
        ok: false as const,
        reviews: [],
        reason: 'No Google reviews returned for this Place ID.'
      };
    }
    return {
      ok: true as const,
      reviews: reviews.map((item, index) => ({
        id: item.id || `gplace-${Date.now()}-${index}`,
        quote: String(item.quote || '').trim(),
        name: String(item.name || 'Google reviewer').trim(),
        rating: Math.max(0, Math.min(5, Number(item.rating) || 5))
      })),
      placeName: result.placeName,
      rating: result.rating
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not fetch Google reviews.';
    return {
      ok: false as const,
      reviews: [],
      reason: message
    };
  }
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
  // Dual-write published social records while legacy workspace snapshots remain
  // available for rollback during the social-data migration.
  const socialPosts = Array.isArray(workspace.socialPosts) ? workspace.socialPosts : [];
  await Promise.all(
    socialPosts.map((post) =>
      firebaseCallables.socialUpsertPost({
        slug,
        ownerId,
        businessName: String(workspace.brandName || ''),
        businessLogoUrl: String((workspace.website as Record<string, unknown>)?.logoUrl || ''),
        post,
        mutationId: `publish_${Date.now()}_${crypto.randomUUID().replaceAll('-', '')}`
      })
    )
  );
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
