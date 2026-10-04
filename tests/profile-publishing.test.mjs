import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProfileAddressUnavailableError, writeOwnedPublicProfile } from '../src/shared/firebase/publicProfileOwnership.js';

function transactionFixture(existing) {
  const writes = [];
  const reference = { path: 'artifacts/book-and-buy-v1/public/data/workspaces/profile-address' };
  const transaction = {
    get: async (ref) => {
      assert.equal(ref, reference);
      return { exists: () => existing !== undefined, data: () => existing };
    },
    set: (...args) => writes.push(args)
  };
  return { transaction, reference, writes };
}

test('a new free owner may claim an unused profile address without billing fields', async () => {
  const { transaction, reference, writes } = transactionFixture();
  const profile = { ownerId: 'owner-a', slug: 'profile-address', brandName: 'Free business' };
  await writeOwnedPublicProfile(transaction, reference, profile);
  assert.deepEqual(writes, [[reference, profile, { merge: true }]]);
});

test('same-owner profile edits retain the same slug and ownership', async () => {
  const { transaction, reference, writes } = transactionFixture({ ownerId: 'owner-a', brandName: 'Old name' });
  const profile = { ownerId: 'owner-a', slug: 'profile-address', brandName: 'Updated name' };
  await writeOwnedPublicProfile(transaction, reference, profile);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1].ownerId, 'owner-a');
});

test('a different or missing existing owner cannot be replaced by a profile publication', async () => {
  for (const existing of [{ ownerId: 'owner-b' }, {}, { ownerId: null }]) {
    const { transaction, reference, writes } = transactionFixture(existing);
    await assert.rejects(writeOwnedPublicProfile(transaction, reference, { ownerId: 'owner-a' }), ProfileAddressUnavailableError);
    assert.equal(writes.length, 0);
  }
});

test('missing caller ownership fails before an address is read or written', async () => {
  let reads = 0;
  let writes = 0;
  await assert.rejects(writeOwnedPublicProfile({ get: () => reads++, set: () => writes++ }, {}, {}), /Sign in as the owner/);
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test('publishing performs the ownership check and write in one transaction and reports address conflicts', () => {
  const source = readFileSync(new URL('../src/shared/firebase/integrations.ts', import.meta.url), 'utf8');
  const publisher = source.slice(source.indexOf('export async function publishWorkspaceToFirestore('));
  assert.match(publisher, /await runTransaction\(firebase\.db, \(transaction\) =>\s*writeOwnedPublicProfile\(transaction,/);
  assert.match(publisher, /error instanceof ProfileAddressUnavailableError/);
  assert.match(publisher, /ok: false as const, localOnly: true, reason: error\.message/);
  assert.doesNotMatch(publisher, /await setDoc|planId|planStatus|subscription/);
});

test('public profile rules authorize create separately and require immutable existing ownership for updates', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const profileRules = rules.slice(rules.indexOf('match /artifacts/{appId}/public/data/workspaces/{slug}'), rules.indexOf('match /bookingSubmissions'));
  assert.match(profileRules, /allow create: if signedIn\(\) &&\s*request\.resource\.data\.ownerId is string &&\s*canAdmin\(appId, request\.resource\.data\.ownerId\)/);
  assert.match(profileRules, /allow update: if signedIn\(\) &&\s*resource\.data\.ownerId is string &&\s*request\.resource\.data\.ownerId == resource\.data\.ownerId &&\s*canAdmin\(appId, resource\.data\.ownerId\)/);
  assert.doesNotMatch(profileRules, /allow create, update|planId|planStatus|subscription|billing/);
});

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
test('emulator rules prevent cross-owner slug overwrite and ownership transfer but allow same-owner updates', { skip: !emulatorEnabled }, async () => {
  const project = 'demo-book-buy';
  const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
  const slug = `profile-rules-${crypto.randomUUID()}`;
  const path = `/artifacts/book-and-buy-v1/public/data/workspaces/${slug}`;
  const token = (uid) => {
    const now = Math.floor(Date.now() / 1000);
    return [{ alg: 'none', typ: 'JWT' }, { iss: `https://securetoken.google.com/${project}`, aud: project,
      sub: uid, user_id: uid, iat: now, exp: now + 3600, email: `${uid}@example.test`, email_verified: true,
      firebase: { sign_in_provider: 'password' } }].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.';
  };
  const patch = (actor, ownerId, name) => fetch(endpoint + path, {
    method: 'PATCH', headers: { authorization: `Bearer ${token(actor)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { ownerId: { stringValue: ownerId }, slug: { stringValue: slug }, brandName: { stringValue: name } } })
  });
  const created = await patch('profile-owner-a', 'profile-owner-a', 'Original profile');
  assert.equal(created.status, 200, await created.text());
  const takeover = await patch('profile-owner-b', 'profile-owner-b', 'Overwritten profile');
  assert.equal(takeover.status, 403, await takeover.text());
  const spoof = await patch('profile-owner-b', 'profile-owner-a', 'Spoofed profile');
  assert.equal(spoof.status, 403, await spoof.text());
  const transfer = await patch('profile-owner-a', 'profile-owner-b', 'Transferred profile');
  assert.equal(transfer.status, 403, await transfer.text());
  const update = await patch('profile-owner-a', 'profile-owner-a', 'Legitimate update');
  assert.equal(update.status, 200, await update.text());
});
