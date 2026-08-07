import { doc, getDoc, setDoc } from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase } from './client';
import { ownerConfigPath } from './paths';

const SETTINGS_DOC = 'settings';

/** Strip runtime-only fields before cloud write. */
export function serializeOwnerWorkspace(workspace: Record<string, unknown>) {
  return {
    ...workspace,
    isDemo: false,
    updatedAt: Date.now()
  };
}

export async function loadOwnerWorkspaceFromFirestore(ownerId: string) {
  const firebase = getFirebase();
  if (!firebase || !ownerId) return null;
  const path = ownerConfigPath(APP_ID, ownerId, SETTINGS_DOC);
  const snap = await getDoc(doc(firebase.db, ...path));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    ...data,
    ownerId,
    isDemo: false,
    id: snap.id
  };
}

export async function saveOwnerWorkspaceToFirestore(
  ownerId: string,
  workspace: Record<string, unknown>
) {
  const firebase = getFirebase();
  if (!firebase || !ownerId) {
    return { ok: false as const, reason: 'Firebase not configured.' };
  }
  const path = ownerConfigPath(APP_ID, ownerId, SETTINGS_DOC);
  const payload = serializeOwnerWorkspace({
    ...workspace,
    ownerId
  });
  await setDoc(doc(firebase.db, ...path), payload, { merge: true });
  return { ok: true as const };
}
