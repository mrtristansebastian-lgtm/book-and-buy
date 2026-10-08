import test from 'node:test';
import assert from 'node:assert/strict';
import { BuilderCodexClient } from '../scripts/builder-codex-client.mjs';

function fakeClient() {
  const client = new BuilderCodexClient(), calls = [];
  client.health = async () => ({ connected: true, models: [{ name: 'test-model', defaultEffort: 'medium', efforts: [{ reasoningEffort: 'medium' }, { reasoningEffort: 'high' }] }] });
  client.request = async (method, params) => {
    calls.push({ method, params });
    if (method === 'thread/start') return { thread: { id: 'thread-test' } };
    if (method === 'turn/start') {
      queueMicrotask(() => {
        const notify = (method, params) => client.listeners.forEach(listener => listener({ method, params: { threadId: 'thread-test', ...params } }));
        notify('item/reasoning/summaryTextDelta', { itemId: 'reasoning-test', summaryIndex: 1, delta: 'Checking catalog connections.' });
        notify('item/reasoning/textDelta', { delta: 'Private reasoning must never reach the UI.' });
        notify('item/completed', { item: { type: 'agentMessage', text: '{"kind":"answer"}', phase: 'final_answer' } });
        notify('turn/completed', { turn: { status: 'completed' } });
      });
      return { turn: { id: 'turn-test' } };
    }
    return {};
  };
  return { client, calls };
}

test('chosen thinking effort and available summaries reach the UI without private reasoning', async () => {
  const { client, calls } = fakeClient(), events = [];
  const result = await client.generate({ model: 'test-model', effort: 'high', conversationId: 'test-chat', messages: [{ role: 'user', content: 'Plan my store.' }], format: { type: 'object' } }, undefined, event => events.push(event));
  const turn = calls.find(call => call.method === 'turn/start').params;
  assert.equal(turn.effort, 'high');
  assert.equal(turn.summary, 'auto');
  assert.equal(result.content, '{"kind":"answer"}');
  assert.deepEqual(events, [{ type: 'summary', text: 'Checking catalog connections.', itemId: 'reasoning-test', part: 1 }]);
  assert.equal(client.listeners.size, 0);
  assert.equal(client.threads.get('test-chat:test-model').busy, false);
});

test('unsupported models or thinking levels fail before starting a generation', async () => {
  const { client, calls } = fakeClient();
  await assert.rejects(client.generate({ model: 'missing-model' }), /available/);
  await assert.rejects(client.generate({ model: 'test-model', effort: 'ultra' }), /supported/);
  assert.equal(calls.length, 0);
});
