import { getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes, createHash } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { HttpsError } from 'firebase-functions/v2/https';
import { normalizeDomain, hostingStatus, dnsRecords } from './domainValidation.js';

const APP = process.env.APP_ID || 'book-and-buy-v1';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const fail = (code, message) => { throw new HttpsError(code, message); };
const ownerRef = (db, uid) => db.doc(`artifacts/${APP}/users/${uid}/private/customDomain`);

function requireOwner(auth) {
  if (!auth?.uid || !auth.token?.email_verified) fail('permission-denied', 'Sign in with a verified business account to manage a domain.');
  if (process.env.CUSTOM_DOMAINS_ENABLED !== 'true' || !process.env.CUSTOM_DOMAIN_SITE_ID) fail('failed-precondition', 'Domain connections are not enabled yet. Your existing Book & Buy address continues to work.');
  return auth.uid;
}

async function hosting(domain, method = 'GET') {
  const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
  const site = process.env.CUSTOM_DOMAIN_SITE_ID;
  const token = await getApp().options.credential.getAccessToken();
  const parent = `https://firebasehosting.googleapis.com/v1beta1/projects/${encodeURIComponent(project)}/sites/${encodeURIComponent(site)}/customDomains`;
  const url = method === 'POST' ? `${parent}?customDomainId=${encodeURIComponent(domain)}` : `${parent}/${encodeURIComponent(domain)}`;
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}), signal: AbortSignal.timeout(15000) });
  if (response.status === 404 && method === 'GET') return null;
  if (response.status === 409 && method === 'POST') return { pending: true };
  if (!response.ok) fail('unavailable', 'Hosting could not complete this check. Your domain has not been marked connected. Please try again later.');
  return response.json();
}

export async function manageCustomDomain(data, auth) {
  const uid = requireOwner(auth);
  const db = getFirestore();
  const ref = ownerRef(db, uid);
  const action = data.action;
  if (!['load', 'prepare', 'check'].includes(action)) fail('invalid-argument', 'Unsupported domain action.');
  if (action === 'load') return { connection: (await ref.get()).data() || null };
  if (action === 'prepare') {
    let domain;
    try { domain = normalizeDomain(data.domain); } catch (error) { fail('invalid-argument', error.message); }
    const profile = (await db.doc(`artifacts/${APP}/users/${uid}/config/settings`).get()).data();
    const slug = profile?.slug;
    if (!slug) fail('failed-precondition', 'Publish your business page before connecting a domain.');
    const published = (await db.doc(`artifacts/${APP}/public/data/workspaces/${slug}`).get()).data();
    if (published?.ownerId !== uid) fail('failed-precondition', 'Publish a business page owned by this account first.');
    await db.runTransaction(async (tx) => {
      const old = (await tx.get(ref)).data();
      if (old && old.domain !== domain) fail('failed-precondition', 'This account already has a domain setup. Contact support to change it safely.');
      if (old) return;
      tx.set(ref, { domain, slug, status: 'awaiting_verification', verificationHost: `_bookandbuy.${domain}`, verificationValue: `bookandbuy-verification=${randomBytes(24).toString('hex')}`, createdAt: FieldValue.serverTimestamp() });
    });
    return { connection: (await ref.get()).data() };
  }
  // Acquire a short lease: duplicate clicks/tabs cannot repeatedly call Hosting.
  const connection = await db.runTransaction(async (tx) => {
    const saved = (await tx.get(ref)).data();
    if (!saved) fail('failed-precondition', 'Start your domain setup first.');
    if (Date.now() - (saved.checkedAt?.toMillis() || 0) < 30000) fail('resource-exhausted', 'Wait 30 seconds before checking again. DNS changes take time to appear.');
    tx.update(ref, { checkedAt: FieldValue.serverTimestamp() });
    return saved;
  });
  const resolver = new Resolver({ timeout: 4000, tries: 2 });
  let records;
  try { records = await resolver.resolveTxt(connection.verificationHost); } catch { fail('failed-precondition', 'Ownership record not found yet. Check the TXT host and value, then allow time for DNS propagation.'); }
  if (!records.some((parts) => parts.join('') === connection.verificationValue)) fail('failed-precondition', 'The ownership TXT value does not match. Copy the exact value below.');
  const claim = db.doc(`customDomainClaims/${digest(connection.domain)}`);
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(claim)).data();
    if (current && current.ownerId !== uid) fail('already-exists', 'This domain is already associated with another business. Contact support.');
    tx.set(claim, { ownerId: uid, appId: APP, domain: connection.domain, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  let resource = await hosting(connection.domain);
  if (!resource) { await hosting(connection.domain, 'POST'); resource = await hosting(connection.domain); }
  const status = hostingStatus(resource);
  const update = { status, records: dnsRecords(resource), hostState: resource?.hostState || 'PENDING', ownershipState: resource?.ownershipState || 'PENDING', certificateState: resource?.cert?.state || 'PENDING', updatedAt: FieldValue.serverTimestamp() };
  await db.runTransaction(async (tx) => {
    tx.update(ref, update);
    tx.set(db.doc(`customDomainRoutes/${digest(connection.domain)}`), { domain: connection.domain, appId: APP, ownerId: uid, slug: connection.slug, active: status === 'connected', updatedAt: FieldValue.serverTimestamp() });
  });
  return { connection: (await ref.get()).data() };
}

export async function resolveCustomDomain(data) {
  let domain;
  try { domain = normalizeDomain(data.domain); } catch { return { slug: null }; }
  const db = getFirestore();
  const route = (await db.doc(`customDomainRoutes/${digest(domain)}`).get()).data();
  if (!route?.active || route.appId !== APP) return { slug: null };
  const published = (await db.doc(`artifacts/${APP}/public/data/workspaces/${route.slug}`).get()).data();
  return { slug: published?.ownerId === route.ownerId ? route.slug : null };
}
