import test from 'node:test';
import assert from 'node:assert/strict';
import { butlerIdentity, butlerStorageKeys, matchesConversation, scopedHistory, isCurrentButlerRequest, conversationMessages, restoredRunMessages, updateRunMessage } from '../src/features/butler/butlerConversation.js';

const context = { ownerId: 'owner', uid: 'owner', demo: false, provider: 'chatgpt', mode: 'butler', revision: 'generation-one' };
const scope = { provider: context.provider, mode: context.mode, revision: context.revision };

test('Butler storage separates owners, signed-in identities, providers, billing generations and modes', () => {
  const base = butlerIdentity(context), original = butlerStorageKeys(base);
  for (const change of [{ ownerId: 'other' }, { uid: 'other' }, { demo: true }, { provider: 'openai' }, { mode: 'ask' }, { revision: 'generation-two' }]) {
    const identity = butlerIdentity({ ...context, ...change });
    assert.notEqual(identity, base);
    assert.notEqual(butlerStorageKeys(identity).run, original.run);
    assert.notEqual(butlerStorageKeys(identity).conversation, original.conversation);
  }
});

test('history and restored runs use the same exact provider, mode, connection and conversation contract', () => {
  const matching = { provider: 'chatgpt', mode: 'butler', connectionRevision: 'generation-one', conversationId: 'one' };
  const rows = [matching, { ...matching, provider: 'openai' }, { ...matching, mode: 'builder' }, { ...matching, mode: 'ask' }, { ...matching, connectionRevision: 'generation-two' }, { ...matching, connectionRevision: undefined }];
  assert.deepEqual(scopedHistory(rows, scope), [matching]);
  assert.equal(matchesConversation(matching, { ...scope, conversationId: 'two' }), false);
  assert.equal(matchesConversation(matching, { ...scope, conversationId: 'one' }), true);
});

test('late history, approval and stream results cannot enter a new chat or a switched account', async () => {
  const captured = { identity: butlerIdentity(context), epoch: 1, conversationId: 'one' };
  for (const replacement of [{ ...captured, epoch: 2 }, { ...captured, conversationId: 'two' }, { ...captured, identity: butlerIdentity({ ...context, uid: 'other' }) }, { ...captured, identity: butlerIdentity({ ...context, revision: 'generation-two' }) }]) {
    let release, applied = 0;
    const pending = new Promise(resolve => { release = resolve; });
    const result = pending.then(() => { if (isCurrentButlerRequest(captured, replacement)) applied++; });
    release(); await result; assert.equal(applied, 0);
  }
  assert.equal(isCurrentButlerRequest(captured, { ...captured }), true);
});

test('recovering a durable run replaces streamed fragments and preserves the rest of the transcript', () => {
  const initial = conversationMessages({ turns: [{ runId: 'first', user: 'First question', assistant: 'First answer' }, { runId: 'saved', user: 'Second question', assistant: 'Partial' }] });
  const streamed = updateRunMessage(initial, 'saved', ' fragment', { append: true });
  const recovered = restoredRunMessages(streamed, { runId: 'saved', content: 'Full authoritative answer' });
  assert.equal(recovered.length, 4);
  assert.deepEqual(recovered.slice(0, 3), initial.slice(0, 3));
  assert.equal(recovered[3].content, 'Full authoritative answer');
  assert.deepEqual(restoredRunMessages(recovered, { runId: 'saved', content: 'Full authoritative answer' }), recovered);
  assert.equal(restoredRunMessages(recovered, { runId: 'saved', content: '' })[3].content, '');
});
