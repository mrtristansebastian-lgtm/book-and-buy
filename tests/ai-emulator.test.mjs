import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { createAIGateway } from '../functions/ai/index.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
if (enabled) {
  if (!/^demo-/.test(process.env.GCLOUD_PROJECT || '')) throw new Error('AI emulator checks require an explicit demo project.');
  if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT });
}
async function fixture(extra = {}) {
  const db = getFirestore(), uid = `ai-${randomUUID()}`, appId = `ai-test-${randomUUID()}`, path = `artifacts/${appId}/users/${uid}`;
  await db.doc(`${path}/config/settings`).set({ brandName: 'AI test workspace' });
  const env = { APP_ID: appId, AI_OPENAI_MODELS: 'gpt-6.1-sol', AI_OPENAI_DEFAULT_MODEL: 'gpt-6.1-sol', OPENAI_API_KEY: 'fake-platform-key', AI_INCLUDED_DAILY_TOKENS: '1000000', AI_MAX_DAILY_RUNS: '30' };
  const gateway = createAIGateway({ db, env, fetchImpl: () => { throw new Error('Provider network is forbidden.'); }, providerCall: async () => ({ content: 'Saved answer', calls: [], native: [], usage: { inputTokens: 5, outputTokens: 7 } }), ...extra });
  const request = data => ({ auth: { uid, token: { email_verified: true } }, data: { workspaceId: uid, ...data } });
  const input = { provider: 'openai', model: 'gpt-6.1-sol', reasoningEffort: 'medium', mode: 'butler', conversationId: 'conversation', requestId: 'one', messages: [{ role: 'user', content: 'What can we improve?' }] };
  return { db, uid, path, gateway, request, input };
}
test('emulator concurrent admissions pay once and restore owner-isolated turn history', { skip: !enabled }, async () => {
  let calls = 0; const f = await fixture({ providerCall: async () => { calls++; return { content: 'Saved answer', calls: [], native: [], usage: { inputTokens: 5, outputTokens: 7 } }; } });
  await Promise.all([f.gateway.run(f.request(f.input)), f.gateway.run(f.request(f.input))]);
  assert.equal(calls, 1); const restored = await f.gateway.getConversation(f.request({ conversationId: 'conversation' }));
  assert.equal(restored.turns.length, 1); assert.equal(restored.turns[0].assistant, 'Saved answer'); assert.equal(restored.activeRun, null);
  const usage = await f.db.collection(`${f.path}/aiUsage`).get(); assert.equal(usage.docs[0].data().usedTokens, 12); assert.equal(usage.docs[0].data().reservedTokens, 0);
  await assert.rejects(f.gateway.getConversation({ auth: { uid: 'other' }, data: { workspaceId: f.uid, conversationId: 'conversation' } }), { code: 'permission-denied' });
});
test('emulator interrupted run settles usage and history once after lease expiry', { skip: !enabled }, async () => {
  const f = await fixture(); const usagePath = `${f.path}/aiUsage/interrupted`;
  await f.db.doc(usagePath).set({ reservedTokens: 1000, usedTokens: 5 });
  await f.db.doc(`${f.path}/aiConversations/conversation`).set({ provider: 'openai', model: 'gpt-6.1-sol', mode: 'butler', activeRun: 'interrupted', leaseUntil: Date.now() - 1, updatedAt: Date.now() });
  await f.db.doc(`${f.path}/aiRuns/interrupted`).set({ uid: f.uid, provider: 'openai', model: 'gpt-6.1-sol', mode: 'butler', conversationId: 'conversation', status: 'running', userMessage: 'Request', content: 'Saved partial', reservation: 1000, usagePath, reservationSettled: false, leaseUntil: Date.now() - 1, startedAt: Date.now() - 400000 });
  const result = await f.gateway.getConversation(f.request({ conversationId: 'conversation' })); assert.equal(result.activeRun, null); assert.equal(result.turns[0].status, 'failed'); assert.equal(result.turns[0].assistant, 'Saved partial');
  await f.gateway.getRun(f.request({ runId: 'interrupted' })); const usage = (await f.db.doc(usagePath).get()).data(); assert.equal(usage.reservedTokens, 0); assert.equal(usage.usedTokens, 1005);
});
test('emulator a pre-admission cancellation prevents inference and consumes its marker once', { skip: !enabled }, async () => {
  let calls = 0; const f = await fixture({ providerCall: async () => { calls++; throw new Error('Forbidden inference'); } });
  await f.gateway.cancelRun(f.request({ runId: 'one' })); const result = await f.gateway.run(f.request(f.input));
  assert.equal(result.status, 'cancelled'); assert.equal(calls, 0); assert.equal((await f.db.collection(`${f.path}/aiUsage`).get()).empty, true);
  assert.equal((await f.db.doc(`${f.path}/aiCancellationRequests/one`).get()).exists, false);
});


test('emulator deletion cancels in-flight runs, blocks late writes and preserves business audits', { skip: !enabled }, async () => {
  let release, entered; const barrier = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { entered = resolve; });
  const f = await fixture({ providerCall: async (_provider, _input, { onText }) => { entered(); await barrier; await onText('Late private output'); return { content: 'Late private output', calls: [], native: [], usage: { inputTokens: 4, outputTokens: 4 } }; } });
  const running = f.gateway.run(f.request(f.input)).then(value => ({ value }), error => ({ error }));
  await ready;
  await f.db.doc(`${f.path}/orders/order`).set({ total: 1500 }); await f.db.doc(`${f.path}/butlerAudit/audit`).set({ tool: 'orders.preview', status: 'applied' });
  await f.db.doc(`${f.path}/butlerPreviews/review`).set({ conversationId: 'conversation', status: 'pending', args: { body: 'Private draft' }, command: { operation: 'write' } });
  try {
    const deletion = await f.gateway.deleteConversation(f.request({ conversationId: 'conversation', requestId: 'delete' })); assert.equal(deletion.status, 'deleting');
    assert.equal((await f.db.doc(`${f.path}/aiRuns/one`).get()).data().cancelRequested, true);
    await assert.rejects(f.gateway.getRun(f.request({ runId: 'one' })), { code: 'not-found' });
    await assert.rejects(f.gateway.run(f.request({ ...f.input, requestId: 'late' })), { code: 'not-found' });
  } finally { release(); }
  const ended = await running; assert.equal(ended.error?.code, 'not-found');
  assert.equal((await f.gateway.cleanupDeletedConversations()).completed, 1);
  const tombstone = (await f.db.doc(`${f.path}/aiConversations/conversation`).get()).data(); assert.equal(tombstone.status, 'deleted'); assert.equal(tombstone.title, undefined);
  assert.equal((await f.db.collection(`${f.path}/aiRuns`).get()).empty, true); assert.equal((await f.db.collection(`${f.path}/aiConversations/conversation/turns`).get()).empty, true);
  assert.equal((await f.db.doc(`${f.path}/aiRuns/one`).collection('events').get()).empty, true);
  assert.equal((await f.db.doc(`${f.path}/butlerPreviews/review`).get()).data().status, 'dismissed');
  assert.equal((await f.db.doc(`${f.path}/orders/order`).get()).data().total, 1500); assert.equal((await f.db.doc(`${f.path}/butlerAudit/audit`).get()).data().status, 'applied');
  assert.equal((await f.gateway.deleteConversation(f.request({ conversationId: 'conversation', requestId: 'repeat' }))).status, 'deleted');
});
