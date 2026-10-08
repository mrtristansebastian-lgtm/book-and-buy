import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { APP_ID } from '../../config/appConfig';
import { getFirebase } from './client';
import { ownerConfigPath } from './paths';
import { workspaceChanges } from '../../../functions/workspaceDomain.js';

const SETTINGS_DOC = 'settings';
const baselines = new Map<string, Record<string, any>>();
const saves = new Map<string, Promise<any>>();

/** Strip runtime-only fields before cloud write. */
export function serializeOwnerWorkspace(workspace: Record<string, unknown>) {
  // Booking state is server-owned. A delayed settings save must never overwrite it.
  const { bookings, bookingRevision, orders, ...settings } = workspace;
  return {
    ...settings,
    isDemo: false,
    updatedAt: Date.now()
  };
}

export function subscribeOwnerBookings(ownerId: string, onChange: (bookings: any[], orders: any[]) => void) {
  const firebase = getFirebase(); if (!firebase || !ownerId) return () => {};
  return onSnapshot(doc(firebase.db, ...ownerConfigPath(APP_ID, ownerId, SETTINGS_DOC)), (snapshot) => {
    if (snapshot.exists()) onChange(snapshot.data().bookings || [], snapshot.data().orders || []);
  });
}

export async function loadOwnerWorkspaceFromFirestore(ownerId: string) {
  const firebase = getFirebase();
  if (!firebase || !ownerId) return null;
  const result = await httpsCallable<{ownerId: string}, Record<string, any> | null>(firebase.functions, 'getOwnerWorkspace')({ownerId});
  baselines.set(ownerId, result.data || {});
  return result.data;
}

/** Reads through the server, including migrated catalogs. Preserve local dirty fields in the caller. */
export function subscribeOwnerWorkspace(ownerId: string, onChange: (workspace: Record<string, any>) => void, onError?: (error: Error) => void) {
  const firebase = getFirebase(); if (!firebase || !ownerId) return () => {};
  let active = true; let generation = 0;
  const unsubscribe = onSnapshot(doc(firebase.db, ...ownerConfigPath(APP_ID, ownerId, SETTINGS_DOC)), async () => {
    const request = ++generation;
    try { const result = await loadOwnerWorkspaceFromFirestore(ownerId); if (active && request === generation && result) onChange(result); }
    catch (error) { if (active) onError?.(error as Error); }
  }, error => onError?.(error));
  return () => { active = false; unsubscribe(); };
}

export async function saveOwnerWorkspaceToFirestore(
  ownerId: string,
  workspace: Record<string, unknown>
) {
  const firebase = getFirebase();
  if (!firebase || !ownerId) {
    return { ok: false as const, reason: 'Firebase not configured.' };
  }
  const snapshot = structuredClone(workspace);
  const priorSave = saves.get(ownerId) || Promise.resolve();
  const pending = priorSave.catch(() => {}).then(async () => {
    if (!baselines.has(ownerId)) await loadOwnerWorkspaceFromFirestore(ownerId);
    const baseline = baselines.get(ownerId) || {};
    const changes = workspaceChanges(baseline, snapshot).map(change => ({ ...change,
      expectedRevision: (snapshot.sectionRevisions as Record<string, number> | undefined)?.[change.section] ?? change.expectedRevision
    }));
    if (!changes.length) return { ok: true as const, workspace: baseline };
    const result = await httpsCallable<object, {ok: boolean; workspace: Record<string, any>}>(firebase.functions, 'patchOwnerWorkspace')({ownerId, changes, requestId: crypto.randomUUID()});
    if (result.data.ok !== true) throw new Error('The server did not confirm this save.');
    baselines.set(ownerId, result.data.workspace);
    return result.data;
  });
  saves.set(ownerId, pending);
  return pending;
}
