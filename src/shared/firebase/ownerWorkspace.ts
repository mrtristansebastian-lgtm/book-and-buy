import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { APP_ID } from '../../config/appConfig';
import { getFirebase } from './client';
import { ownerConfigPath } from './paths';
import { captureWorkspaceIntent, prepareWorkspaceIntent } from './workspaceSaveIntent.js';

const SETTINGS_DOC = 'settings';
const baselines = new Map<string, Record<string, any>>();
const saves = new Map<string, Promise<any>>();
const desiredSnapshots = new Map<string, Record<string, any>>();
const committedRevisions = new Map<string, {section: string; from: number; to: number}[]>();
const cacheKey = (ownerId: string) => `book-and-buy.workspace-baseline.${ownerId}`;
export function readCachedOwnerBaseline(ownerId: string): Record<string, any> | null {
  try { const value = JSON.parse(localStorage.getItem(cacheKey(ownerId)) || 'null'); return value?.ownerId === ownerId ? value : null; } catch { return null; }
}
function rememberBaseline(ownerId: string, value: Record<string, any>) {
  baselines.set(ownerId, value);
  try { if (value.ownerId === ownerId) localStorage.setItem(cacheKey(ownerId),JSON.stringify(value)); } catch { /* cloud save still succeeded */ }
}

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
  return subscribeOwnerWorkspace(ownerId, workspace => onChange(workspace.bookings || [],workspace.orders || []));
}

export async function loadOwnerWorkspaceFromFirestore(ownerId: string) {
  const firebase = getFirebase();
  if (!firebase || !ownerId) return null;
  const result = await httpsCallable<{ownerId: string}, Record<string, any> | null>(firebase.functions, 'getOwnerWorkspace')({ownerId});
  const current = baselines.get(ownerId);
  if (!current || (result.data?.mutationEpoch || 0) >= (current.mutationEpoch || 0)) rememberBaseline(ownerId, result.data || {});
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
  const captured = baselines.has(ownerId) ? captureWorkspaceIntent(baselines.get(ownerId), snapshot, desiredSnapshots.get(ownerId)) : null;
  desiredSnapshots.set(ownerId, snapshot);
  const priorSave = saves.get(ownerId) || Promise.resolve();
  const pending = priorSave.catch(() => {}).then(async () => {
    if (!baselines.has(ownerId)) await loadOwnerWorkspaceFromFirestore(ownerId);
    const baseline = baselines.get(ownerId) || {};
    const changes = prepareWorkspaceIntent(captured || captureWorkspaceIntent(baseline, snapshot), baseline, committedRevisions.get(ownerId));
    if (!changes.length) return { ok: true as const, workspace: baseline };
    const result = await httpsCallable<object, {ok: boolean; workspace: Record<string, any>}>(firebase.functions, 'patchOwnerWorkspace')({ownerId, changes, requestId: crypto.randomUUID()});
    if (result.data.ok !== true) throw new Error('The server did not confirm this save.');
    const receipts = committedRevisions.get(ownerId) || [];
    for (const change of changes) receipts.push({section: change.section, from: change.expectedRevision, to: result.data.workspace.sectionRevisions[change.section]});
    committedRevisions.set(ownerId, receipts.slice(-200));
    rememberBaseline(ownerId, result.data.workspace);
    return result.data;
  });
  saves.set(ownerId, pending);
  return pending;
}

/** A reviewed retry uses the exact revisions shown to the owner, never a blind rebase. */
export async function applyReviewedWorkspaceChanges(ownerId: string, changes: any[]) {
  const firebase = getFirebase(); if (!firebase || !ownerId) throw new Error('Sign in to save these changes.');
  const priorSave = saves.get(ownerId) || Promise.resolve();
  const pending = priorSave.catch(() => {}).then(async () => {
    if (!changes.length) return {ok:true,workspace:baselines.get(ownerId) || {}};
    const response = await httpsCallable<object,{ok:boolean;workspace:Record<string,any>}>(firebase.functions,'patchOwnerWorkspace')({ownerId,changes,requestId:crypto.randomUUID()});
    if (response.data.ok !== true) throw new Error('The server did not confirm this save.');
    rememberBaseline(ownerId,response.data.workspace);
    return response.data;
  });
  saves.set(ownerId,pending); return pending;
}
