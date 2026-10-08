import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('../public/builder/local-services.js', import.meta.url), 'utf8');
const project = () => ({ id: 'design-one', name: 'My website', html: '<html><body>Saved design</body></html>', files: { 'index.html': '<html><body>Saved design</body></html>' }, assets: { 'logo.png': { url: 'https://assets.example/logo.png', previewUrl: 'data:image/png;base64,aGVsbG8=', mime: 'image/png', size: 5 } }, entryFile: 'index.html' });
function databaseFixture() {
  const stores = new Map([['projects', new Map()], ['versions', new Map()]]);
  const database = { transaction(name) { const transaction = { objectStore() { const rows = stores.get(name); return { get(key) { return { result: structuredClone(rows.get(key)) }; }, put(value, key) { rows.set(key, structuredClone(value)); return { result: key }; } }; } }; queueMicrotask(() => transaction.oncomplete?.()); return transaction; } };
  return { stores, indexedDB: { open() { const request = {}; queueMicrotask(() => { request.result = database; request.onsuccess?.(); }); return request; } } };
}
function hostFixture() {
  const receipts = new Map(), saves = [], state = { revision: 0, project: null, failAfterCommit: false, unavailable: false };
  return { state, saves, async hostRequest(operation, data) {
    if (state.unavailable) throw new Error('Sign in to connect your account.');
    if (operation === 'website.draft.load') return { project: state.project, revision: state.revision, versionId: 'loaded', savedAt: 100 };
    if (operation !== 'website.draft.save') throw new Error('Unsupported test operation.');
    if (receipts.has(data.requestId)) return receipts.get(data.requestId);
    if (data.expectedRevision !== state.revision) throw Object.assign(new Error('This cloud draft changed on another device. Your local draft is kept.'), { code: 'functions/aborted' });
    state.revision++; state.project = structuredClone(data.project); saves.push(structuredClone(data));
    const result = { projectId: data.project.id, revision: state.revision, versionId: data.requestId, savedAt: 100, issues: [] }; receipts.set(data.requestId, result);
    if (state.failAfterCommit) { state.failAfterCommit = false; throw new Error('The connection ended.'); }
    return result;
  } };
}
function adapters(db, host, remembered = {}) {
  const events = [], values = new Map(Object.entries(remembered)), localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const window = { dispatchEvent: event => events.push(event), BookBuyCommerce: { hostRequest: host.hostRequest.bind(host) } };
  runInNewContext(source, { window, location: { search: '?workspace=owner-one', hostname: 'owner.example.com' }, URLSearchParams, localStorage, indexedDB: db.indexedDB, crypto: webcrypto, structuredClone, CustomEvent: class { constructor(type, value) { this.type = type; this.detail = value.detail; } }, DOMException });
  return { ...window.BOOKBUY_SERVICES, events, connection: window.BookBuyLocalAI, preferences: values };
}

test('interrupted cloud save recovers its persisted request after refresh without creating another version', async () => {
  const db = databaseFixture(), host = hostFixture(), first = adapters(db, host);
  host.state.failAfterCommit = true;
  assert.equal((await first.projects.saveDraft({ project: project() })).cloudSaved, false);
  assert.equal(host.saves.length, 1);
  const pending = db.stores.get('projects').get('pending:owner-one'); assert.equal(pending.requestId, host.saves[0].requestId);
  const refreshed = adapters(db, host); const restored = await refreshed.projects.loadDraft();
  assert.equal(restored.html, project().html); assert.equal(host.saves.length, 1); assert.equal(db.stores.get('projects').get('pending:owner-one'), null);
  await refreshed.projects.saveDraft({ project: project() }); assert.equal(host.saves.length, 1, 'Unchanged drafts do not create duplicate cloud versions');
  assert.equal(host.saves[0].project.assets['logo.png'].url, project().assets['logo.png'].previewUrl);
});

test('stale cloud revisions retain local work and publishing flush cannot claim a successful sync', async () => {
  const db = databaseFixture(), host = hostFixture(), client = adapters(db, host);
  await client.projects.saveDraft({ project: project() });
  host.state.revision = 2;
  const changed = { ...project(), html: '<html><body>Local change</body></html>' };
  assert.equal((await client.projects.saveDraft({ project: changed })).cloudSaved, false);
  assert.equal(db.stores.get('projects').get('draft:owner-one').html, changed.html);
  assert.equal(client.events.at(-1).detail.conflict, true);
  await assert.rejects(client.projects.flush({ project: changed }), /has not synced/);
  assert.equal(host.state.project.html, project().html);
  const cloud = await client.projects.useCloudDraft(); assert.equal(cloud.html, project().html); assert.equal(db.stores.get('projects').get('pending:owner-one'), null);
});

test('offline saves remain honest and production adapters never select a remembered local Codex connection', async () => {
  const db = databaseFixture(), host = hostFixture(), client = adapters(db, host, { 'bookbuy-builder-provider': 'codex' }); host.state.unavailable = true;
  assert.equal(client.connection.provider, 'openai');
  const saved = await client.projects.saveDraft({ project: project() }); assert.equal(saved.cloudSaved, false);
  assert.equal(client.events.at(-1).detail.state, 'local');
  assert.equal((await client.projects.loadDraft()).html, project().html);
});
test('AI account changes use separate conversation identities while keeping the owner design draft shared', async () => {
  const db = databaseFixture(), host = hostFixture(), client = adapters(db, host);
  await client.projects.saveDraft({ project: project() });
  client.ai.selectConnectionRevision('first-account-revision');
  const first = client.events.at(-1).detail.conversationId;
  client.ai.selectConnectionRevision('second-account-revision');
  const second = client.events.at(-1).detail.conversationId;
  assert.notEqual(first, second);
  client.ai.selectConnectionRevision('first-account-revision'); assert.equal(client.events.at(-1).detail.conversationId, first);
  assert.equal(db.stores.get('projects').get('draft:owner-one').id, project().id);
  assert.equal(client.preferences.has('bookbuy-builder-conversation:owner-one:openai:first-account-revision:build:gpt-6.1-sol:medium'), true);
});

test('mode, model and thinking changes start separate conversations and cannot restore mismatched history', async () => {
  const db = databaseFixture(), host = hostFixture(), historyRequests = [];
  let returnedMode = 'builder', returnedEffort = 'medium';
  const normalRequest = host.hostRequest;
  host.hostRequest = async function (operation, data) {
    if (operation !== 'ai.conversation') return normalRequest.call(this, operation, data);
    historyRequests.push(data.conversationId);
    return { conversationId: data.conversationId, provider: 'openai', model: 'gpt-6.1-sol', connectionRevision: 'account', mode: returnedMode, reasoningEffort: returnedEffort, turns: [] };
  };
  const client = adapters(db, host);
  client.ai.selectConnectionRevision('account');
  const original = client.events.at(-1).detail.conversationId;
  await client.ai.restoreConversation(); assert.equal(client.events.at(-1).type, 'bookbuy-ai-history');
  client.connection.mode = 'plan'; client.ai.newConversation();
  const planned = client.events.at(-1).detail.conversationId; assert.notEqual(planned, original);
  assert.equal(client.preferences.get('bookbuy-builder-conversation:owner-one:openai:account:plan:gpt-6.1-sol:medium'), planned);
  await client.ai.restoreConversation(); assert.equal(client.events.at(-1).type, 'bookbuy-ai-new-conversation', 'A build transcript cannot restore into Plan.');
  returnedMode = 'plan'; returnedEffort = 'high';
  await client.ai.restoreConversation(); assert.equal(client.events.at(-1).type, 'bookbuy-ai-new-conversation', 'A different thinking effort cannot restore.');
  client.connection.effort = 'high'; client.ai.newConversation();
  const thoughtful = client.events.at(-1).detail.conversationId;
  assert.equal(client.preferences.get('bookbuy-builder-conversation:owner-one:openai:account:plan:gpt-6.1-sol:high'), thoughtful);
  await client.ai.restoreConversation(); assert.equal(client.events.at(-1).type, 'bookbuy-ai-history');
  client.connection.model = 'another-model'; client.ai.newConversation();
  assert.notEqual(client.events.at(-1).detail.conversationId, thoughtful);
  assert.equal(client.preferences.has('bookbuy-builder-conversation:owner-one:openai:account:plan:another-model:high'), true);
  const refreshed = adapters(db, host, Object.fromEntries(client.preferences)); refreshed.ai.selectConnectionRevision('account');
  assert.equal(refreshed.events.at(-1).detail.conversationId, original, 'Reloading in Build cannot recover the Plan conversation.');
  assert.equal(historyRequests.includes(original), true);
});

test('unsupported AI attachments fail visibly before an inference request or draft mutation', async () => {
  const db = databaseFixture(), host = hostFixture(), client = adapters(db, host);
  let started = false;
  assert.equal(client.ai.supportsAttachments, false);
  await assert.rejects(client.ai.sendPrompt({ prompt: 'Use this picture in my design.', attachments: [{ name: 'reference.png', type: 'image/png', size: 100 }] }, { onStart() { started = true; } }), /AI attachments aren’t supported yet; import website files through Chat tools/);
  assert.equal(started, false);
  assert.equal(host.saves.length, 0);
  assert.equal(db.stores.get('projects').size, 0);
});
