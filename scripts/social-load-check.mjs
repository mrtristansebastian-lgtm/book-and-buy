import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { SOCIAL_COUNTER_SHARDS, socialShardFor, stableSocialKey } from '../functions/socialCore.js';

const actors = 1_000_000;
const counts = Array.from({ length: SOCIAL_COUNTER_SHARDS }, () => 0);
const ids = new Set();
const started = performance.now();
for (let index = 0; index < actors; index += 1) {
  const actor = `load-actor-${index}`;
  counts[socialShardFor(actor)] += 1;
  ids.add(stableSocialKey('like', 'viral-post', actor).slice(0, 48));
}
const elapsedMs = performance.now() - started;
const minimum = Math.min(...counts);
const maximum = Math.max(...counts);
assert.equal(ids.size, actors, 'deterministic mutation keys collided');
assert.ok(maximum / minimum < 1.08, `shard skew was too high: ${minimum}-${maximum}`);
console.log(JSON.stringify({ actors, shards: counts.length, minimum, maximum, skew: maximum / minimum, elapsedMs: Math.round(elapsedMs) }));
