// Narrow repair for already-published catalog cost metadata. Dry run by default.
// Does not read or write private owner settings, bookings, orders or client copies.
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = 'build-a-booking-ai';
const APP_ID = 'book-and-buy-v1';
const PRIVATE_COST_FIELDS = new Set(['cost', 'costInCents', 'unitCostInCents', 'lineCostInCents', 'costBasisInCents']);
const firestoreRoot = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Sanitize Firestore typed catalog values without decoding or logging customer data. */
export function stripPublicCatalogCosts(value) {
  if (!value || typeof value !== 'object') return { value, removed: 0 };
  let removed = 0;
  if (value.mapValue?.fields) {
    const fields = {};
    for (const [key, child] of Object.entries(value.mapValue.fields)) {
      if (PRIVATE_COST_FIELDS.has(key)) { removed++; continue; }
      const sanitized = stripPublicCatalogCosts(child);
      fields[key] = sanitized.value;
      removed += sanitized.removed;
    }
    return { value: { ...value, mapValue: { ...value.mapValue, fields } }, removed };
  }
  if (value.arrayValue) {
    const values = (value.arrayValue.values || []).map((child) => {
      const sanitized = stripPublicCatalogCosts(child);
      removed += sanitized.removed;
      return sanitized.value;
    });
    return { value: { ...value, arrayValue: { ...value.arrayValue, values } }, removed };
  }
  return { value, removed };
}

async function run() {
  const apply = process.argv.includes('--apply');
  const countIndex = process.argv.indexOf('--expected-count');
  const expectedCount = countIndex >= 0 ? Number(process.argv[countIndex + 1]) : null;
  if (apply && (!Number.isInteger(expectedCount) || expectedCount < 0)) throw new Error('Apply requires the reviewed --expected-count.');
  const require = createRequire(import.meta.url);
  const cliAuth = require(join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
  const account = cliAuth.getProjectDefaultAccount(process.cwd()) || cliAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI authentication is unavailable.');
  const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  if (!token?.access_token) throw new Error('Firebase CLI access token is unavailable.');
  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: {
      Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json', ...options.headers
    } });
    if (!response.ok) throw new Error(`Firestore request failed (${response.status}). No document data is logged.`);
    return response.json();
  };

  const collectionPath = `artifacts/${APP_ID}/public/data/workspaces`;
  const changes = [];
  let scanned = 0;
  let productCostFields = 0;
  let serviceCostFields = 0;
  let pageToken = '';
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.append('mask.fieldPaths', 'products');
    params.append('mask.fieldPaths', 'services');
    if (pageToken) params.set('pageToken', pageToken);
    const page = await request(`${firestoreRoot}/${collectionPath}?${params}`);
    for (const document of page.documents || []) {
      scanned++;
      if (scanned > 5000) throw new Error('Read limit exceeded; review the scope before continuing.');
      const fields = {};
      const masks = [];
      for (const key of ['products', 'services']) {
        if (!document.fields?.[key]) continue;
        const sanitized = stripPublicCatalogCosts(document.fields[key]);
        if (!sanitized.removed) continue;
        fields[key] = sanitized.value;
        masks.push(key);
        if (key === 'products') productCostFields += sanitized.removed;
        else serviceCostFields += sanitized.removed;
      }
      if (masks.length) changes.push({ name: document.name, updateTime: document.updateTime, fields, masks });
    }
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  const summary = { mode: apply ? 'apply' : 'dry-run', project: PROJECT, collection: collectionPath,
    profilesScanned: scanned, profilesAffected: changes.length, productCostFields, serviceCostFields,
    privateOwnerDataTouched: false };
  if (!apply) { console.log(JSON.stringify(summary)); return; }
  if (changes.length !== expectedCount) throw new Error('Affected profile count changed; run a new dry run before applying.');
  let updated = 0;
  for (const change of changes) {
    if (!change.name.startsWith(`projects/${PROJECT}/databases/(default)/documents/${collectionPath}/`) || !change.updateTime) {
      throw new Error('Unexpected document path or missing concurrency guard.');
    }
    const params = new URLSearchParams({ 'currentDocument.updateTime': change.updateTime });
    for (const key of change.masks) params.append('updateMask.fieldPaths', key);
    await request(`https://firestore.googleapis.com/v1/${change.name}?${params}`, {
      method: 'PATCH', body: JSON.stringify({ name: change.name, fields: change.fields })
    });
    updated++;
  }
  console.log(JSON.stringify({ ...summary, profilesUpdated: updated }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
