import { getFirebase, isFirebaseConfigured } from './client';
import { APP_ID } from '../../config/appConfig';
import { publicWorkspacePath } from './paths';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Phase 5 integration stubs — ready to wire when Firebase env and APIs are available.
 */

export async function uploadPublicImage(_file: File, _pathHint = 'media') {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase Storage is not configured. Paste an image URL in Edit mode for now.');
  }
  throw new Error('Storage upload will land with Firebase Storage rules + bucket wiring.');
}

export async function fetchGooglePlaceReviews(_placeId: string) {
  if (!isFirebaseConfigured()) {
    return { ok: false, reviews: [], reason: 'Firebase not configured' };
  }
  return {
    ok: false,
    reviews: [],
    reason: 'Google Places reviews require a callable + API key (next deploy).'
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
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: details || '',
    location: location || '',
    dates: `${startIso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endIso
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Publish a public workspace snapshot to Firestore (no-op locally without config). */
export async function publishWorkspaceToFirestore(workspace: Record<string, unknown>) {
  const firebase = getFirebase();
  const slug = String(workspace.slug || '');
  if (!firebase || !slug) {
    return { ok: false, localOnly: true, reason: 'Using local publish until Firebase is configured.' };
  }
  const path = publicWorkspacePath(APP_ID, slug);
  await setDoc(
    doc(firebase.db, ...path),
    {
      ...workspace,
      publishedAt: Date.now(),
      published: true
    },
    { merge: true }
  );
  return { ok: true, localOnly: false };
}
