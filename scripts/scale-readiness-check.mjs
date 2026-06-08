import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const parseJson = (relativePath) => JSON.parse(read(relativePath));

const checks = [];
const assert = (condition, message) => {
  checks.push({ ok: Boolean(condition), message });
};

const firebaseConfig = parseJson('firebase.json');
const indexes = parseJson('firestore.indexes.json');
const functionsIndex = read('functions/index.js');
const availabilityCache = read('functions/availabilityCache.js');
const rules = read('firestore.rules');
const workspaceSync = read('src/features/workspace/hooks/useWorkspaceDataSync.js');

assert(firebaseConfig.firestore?.indexes === 'firestore.indexes.json', 'Firestore indexes are wired in firebase.json');
assert(indexes.indexes?.some(index => index.collectionGroup === 'clientThreads'), 'Thread recency indexes exist');
assert(indexes.indexes?.some(index => index.collectionGroup === 'reminderQueue'), 'Reminder queue due-date index exists');
assert(!functionsIndex.includes("collectionGroup('bookings')"), 'Reminder worker no longer scans collectionGroup(bookings)');
assert(functionsIndex.includes('reminderQueue'), 'Reminder queue worker is present');
assert(functionsIndex.includes('syncBookingOperationalState'), 'Booking operational trigger is present');
assert(availabilityCache.includes('availabilityDays'), 'Availability cache paths are present');
assert(rules.includes('match /artifacts/{appId}/users/{userId}/clients/{clientId}'), 'Collection-backed clients rules exist');
assert(rules.includes('match /artifacts/{appId}/reminderQueue/{jobId}'), 'Reminder queue is server-only in rules');
assert(rules.includes('request.resource.data.text.size() <= 3000'), 'Chat message size guard exists');
assert(workspaceSync.includes("'users', workspaceOwnerId, 'clients'"), 'Workspace reads collection-backed clients');

const failed = checks.filter(check => !check.ok);
checks.forEach(check => {
  console.log(`${check.ok ? 'ok' : 'fail'} - ${check.message}`);
});

if (failed.length) {
  console.error(`Scale readiness check failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log('Scale readiness guard passed.');
