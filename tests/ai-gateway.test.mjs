import test from 'node:test';
import assert from 'node:assert/strict';
import { createAIGateway } from '../functions/ai/index.js';
import { decryptSecret } from '../functions/payments/encrypt.js';
import { encryptSecret } from '../functions/payments/encrypt.js';

function memoryDB() {
  const documents = new Map();
  const snapshot = (path) => ({ exists: documents.has(path), id: path.split('/').at(-1), ref: doc(path), data: () => structuredClone(documents.get(path)) });
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path), set: async (value) => documents.set(path, structuredClone(value)), update: async value => documents.set(path, { ...documents.get(path), ...structuredClone(value) }), delete: async () => documents.delete(path), collection: name => collection(`${path}/${name}`) });
  const collection = (path, { filters = [], order, limit = Infinity, group = false } = {}) => ({ doc: id => doc(`${path}/${id}`), where: (field, op, value) => collection(path, { filters: [...filters, [field, op, value]], order, limit, group }), orderBy: (field, direction = 'asc') => collection(path, { filters, order: [field, direction], limit, group }), limit: value => collection(path, { filters, order, limit: value, group }), get: async () => ({ docs: [...documents.keys()].filter(key => (group ? key.split('/').at(-2) === path : key.startsWith(`${path}/`) && key.slice(path.length + 1).split('/').length === 1) && filters.every(([field, op, value]) => op === '==' ? documents.get(key)[field] === value : documents.get(key)[field] <= value)).sort((a, b) => order ? (documents.get(a)[order[0]] > documents.get(b)[order[0]] ? 1 : -1) * (order[1] === 'desc' ? -1 : 1) : a.localeCompare(b)).slice(0, limit).map(snapshot) }) });
  let lock = Promise.resolve();
  return { documents, doc, collection, collectionGroup: path => collection(path, { group: true }), runTransaction: async callback => {
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
  let gateway;
  const fixture = await setup({ providerCall: async (_provider, _input, { onText }) => { await onText('Partial'); await gateway.cancelRun(request({ runId: 'request' })); return { content: 'Final', calls: [], native: [], usage: { inputTokens: 12, outputTokens: 8 } }; } }); gateway = fixture.gateway; const { db } = fixture;
  const result = await gateway.run(request(input()), { sendChunk: async () => true });
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
  await assert.rejects(gateway.run(request(input({ requestId: 'stale-conversation' }))), { code: 'failed-precondition' });
  await gateway.run(request(input({ requestId: 'second', conversationId: 'second-conversation' }))); await gateway.selectBilling(request({ provider: 'openai', billing: 'personal' }));
  await gateway.run(request(input({ requestId: 'third', conversationId: 'third-conversation' }))); assert.deepEqual(keys, [personal, env.OPENAI_API_KEY, personal]);
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

test('durable runs survive a lost transport and restored conversations remain owner private', async () => {
  let calls = 0;
  const { gateway } = await setup({ providerCall: async (_provider, _input, { onText }) => { calls++; await onText('Saved response'); return { content: 'Saved response', calls: [], native: [], usage: { inputTokens: 3, outputTokens: 4 } }; } });
  const result = await gateway.run(request(input()), { signal: AbortSignal.abort(), sendChunk: async () => { throw new Error('Transport closed'); } });
  assert.equal(result.status, 'completed'); assert.equal(calls, 1);
  const restored = await gateway.getConversation(request({ conversationId: 'conversation' }));
  assert.equal(restored.activeRun, null); assert.deepEqual(restored.turns.map(turn => [turn.user, turn.assistant, turn.status]), [['Create a homepage.', 'Saved response', 'completed']]);
  assert.equal((await gateway.listConversations(request())).conversations[0].conversationId, 'conversation');
  await assert.rejects(gateway.getConversation(request({ conversationId: 'conversation' }, 'other')), { code: 'not-found' });
});

test('thinking choices are validated, forwarded and part of idempotent request identity', async () => {
  const configured = { ...env, AI_OPENAI_MODELS: 'gpt-6.1-sol', AI_OPENAI_DEFAULT_MODEL: 'gpt-6.1-sol' }; let received;
  const { gateway } = await setup({ env: configured, providerCall: async (_provider, input) => { received = input; return { content: 'Done', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 2 } }; } });
  const models = (await gateway.listModels(request())).providers.find(row => row.provider === 'openai');
  assert.ok(models.models[0].efforts.some(row => row.reasoningEffort === 'high')); assert.equal(models.models[0].defaultEffort, 'medium');
  await assert.rejects(gateway.run(request(input({ model: 'gpt-6.1-sol', reasoningEffort: 'ultra' }))), { code: 'invalid-argument' });
  assert.equal((await gateway.run(request(input({ model: 'gpt-6.1-sol', reasoningEffort: 'high' })))).status, 'completed'); assert.equal(received.reasoningEffort, 'high');
  await assert.rejects(gateway.run(request(input({ model: 'gpt-6.1-sol', reasoningEffort: 'low' }))), { code: 'already-exists' });
});

test('ChatGPT catalog reflects account order and hidden/unentitled models fail before inference', async () => {
  const configured = { ...env, AI_CHATGPT_MODELS: 'gpt-6.1-sol,gpt-6-luna', AI_CHATGPT_DEFAULT_MODEL: 'gpt-6.1-sol', AI_CHATGPT_OAUTH_ENABLED: 'true', AI_CHATGPT_INFERENCE_APPROVED: 'true', OPENAI_CLIENT_ID: 'oaiapp_test', CHATGPT_REDIRECT_URI: 'https://example.com/api/ai/chatgpt', CHATGPT_RETURN_URL: 'https://example.com/#/dashboard/settings/ai', CHATGPT_TOKEN_AUTH_METHOD: 'none' };
  let inference = 0;
  const { gateway, db } = await setup({ env: configured, fetchImpl: async url => { assert.equal(url, 'https://api.openai.com/v1/models'); return new Response(JSON.stringify({ models: [{ slug: 'gpt-6-luna', display_name: 'GPT-6 Luna', visibility: 'list' }, { slug: 'gpt-6.1-sol', visibility: 'hide' }] }), { headers: { 'Content-Type': 'application/json' } }); }, providerCall: async () => { inference++; throw new Error('Must not infer'); } });
  await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set({ connected: true, type: 'oauth', clientId: 'oaiapp_test', issuer: 'https://auth.openai.com', generation: 'one', subject: 'subject', planUsageAcknowledgedVersion: '2026-10-08', expiresAt: Date.now() + 3600000, encrypted: encryptSecret(JSON.stringify({ accessToken: 'server-token', refreshToken: 'refresh-token' }), env.AI_SETTINGS_ENCRYPTION_KEY) });
  const models = (await gateway.listModels(request())).providers.find(row => row.provider === 'chatgpt');
  assert.deepEqual(models.models.map(row => row.name), ['gpt-6-luna']); assert.equal(models.defaultModel, 'gpt-6-luna');
  await assert.rejects(gateway.run(request(input({ provider: 'chatgpt', model: 'gpt-6.1-sol' }))), { code: 'permission-denied' }); assert.equal(inference, 0);
});

test('scheduled recovery settles abandoned runs once and removes expired authorization state', async () => {
  const { gateway, db } = await setup(); const usagePath = 'artifacts/app/users/owner/aiUsage/expired';
  await db.doc(usagePath).set({ reservedTokens: 1000, usedTokens: 12 });
  await db.doc('artifacts/app/users/owner/aiRuns/expired').set({ uid: 'owner', conversationId: 'conversation', provider: 'openai', status: 'running', reservation: 1000, reservationSettled: false, usagePath, leaseUntil: Date.now() - 1, startedAt: Date.now() - 400000 });
  await db.doc('artifacts/app/aiOAuthStates/expired').set({ expiresAt: Date.now() - 1 }); await db.doc('artifacts/app/aiOAuthStates/live').set({ expiresAt: Date.now() + 600000 });
  assert.equal((await gateway.reconcileInterruptedRuns()).recovered, 1); assert.equal(db.documents.get(usagePath).usedTokens, 1012); assert.equal((await gateway.reconcileInterruptedRuns()).recovered, 0);
  assert.equal((await gateway.cleanupOAuthStates()).removed, 1); assert.ok(db.documents.has('artifacts/app/aiOAuthStates/live'));
});

test('a rejected request before inference releases its reservation without charging unknown usage', async () => {
  const { gateway, db } = await setup({ providerCall: async () => { throw Object.assign(new Error('Provider account unavailable'), { code: 'failed-precondition', noInferenceStarted: true, details: { httpStatus: 401, rawSecret: 'private-token' } }); } });
  const result = await gateway.run(request(input())); assert.equal(result.status, 'failed'); assert.equal(result.error.details.httpStatus, 401); assert.ok(!JSON.stringify(result).includes('private-token'));
  const usage = [...db.documents.entries()].find(([path]) => path.includes('/aiUsage/'))[1]; assert.equal(usage.usedTokens, 0); assert.equal(usage.reservedTokens, 0);
});

test('cancellation arriving before run admission still prevents paid inference', async () => {
  let called = false; const { gateway, db } = await setup({ providerCall: async () => { called = true; throw new Error('Must not infer'); } });
  await gateway.cancelRun(request({ runId: 'request' })); const result = await gateway.run(request(input()));
  assert.equal(result.status, 'cancelled'); assert.equal(called, false); assert.ok(![...db.documents.keys()].some(path => path.includes('/aiUsage/')));
  assert.equal((await gateway.run(request(input()))).status, 'cancelled'); assert.equal(db.documents.get('artifacts/app/users/owner/aiCancellationRequests/request'), undefined);
});


test('connection revisions pin history and reject stale requests before inference', async () => {
  let calls = 0; const { gateway } = await setup({ providerCall: async () => { calls++; return { content: 'Done', calls: [], native: [], usage: { inputTokens: 1, outputTokens: 1 } }; } });
  const original = (await gateway.listConnections(request())).connections.find(row => row.provider === 'openai');
  const admitted = await gateway.run(request(input({ connectionRevision: original.revision })));
  assert.equal(admitted.connectionRevision, original.revision);
  assert.equal((await gateway.getConversation(request({ conversationId: 'conversation' }))).connectionRevision, original.revision);
  assert.equal((await gateway.listConversations(request())).conversations[0].connectionRevision, original.revision);
  const changed = await gateway.saveConnection(request({ provider: 'openai', apiKey: 'sk-personal-api-key-12345678' }));
  assert.notEqual(changed.revision, original.revision);
  await assert.rejects(gateway.run(request(input({ requestId: 'stale', conversationId: 'new-chat', connectionRevision: original.revision }))), { code: 'aborted' });
  await assert.rejects(gateway.run(request(input({ requestId: 'old-chat', connectionRevision: changed.revision }))), { code: 'failed-precondition' });
  assert.equal(calls, 1);
  assert.equal((await gateway.run(request(input({ requestId: 'new-request', conversationId: 'new-chat', connectionRevision: changed.revision })))).status, 'completed');
  assert.equal((await gateway.run(request(input({ connectionRevision: original.revision })))).runId, admitted.runId);
  assert.equal(calls, 2);
});
test('unsupported AI attachments fail before inference or allowance reservation', async () => {
  let calls=0;
  const {gateway,db}=await setup({providerCall:async () => {calls++;throw new Error('This provider must not be called.');}});
  await assert.rejects(gateway.run(request(input({attachments:[{name:'reference.png',url:'data:image/png;base64,abc'}]}))),{code:'invalid-argument'});
  assert.equal(calls,0);
  assert.equal([...db.documents.keys()].some(path => path.includes('/aiUsage/') || path.includes('/aiRuns/')),false);
});


test('approval gates reject discovery, authorization and inference without contacting OpenAI', async () => {
  let network = 0; const { gateway } = await setup({ env: { ...env, AI_CHATGPT_MODELS: 'test-model', AI_CHATGPT_DEFAULT_MODEL: 'test-model', AI_CHATGPT_OAUTH_ENABLED: 'false', AI_CHATGPT_INFERENCE_APPROVED: 'false' }, fetchImpl: async () => { network++; throw new Error('Forbidden'); }, providerCall: async () => { network++; throw new Error('Forbidden'); } });
  const connection = (await gateway.listConnections(request())).connections.find(row => row.provider === 'chatgpt'); assert.equal(connection.status, 'approval-pending'); assert.equal(connection.capabilities.planInference, false);
  assert.equal((await gateway.listModels(request())).providers.find(row => row.provider === 'chatgpt').available, false);
  await assert.rejects(gateway.startChatGPT(request()), { code: 'unavailable' });
  await assert.rejects(gateway.run(request(input({ provider: 'chatgpt' }))), { code: 'unavailable' });
  await assert.rejects(gateway.acknowledgePlanUsage(request({ noticeVersion: '2026-10-08' })), { code: 'failed-precondition' }); assert.equal(network, 0);
});

test('ChatGPT requires versioned plan acknowledgement, rejects scheduler intents and reserves no API budget', async () => {
  const configured = { ...env, AI_CHATGPT_MODELS: 'test-model', AI_CHATGPT_DEFAULT_MODEL: 'test-model', AI_CHATGPT_OAUTH_ENABLED: 'true', AI_CHATGPT_INFERENCE_APPROVED: 'true', OPENAI_CLIENT_ID: 'oaiapp_test', CHATGPT_REDIRECT_URI: 'https://example.com/api/ai/chatgpt', CHATGPT_RETURN_URL: 'https://example.com/#/dashboard/settings/ai', CHATGPT_TOKEN_AUTH_METHOD: 'none', AI_BYOK_DAILY_TOKENS: '1' };
  let calls = 0; const { gateway, db } = await setup({ env: configured, fetchImpl: async () => new Response(JSON.stringify({ models: [{ slug: 'test-model', visibility: 'list' }] }), { headers: { 'Content-Type': 'application/json' } }), providerCall: async () => { calls++; return { content: 'Plan answer', calls: [], native: [], usage: { inputTokens: 10, outputTokens: 5 } }; } });
  await db.doc('artifacts/app/users/owner/aiConnections/chatgpt').set({ connected: true, type: 'oauth', clientId: 'oaiapp_test', issuer: 'https://auth.openai.com', generation: 'one', subject: 'subject', expiresAt: Date.now() + 3600000, encrypted: encryptSecret(JSON.stringify({ accessToken: 'mock-token', refreshToken: 'mock-refresh' }), env.AI_SETTINGS_ENCRYPTION_KEY) });
  const row = (await gateway.listConnections(request())).connections.find(row => row.provider === 'chatgpt');
  await assert.rejects(gateway.run(request(input({ provider: 'chatgpt' }))), { code: 'failed-precondition' }); assert.equal(calls, 0);
  await assert.rejects(gateway.acknowledgePlanUsage(request({ expectedRevision: 'stale', noticeVersion: row.noticeVersion })), { code: 'aborted' });
  await gateway.acknowledgePlanUsage(request({ expectedRevision: row.revision, noticeVersion: row.noticeVersion }));
  assert.equal((await gateway.listConnections(request())).connections.find(row => row.provider === 'chatgpt').revision, row.revision);
  await assert.rejects(gateway.run(request(input({ provider: 'chatgpt', executionKind: 'scheduled' }))), { code: 'permission-denied' });
  assert.equal((await gateway.run(request(input({ provider: 'chatgpt' })))).status, 'completed'); assert.equal(calls, 1);
  const run = db.documents.get('artifacts/app/users/owner/aiRuns/request'); assert.equal(run.billing, 'chatgpt'); assert.equal(run.reservation, 0);
});

test('conversation deletion removes content, keeps business records and blocks replay and new writes', async () => {
  const { gateway, db } = await setup(); await gateway.run(request(input()));
  await db.doc('artifacts/app/users/owner/orders/order').set({ total: 500 });
  await db.doc('artifacts/app/users/owner/butlerPreviews/review').set({ conversationId: 'conversation', status: 'pending', args: { private: 'content' }, command: { operation: 'write' } });
  const row = (await gateway.listConversations(request())).conversations[0];
  await assert.rejects(gateway.deleteConversation(request({ conversationId: 'conversation', requestId: 'delete', expectedUpdatedAt: row.updatedAt - 1 })), { code: 'aborted' });
  assert.equal((await gateway.deleteConversation(request({ conversationId: 'conversation', requestId: 'delete', expectedUpdatedAt: row.updatedAt }))).status, 'deleted');
  assert.equal((await gateway.deleteConversation(request({ conversationId: 'conversation', requestId: 'repeat' }))).status, 'deleted');
  assert.equal(db.documents.get('artifacts/app/users/owner/aiConversations/conversation').status, 'deleted');
  assert.equal(db.documents.get('artifacts/app/users/owner/orders/order').total, 500);
  assert.equal(db.documents.get('artifacts/app/users/owner/butlerPreviews/review').status, 'dismissed'); assert.equal(db.documents.get('artifacts/app/users/owner/butlerPreviews/review').args, null);
  assert.equal((await gateway.listConversations(request())).conversations.length, 0);
  assert.ok(![...db.documents.keys()].some(path => path.includes('/aiRuns/') || path.includes('/turns/')));
  await assert.rejects(gateway.getRun(request({ runId: 'request' })), { code: 'not-found' });
  await assert.rejects(gateway.run(request(input())), { code: 'not-found' });
  await assert.rejects(gateway.run(request(input({ requestId: 'late' }))), { code: 'not-found' });
});
