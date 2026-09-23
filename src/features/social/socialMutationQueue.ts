type QueueEntry = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAtMs: number;
  updatedAtMs: number;
};

const DB_NAME = 'book-and-buy-social';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

export function createMutationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

function openQueue(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openQueue();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function rememberMutation(entry: QueueEntry): Promise<void> {
  await withStore('readwrite', (store) => store.put(entry));
}

export async function forgetMutation(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function pendingMutations(): Promise<QueueEntry[]> {
  return (await withStore('readonly', (store) => store.getAll())) || [];
}

export function isRetryableSocialError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code || '').replace(/^functions\//, '');
  return ['aborted', 'cancelled', 'deadline-exceeded', 'internal', 'resource-exhausted', 'unavailable', 'unknown'].includes(code);
}

export async function executeDurableMutation<T>(
  name: string,
  payload: Record<string, unknown>,
  execute: (payload: Record<string, unknown>) => Promise<T>
): Promise<T> {
  const mutationId = String(payload.mutationId || createMutationId());
  const finalPayload = { ...payload, mutationId };
  const entry: QueueEntry = { id: mutationId, name, payload: finalPayload, attempts: 0, createdAtMs: Date.now(), updatedAtMs: Date.now() };
  await rememberMutation(entry);
  try {
    const result = await execute(finalPayload);
    await forgetMutation(mutationId);
    return result;
  } catch (error) {
    if (!isRetryableSocialError(error)) await forgetMutation(mutationId);
    else await rememberMutation({ ...entry, attempts: 1, updatedAtMs: Date.now() });
    throw error;
  }
}

export async function replayDurableMutations(
  executors: Record<string, (payload: Record<string, unknown>) => Promise<unknown>>
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const entries = (await pendingMutations()).sort((a, b) => a.createdAtMs - b.createdAtMs).slice(0, 50);
  for (const entry of entries) {
    const execute = executors[entry.name];
    if (!execute) {
      await forgetMutation(entry.id);
      continue;
    }
    try {
      await execute(entry.payload);
      await forgetMutation(entry.id);
    } catch (error) {
      if (!isRetryableSocialError(error) || entry.attempts >= 8) await forgetMutation(entry.id);
      else await rememberMutation({ ...entry, attempts: entry.attempts + 1, updatedAtMs: Date.now() });
    }
  }
}
