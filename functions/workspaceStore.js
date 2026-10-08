import { getFirestore } from 'firebase-admin/firestore';
import { domainError } from './workspaceDomain.js';
const APP = process.env.APP_ID || 'book-and-buy-v1';
export const ENTITY_COLLECTIONS = { products: 'catalogProducts', services: 'catalogServices', bookings: 'commerceBookings', orders: 'orders' };
export function settingsRef(db, ownerId) { return db.doc(`artifacts/${APP}/users/${ownerId}/config/settings`); }
export async function readWorkspace(db = getFirestore(), ownerId, tx, { allowMigration = false } = {}) {
  const ref = settingsRef(db, ownerId); const snapshot = await (tx ? tx.get(ref) : ref.get());
  const workspace = snapshot.exists ? snapshot.data() : {};
  if (!allowMigration && workspace.migration?.status === 'paused') domainError('Workspace maintenance is in progress. Please retry shortly.', 'unavailable');
  if (workspace.storageMode === 'collections') {
    for (const [field, collection] of Object.entries(ENTITY_COLLECTIONS)) {
      const query = db.collection(`artifacts/${APP}/users/${ownerId}/${collection}`).where('_storageEpoch', '==', workspace.storageEpoch);
      const rows = await (tx ? tx.get(query) : query.get());
      workspace[field] = rows.docs.map(row => { const { _storageEpoch, ...record } = row.data(); return { ...record, id: row.id }; });
    }
  }
  return { ref, workspace, exists: snapshot.exists };
}
// Read all needed documents first. Call this only after transaction validation completes.
export function writeWorkspace(tx, db, ownerId, previous, next, { source = 'system' } = {}) {
  const ref = settingsRef(db, ownerId);
  if (previous.storageMode !== 'collections') { tx.set(ref, { ...next, ownerId, lastCommandSource: source, updatedAt: Date.now(), mutationEpoch: (previous.mutationEpoch || 0) + 1 }); return; }
  const metadata = { ...next, ownerId, lastCommandSource: source, updatedAt: Date.now(), mutationEpoch: (previous.mutationEpoch || 0) + 1 };
  for (const [field, collection] of Object.entries(ENTITY_COLLECTIONS)) {
    delete metadata[field];
    const old = new Map((previous[field] || []).map(row => [row.id, row]));
    for (const row of next[field] || []) {
      if (JSON.stringify(old.get(row.id)) !== JSON.stringify(row)) tx.set(db.doc(`artifacts/${APP}/users/${ownerId}/${collection}/${row.id}`), { ...row, _storageEpoch: previous.storageEpoch });
      old.delete(row.id);
    }
    for (const id of old.keys()) tx.delete(db.doc(`artifacts/${APP}/users/${ownerId}/${collection}/${id}`));
  }
  // Legacy arrays remain frozen for audit; they are not an alternate write source.
  tx.set(ref, metadata, { merge: true });
}
