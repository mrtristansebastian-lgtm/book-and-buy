import { aiError } from './config.js';
export const deletingConversation = value => ['deleting', 'deleted'].includes(value?.status);

// A content-free tombstone prevents delayed workers from recreating a chat ID.
export function createAIHistory({ db, ownerPath, settleRun }) {
  const conversationRef = (uid, id) => db().doc(`${ownerPath(uid)}/aiConversations/${id}`);
  async function finish(uid, conversationId) {
    const ref = conversationRef(uid, conversationId), value = (await ref.get()).data();
    if (value?.status === 'deleted') return { ok: true, status: 'deleted' };
    if (value?.status !== 'deleting') return { ok: true, status: 'unchanged' };
    const runs = await db().collection(`${ownerPath(uid)}/aiRuns`).where('conversationId', '==', conversationId).limit(100).get();
    for (const run of runs.docs) {
      if (!run.data().reservationSettled && run.data().leaseUntil < Date.now()) await settleRun(run.ref);
      const current = (await run.ref.get()).data();
      if (!current) continue;
      if (!current.reservationSettled) { await run.ref.update({ cancelRequested: true }); continue; }
      const events = await run.ref.collection('events').limit(100).get();
      for (const event of events.docs) await event.ref.delete();
      if (!(await run.ref.collection('events').limit(1).get()).docs.length) await run.ref.delete();
    }
    const turns = await ref.collection('turns').limit(100).get();
    for (const turn of turns.docs) await turn.ref.delete();
    const previews = await db().collection(`${ownerPath(uid)}/butlerPreviews`).where('conversationId', '==', conversationId).where('status', '==', 'pending').limit(100).get();
    for (const preview of previews.docs) await db().runTransaction(async tx => {
      const current = (await tx.get(preview.ref)).data();
      if (current?.status === 'pending' && !current.executionAttempted) tx.update(preview.ref, { status: 'dismissed', args: null, command: null, before: null, recordName: '', dismissedReason: 'Conversation deleted', dismissedAt: Date.now() });
    });
    const [remainingRuns, remainingTurns, remainingPreviews] = await Promise.all([
      db().collection(`${ownerPath(uid)}/aiRuns`).where('conversationId', '==', conversationId).limit(1).get(),
      ref.collection('turns').limit(1).get(),
      db().collection(`${ownerPath(uid)}/butlerPreviews`).where('conversationId', '==', conversationId).where('status', '==', 'pending').limit(100).get()
    ]);
    if (remainingRuns.docs.length || remainingTurns.docs.length || remainingPreviews.docs.some(row => !row.data().executionAttempted)) return { ok: true, status: 'deleting' };
    await db().runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.status === 'deleting') tx.set(ref, { uid, workspaceId: uid, status: 'deleted', deletedAt: Date.now(), deleteRequestId: current.deleteRequestId });
    });
    return { ok: true, status: 'deleted' };
  }
  return {
    async remove(uid, { conversationId, requestId, expectedUpdatedAt }) {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(conversationId || '') || !/^[A-Za-z0-9_-]{1,80}$/.test(requestId || '')) throw aiError('invalid-argument', 'Valid conversation and deletion identifiers are required.');
      const ref = conversationRef(uid, conversationId);
      await db().runTransaction(async tx => {
        const value = (await tx.get(ref)).data();
        if (!value) throw aiError('not-found', 'Conversation not found.');
        if (deletingConversation(value)) return;
        if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== value.updatedAt) throw aiError('aborted', 'This conversation changed. Refresh before deleting it.');
        tx.update(ref, { uid, workspaceId: uid, status: 'deleting', deleteRequestId: requestId, deletionRequestedAt: Date.now() });
      });
      return finish(uid, conversationId);
    },
    async sweep() {
      const pending = await db().collectionGroup('aiConversations').where('status', '==', 'deleting').limit(25).get();
      let completed = 0;
      for (const row of pending.docs) {
        const uid = row.data().uid;
        if (typeof uid !== 'string' || row.ref.path !== `${ownerPath(uid)}/aiConversations/${row.id}`) continue;
        if ((await finish(uid, row.id)).status === 'deleted') completed++;
      }
      return { completed };
    }
  };
}
