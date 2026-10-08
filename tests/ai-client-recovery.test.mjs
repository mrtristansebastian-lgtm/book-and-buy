import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverDurableRun } from '../src/shared/firebase/aiRunRecovery.js';
import { saveGoogleRedirectIntent, readGoogleRedirectIntent } from '../src/features/auth/googleRedirectIntent.js';

test('run recovery tolerates temporary disconnects, deduplicates events and waits for terminal state', async () => {
  let calls = 0, time = 0; const delivered = [];
  const result = await recoverDurableRun({ runId: 'saved-run', signal: undefined, now: () => time, wait: async duration => { time += duration; }, getRun: async (id, sequence) => { assert.equal(id, 'saved-run'); calls++; if (calls === 1) throw Object.assign(new Error('Offline'), { code: 'functions/unavailable' }); return { status: calls < 4 ? 'running' : 'completed', events: [{ sequence: 1, text: 'Saved' }, { sequence: 2, text: ' progress' }], content: 'Saved progress' }; }, onEvent: event => delivered.push(event) });
  assert.equal(result.status, 'completed'); assert.equal(calls, 4); assert.deepEqual(delivered.map(row => row.sequence), [1, 2]);
});
test('recovery exposes cancellation, missing admissions and timeout without creating another generation', async () => {
  await assert.rejects(recoverDurableRun({ runId: 'saved', signal: AbortSignal.abort(), getRun: async () => { throw new Error('Must not call'); } }), { name: 'AbortError' });
  let time = 0, calls = 0;
  await assert.rejects(recoverDurableRun({ runId: 'missing', signal: undefined, now: () => time, wait: async duration => { time += duration; }, getRun: async () => { calls++; throw Object.assign(new Error('Missing'), { code: 'functions/not-found' }); } }), { code: 'functions/not-found' }); assert.equal(calls, 3);
  time = 0;
  await assert.rejects(recoverDurableRun({ runId: 'saved', signal: undefined, timeoutMs: 3000, now: () => time, wait: async duration => { time += duration; }, getRun: async () => ({ status: 'running' }) }), error => error.name === 'AIRunRecoveryError' && error.runId === 'saved');
});
function storage() { const data = new Map(); return { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key), removeItem: key => data.delete(key) }; }
test('Google redirect continuation preserves audience and public profile return without open redirects or credentials', () => {
  const cache = storage(); saveGoogleRedirectIntent(cache, { audience: 'individual', returnPath: '/w/tea-shop' }, 1000);
  assert.deepEqual(readGoogleRedirectIntent(cache, 1500), { audience: 'individual', returnPath: '/w/tea-shop', createdAt: 1000 });
  assert.equal(readGoogleRedirectIntent(cache, 602000), null);
  for (const returnPath of ['https://attacker.example', '//attacker.example', '/\\attacker.example']) { saveGoogleRedirectIntent(cache, { audience: 'individual', returnPath }, 1000); assert.equal(readGoogleRedirectIntent(cache, 1500).returnPath, ''); }
});
