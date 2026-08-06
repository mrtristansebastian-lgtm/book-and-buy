import { doc, getDoc } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase } from './client';
import { publicWorkspacePath } from './paths';

/**
 * Load a public workspace document by slug from Firestore.
 * Returns null when Firebase is off or the slug is missing — callers keep using local demo data.
 */
export async function loadPublicWorkspaceFromFirestore(slug: string) {
  const firebase = getFirebase();
  if (!firebase || !slug) return null;
  const path = publicWorkspacePath(APP_ID, slug);
  const snap = await getDoc(doc(firebase.db, ...path));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Record<string, unknown>) };
}
