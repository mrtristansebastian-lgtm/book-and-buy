import test from 'node:test';
import assert from 'node:assert/strict';
import { createAIGateway } from '../functions/ai/index.js';
import { decryptSecret } from '../functions/payments/encrypt.js';

function memoryDB() {
  const documents = new Map();
  const snapshot = (path) => ({ exists: documents.has(path), id: path.split('/').at(-1), data: () => structuredClone(documents.get(path)) });
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), set: async (value) => documents.set(path, structuredClone(value)), update: async value => documents.set(path, { ...documents.get(path), ...structuredClone(value) }), delete: async () => documents.delete(path), collection: name => collection(`${path}/${name}`) });
  const collection = path => ({ doc: id => doc(`${path}/${id}`), orderBy: () => collection(path), limit: () => collection(path), get: async () => ({ docs: [...documents.keys()].filter(key => key.startsWith(`${path}/`) && key.slice(path.length + 1).split('/').length === 1).sort().map(snapshot) }) });
  let lock = Promise.resolve();
  return { documents, doc, collection, runTransaction: async callback => {
    const prior = lock; let release; lock = new Promise(resolve => { release = resolve; }); await prior;
    try { const pending = []; const tx = { get: ref => ref.get(), set: (ref, data) => pending.push(() => ref.set(data)), update: (ref, data) => pending.push(() => ref.update(data)), delete: ref => pending.push(() => ref.delete()) }; const result = await callback(tx); for (const operation of pending) await operation(); return result; } finally { release(); }
  } };
}
const env = { APP_ID: 'app', AI_SETTINGS_ENCRYPTION_KEY: 'a'.repeat(40), AI_OPENAI_MODELS: 'test-model', AI_OPENAI_DEFAULT_MODEL: 'test-model', AI_ANTHROPIC_MODELS: 'claude-test', AI_ANTHROPIC_DEFAULT_MODEL: 'claude-test', AI_INCLUDED_DAILY_TOKENS: '1000000', AI_BYOK_DAILY_TOKENS: '1000000', OPENAI_API_KEY: 'platform-test-key' };
const request = (data = {}, uid = 'owner') => ({ auth: { uid }, data: { workspaceId: uid, ...data } });
const input = (extra = {}) => ({ provider: 'openai', model: 'test-model', conversationId: 'conversation', requestId: 'request', mode: 'builder', messages: [{ role: 'user', content: 'Create a homepage.' }], ...extra });
async function setup(options = {}) {
  const db = memoryDB(); for (const uid of ['owner', 'other']) await db.doc(`artifacts/app/users/${uid}/config/settings`).set({ businessName: uid });
  return { db, gateway: createAIGateway({ db, env, providerCall: async () => ({ content: 'Hello', calls: [], native: [], usage: { inputTokens: 12, outputTokens: 8 } }), fetchImpl: () => { throw new Error('Network is forbidden in gateway tests.'); }, ...options }) };
}
test('connection and run operations enforce the authenticated owner workspace', async () => {
  const { gateway } = await setup();
  await assert.rejects(gateway.listConnections({ data: { workspaceId: 'owner' } }), { code: 'unauthenticated' });
  await assert.rejects(gateway.listConnections(request({ workspaceId: 'other' })), { code: 'permission-denied' });
  await assert.rejects(gateway.run(request(input({ model: 'unapproved' }))), { code: 'invalid-argument' });
  await assert.rejects(gateway.saveConnection(request({ provider: 'chatgpt', apiKey: 'test' })), { code: 'invalid-argument' });
});
test('API keys are encrypted server side, masked in metadata and separated by owner', async () => {
  const { gateway, db } = await setup(); const key = 'sk-ant-api-test-key-abcdef1234';
  const saved = await gateway.saveConnection(request({ provider: 'anthropic', apiKey: key }));
  assert.equal(saved.last4, '1234'); assert.equal(saved.billing, 'byok'); assert.ok(!JSON.stringify(saved).includes(key));
  const stored = db.documents.get('artifacts/app/users/owner/aiConnections/anthropic');
  assert.equal(decryptSecret(stored.encrypted.ciphertext, stored.encrypted.iv, env.AI_SETTINGS_ENCRYPTION_KEY), key);
  assert.ok(!JSON.stringify(stored).includes(key));
  const other = await gateway.listConnections(request({}, 'other')); assert.equal(other.connections.find(item => item.provider === 'anthropic').connected, false);
  await gateway.disconnectConnection(request({ provider: 'anthropic' })); assert.equal(db.documents.get('artifacts/app/users/owner/aiConnections/anthropic').connected, false); assert.equal(db.documents.get('artifacts/app/users/owner/aiConnections/anthropic').encrypted, undefined);
});
test('durable streaming completion and idempotent replay do not pay twice', async () => {
  let calls = 0; const chunks = [];
  const { gateway, db } = await setup({ providerCall: async (_provider, _input, { onText }) => { calls++; await onText('Hello'); return { content: 'Hello', calls: [], native: [], usage: { inputTokens: 12, outputTokens: 8 } }; } });
  const result = await gateway.run(request(input()), { sendChunk: async chunk => { chunks.push(chunk); } });
  assert.equal(result.status, 'completed'); assert.equal(result.content, 'Hello'); assert.equal(chunks.at(-1).type, 'complete'); assert.equal(result.events.at(-1).sequence, chunks.length);
  const replay = await gateway.run(request(input())); assert.equal(replay.content, 'Hello'); assert.equal(calls, 1);
  const usage = [...db.documents.entries()].find(([path]) => path.includes('/aiUsage/'))[1]; assert.equal(usage.usedTokens, 20); assert.equal(usage.reservedTokens, 0);
  await assert.rejects(gateway.run(request(input({ messages: [{ role: 'user', content: 'Different request' }] }))), { code: 'already-exists' });
  await assert.rejects(gateway.getRun(request({ runId: 'request' }, 'other')), { code: 'not-found' });
});
test('daily admission budget and unconfigured providers fail before network calls', async () => {
  const { gateway } = await setup({ env: { ...env, AI_INCLUDED_DAILY_TOKENS: '20' } });
  await assert.rejects(gateway.run(request(input())), { code: 'resource-exhausted' });
  const { gateway: unavailable } = await setup({ env: { ...env, AI_OPENAI_DEFAULT_MODEL: '' } });
  assert.equal((await unavailable.listModels(request())).providers[0].available, false);
  await assert.rejects(unavailable.run(request(input())), { code: 'unavailable' });
});
test('conversation provider, model and mode cannot be swapped after admission', async () => {
  const { gateway } = await setup(); await gateway.run(request(input()));
  await assert.rejects(gateway.run(request(input({ requestId: 'next', mode: 'butler' }))), { code: 'failed-precondition' });
});
test('tool loop permits only server definitions and never executes in builder mode', async () => {
  let toolCalls = 0; let providerCalls = 0;
  const definition = { name: 'preview_settings', description: 'Preview', inputSchema: { type: 'object', required: ['label'], additionalProperties: false, properties: { label: { type: 'string' } } } };
  const { gateway } = await setup({ resolveContext: async () => ({ tools: [definition] }), executeTool: async call => { toolCalls++; assert.equal(call.uid, 'owner'); return { preview: true, approvalRequired: true }; }, providerCall: async () => { providerCalls++; return providerCalls === 1 ? { content: '', calls: [{ id: 'tool', name: 'preview_settings', arguments: { label: 'Store' } }], native: [], usage: { inputTokens: 10, outputTokens: 5 } } : { content: 'Review the preview.', calls: [], native: [], usage: { inputTokens: 15, outputTokens: 5 } }; } });
  const result = await gateway.run(request(input({ mode: 'butler' }))); assert.equal(result.status, 'completed'); assert.equal(toolCalls, 1);
  const { gateway: builder } = await setup({ resolveContext: async () => ({ tools: [definition] }), executeTool: async () => { throw new Error('Forbidden'); }, providerCall: async () => ({ content: '', calls: [{ id: 'tool', name: 'preview_settings', arguments: { label: 'Store' } }], native: [], usage: { inputTokens: 10, outputTokens: 5 } }) });
  assert.equal((await builder.run(request(input()))).status, 'failed');
});
test('cancellation stops provider work, preserves partial output and settles reservation', async () => {
  const controller = new AbortController();
  const { gateway, db } = await setup({ providerCall: async (_provider, _input, { signal, onText }) => { await onText('Partial'); controller.abort(); signal.throwIfAborted(); } });
  const result = await gateway.run(request(input()), { signal: controller.signal, sendChunk: async () => true });
  assert.equal(result.status, 'cancelled'); assert.equal(result.content, 'Partial');
  const usage = [...db.documents.entries()].find(([path]) => path.includes('/aiUsage/'))[1]; assert.equal(usage.reservedTokens, 0); assert.ok(usage.usedTokens > 0);
});
test('structured builder output is validated and provider internals never escape errors', async () => {
  const { gateway } = await setup({ providerCall: async () => ({ content: '{"unapproved":true}', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }) });
  const result = await gateway.run(request(input({ format: { type: 'object', additionalProperties: false, required: ['html'], properties: { html: { type: 'string' } } } }))); assert.equal(result.status, 'failed');
  const { gateway: failing } = await setup({ providerCall: async () => { throw new Error('secret-provider-payload'); } });
  assert.ok(!JSON.stringify(await failing.run(request(input()))).includes('secret-provider-payload'));
});

test('disconnect removes credentials, cancels active jobs and cannot fall back to included billing', async () => {
  let calls = 0; const { gateway, db } = await setup({ providerCall: async () => { calls++; return { content: 'Hello', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } });
  await gateway.saveConnection(request({ provider: 'openai', apiKey: 'sk-personal-api-key-12345678' }));
  await db.doc('artifacts/app/users/owner/aiRuns/active').set({ provider: 'openai', status: 'running' });
  await gateway.disconnectConnection(request({ provider: 'openai' }));
  assert.equal(db.documents.get('artifacts/app/users/owner/aiRuns/active').cancelRequested, true);
  const status = (await gateway.listConnections(request())).connections.find(item => item.provider === 'openai'); assert.equal(status.available, false); assert.equal(status.connected, false);
  await assert.rejects(gateway.run(request(input())), { code: 'unavailable' }); assert.equal(calls, 0);
  assert.equal((await gateway.selectBilling(request({ provider: 'openai', billing: 'included' }))).billing, 'included');
  assert.equal((await gateway.run(request(input()))).status, 'completed'); assert.equal(calls, 1);
});
test('explicit billing choice uses the selected secret and does not lose the personal key', async () => {
  const keys = []; const { gateway, db } = await setup({ providerCall: async (_provider, _input, options) => { keys.push(options.apiKey); return { content: 'Hello', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } });
  const personal = 'sk-personal-api-key-12345678'; await gateway.saveConnection(request({ provider: 'openai', apiKey: personal }));
  await gateway.run(request(input())); await gateway.selectBilling(request({ provider: 'openai', billing: 'included' }));
  await gateway.run(request(input({ requestId: 'second' }))); await gateway.selectBilling(request({ provider: 'openai', billing: 'personal' }));
  await gateway.run(request(input({ requestId: 'third' }))); assert.deepEqual(keys, [personal, env.OPENAI_API_KEY, personal]);
  assert.ok(db.documents.get('artifacts/app/users/owner/aiConnections/openai').encrypted);
});
test('connection changes during inference stop subsequent tool actions and source switching', async () => {
  let executed = false; let gateway;
  const setupResult = await setup({ resolveContext: async () => ({ tools: [{ name: 'read', inputSchema: { type: 'object', properties: {} } }] }), executeTool: async () => { executed = true; }, providerCall: async () => { await gateway.disconnectConnection(request({ provider: 'openai' })); return { content: '', calls: [{ id: 'call', name: 'read', arguments: {} }], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } }); gateway = setupResult.gateway;
  assert.equal((await gateway.run(request(input({ mode: 'butler' })))).status, 'cancelled'); assert.equal(executed, false);
});
test('expired interrupted runs settle reserved usage once and release their conversation lease', async () => {
  const { gateway, db } = await setup(); const usagePath = 'artifacts/app/users/owner/aiUsage/expired'; const runPath = 'artifacts/app/users/owner/aiRuns/interrupted';
  await db.doc(usagePath).set({ reservedTokens: 1000, usedTokens: 12, runs: 1 });
  await db.doc('artifacts/app/users/owner/aiConversations/conversation').set({ uid: 'owner', activeRun: 'interrupted', leaseUntil: Date.now() - 1000 });
  await db.doc(runPath).set({ uid: 'owner', conversationId: 'conversation', provider: 'openai', model: 'test-model', mode: 'builder', status: 'running', content: 'Saved partial', reservation: 1000, usagePath, leaseUntil: Date.now() - 1000, reservationSettled: false });
  const result = await gateway.getRun(request({ runId: 'interrupted' })); assert.equal(result.status, 'failed'); assert.equal(result.content, 'Saved partial');
  assert.equal(db.documents.get(usagePath).reservedTokens, 0); assert.equal(db.documents.get(usagePath).usedTokens, 1012); assert.equal(db.documents.get('artifacts/app/users/owner/aiConversations/conversation').activeRun, null);
  await gateway.getRun(request({ runId: 'interrupted' })); assert.equal(db.documents.get(usagePath).usedTokens, 1012);
});
test('completed runs settle their recorded usage after interruption during final bookkeeping', async () => {
  const { gateway, db } = await setup(); const usagePath = 'artifacts/app/users/owner/aiUsage/completed';
  await db.doc(usagePath).set({ reservedTokens: 1000, usedTokens: 10, runs: 1 });
  await db.doc('artifacts/app/users/owner/aiRuns/done').set({ uid: 'owner', conversationId: 'conversation', provider: 'openai', model: 'test-model', mode: 'builder', status: 'completed', content: 'Saved complete', usage: { inputTokens: 15, outputTokens: 5 }, reservation: 1000, usagePath, leaseUntil: Date.now() - 1000, reservationSettled: false });
  const result = await gateway.getRun(request({ runId: 'done' })); assert.equal(result.status, 'completed'); assert.equal(db.documents.get(usagePath).usedTokens, 30); assert.equal(db.documents.get(usagePath).reservedTokens, 0);
});

test('provider-interrupted failures preserve the ceiling charge if final bookkeeping crashes', async () => {
  const { gateway, db } = await setup(); const usagePath = 'artifacts/app/users/owner/aiUsage/unknown';
  await db.doc(usagePath).set({ reservedTokens: 1000, usedTokens: 10, runs: 1 });
  await db.doc('artifacts/app/users/owner/aiRuns/failed').set({ uid: 'owner', conversationId: 'conversation', provider: 'openai', model: 'test-model', mode: 'builder', status: 'failed', usage: { inputTokens: 0, outputTokens: 0 }, chargeReservation: true, reservation: 1000, usagePath, leaseUntil: Date.now() - 1000, reservationSettled: false });
  assert.equal((await gateway.getRun(request({ runId: 'failed' }))).status, 'failed'); assert.equal(db.documents.get(usagePath).usedTokens, 1010);
});

test('Butler Ask and Plan can read truth but cannot call preview tools, while builder plans stay no-tools', async () => {
  for (const mode of ['ask', 'plan']) {
    let executed = false; let count = 0;
    const tools = [{ name: 'catalog_read', inputSchema: { type: 'object', properties: {} } }, { name: 'catalog_preview', inputSchema: { type: 'object', properties: {} } }];
    const { gateway } = await setup({ resolveContext: async () => ({ tools }), executeTool: async call => { assert.equal(call.name, 'catalog_read'); executed = true; return []; }, providerCall: async (_provider, options) => { assert.deepEqual(options.tools.map(tool => tool.name), ['catalog_read']); return count++ === 0 ? { content: '', calls: [{ id: 'read', name: 'catalog_read', arguments: {} }], native: [], usage: { inputTokens: 1, outputTokens: 1 } } : { content: 'Catalog checked.', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } });
    assert.equal((await gateway.run(request(input({ mode })))).status, 'completed'); assert.equal(executed, true);
    const { gateway: builder } = await setup({ resolveContext: async () => ({ tools }), executeTool: async () => { throw new Error('Forbidden'); }, providerCall: async (_provider, options) => { assert.equal(options.tools.length, 0); return { content: '{"answer":"Plan"}', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } });
    assert.equal((await builder.run(request(input({ mode, format: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false } })))).status, 'completed');
  }
});
