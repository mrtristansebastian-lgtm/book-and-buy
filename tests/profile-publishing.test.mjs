import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ProfileAddressUnavailableError, writeOwnedPublicProfile } from '../src/shared/firebase/publicProfileOwnership.js';
import { createRequire } from 'node:module';
import { publishBusinessProfile } from '../functions/workspaceCommands.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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

test('publishing saves through the server authority and reports server failures without claiming publication', () => {
  const source = readFileSync(new URL('../src/shared/firebase/integrations.ts', import.meta.url), 'utf8');
  const publisher = source.slice(source.indexOf('export async function publishWorkspaceToFirestore('));
  assert.match(publisher, /await saveOwnerWorkspaceToFirestore/);
  assert.match(publisher, /httpsCallable\(firebase.functions, 'publishBusinessProfile'\)/);
  assert.match(publisher, /if \(result.ok !== true\) throw/);
  assert.match(publisher, /ok: false as const, localOnly: true, reason: error instanceof Error/);
  assert.doesNotMatch(publisher, /await setDoc|planId|planStatus|subscription/);
  const server = readFileSync(new URL('../functions/workspaceCommands.js', import.meta.url), 'utf8');
  const command = server.slice(server.indexOf('export async function publishBusinessProfile('), server.indexOf('export async function getWorkspaceReadiness('));
  assert.match(command, /assertOwner\(ownerId, auth\)/);
  assert.match(command, /db.runTransaction/);
  assert.match(command, /await tx.get\(ref\)/);
  assert.match(command, /existing.data\(\).ownerId !== ownerId/);
  assert.match(command, /tx.set\(ref, snapshot\)/);
});

test('public profile rules reserve all public projection writes for server commands', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const profileRules = rules.slice(rules.indexOf('match /artifacts/{appId}/public/data/workspaces/{slug}'), rules.indexOf('match /bookingSubmissions'));
  assert.match(profileRules, /allow read: if true/);
  assert.match(profileRules, /allow create: if false/);
  assert.match(profileRules, /allow update, delete: if false/);
  assert.doesNotMatch(profileRules, /allow create, update|planId|planStatus|subscription|billing/);
});

const emulatorEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
test('emulator server publication owns the slug while all browser projection writes are denied', { skip: !emulatorEnabled }, async () => {
  const project = process.env.GCLOUD_PROJECT || 'demo-book-buy-agent';
  if (!getApps().length) initializeApp({projectId: project});
  const db = getFirestore();
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
  const ownerA = `profile-owner-a-${crypto.randomUUID()}`, ownerB = `profile-owner-b-${crypto.randomUUID()}`;
  const settings = uid => db.doc(`artifacts/book-and-buy-v1/users/${uid}/config/settings`);
  await settings(ownerA).set({ownerId:ownerA,slug,brandName:'Original profile',products:[],services:[],website:{}});
  await settings(ownerB).set({ownerId:ownerB,slug,brandName:'Other business',products:[],services:[],website:{}});
  const auth = uid => ({uid,token:{email_verified:true,firebase:{sign_in_provider:'password'}}});
  assert.equal((await patch(ownerA,ownerA,'Direct browser creation')).status,403);
  assert.equal((await publishBusinessProfile({ownerId:ownerA},auth(ownerA),db)).ok,true);
  await assert.rejects(publishBusinessProfile({ownerId:ownerB},auth(ownerB),db), /another business/);
  await assert.rejects(publishBusinessProfile({ownerId:ownerA},auth(ownerB),db), /owner/);
  const takeover = await patch(ownerB, ownerB, 'Overwritten profile');
  assert.equal(takeover.status, 403, await takeover.text());
  const spoof = await patch(ownerB, ownerA, 'Spoofed profile');
  assert.equal(spoof.status, 403, await spoof.text());
  const transfer = await patch(ownerA, ownerB, 'Transferred profile');
  assert.equal(transfer.status, 403, await transfer.text());
  const update = await patch(ownerA, ownerA, 'Direct owner update');
  assert.equal(update.status, 403, await update.text());
  await settings(ownerA).update({brandName:'Legitimate server update'});
  await publishBusinessProfile({ownerId:ownerA},auth(ownerA),db);
  const published = (await db.doc(`artifacts/book-and-buy-v1/public/data/workspaces/${slug}`).get()).data();
  assert.equal(published.ownerId,ownerA); assert.equal(published.brandName,'Legitimate server update');
});
