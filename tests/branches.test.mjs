import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBranches, publicBranches } from '../functions/branchesDomain.js';
import { applyWorkspaceChanges } from '../functions/workspaceDomain.js';
import { publicProfile } from '../functions/workspaceCommands.js';

const branch = overrides => ({ id: 'branch_city', name: 'City studio', address: '12 Main Road', enabled: true, showOnWebsite: false, ...overrides });
const patch = (branches, expectedRevision = 0) => [{ section: 'website', expectedRevision, patch: { website: { branches } } }];

test('manual branch addresses save without invented coordinates and default to private', () => {
  const [result] = validateBranches([{ id: 'branch_a', name: '  City studio  ', address: '  12 Main Road  ', countryCode: 'za' }]);
  assert.equal(result.name, 'City studio'); assert.equal(result.address, '12 Main Road');
  assert.equal(result.locationLat, null); assert.equal(result.locationLng, null);
  assert.equal(result.countryCode, 'ZA'); assert.equal(result.enabled, true); assert.equal(result.showOnWebsite, false);
});

test('branch IDs, duplicate records, unknown operational fields and excessive branches are rejected', () => {
  for (const records of [[branch({ id: '../owner' })], [branch({ id: 'new' })], [branch(), branch()], [branch({ staffIds: ['someone'] })], [branch({ capacity: 50 })], Array.from({ length: 101 }, (_, i) => branch({ id: `branch_${i}` }))]) {
    assert.throws(() => validateBranches(records), error => error.code === 'invalid-argument');
  }
});

test('branch visibility, address, map coordinates and contact details are validated before saving', () => {
  const invalid = [{ name: '' }, { address: '' }, { address: 'a'.repeat(301) }, { showOnWebsite: 'true' }, { enabled: 1 },
    { locationLat: -33.9, locationLng: null }, { locationLat: '12', locationLng: 20 }, { locationLat: 91, locationLng: 20 }, { locationLat: 0, locationLng: 0 },
    { email: 'wrong@email' }, { phone: '<script>' }, { countryCode: 'South Africa' }, { mapLinkUrl: 'javascript:alert(1)' }, { mapLinkUrl: 'https://user:password@example.com' }];
  for (const overrides of invalid) assert.throws(() => validateBranches([branch(overrides)]), error => error.code === 'invalid-argument');
  const [valid] = validateBranches([branch({ locationLat: -33.9, locationLng: 18.4, email: 'hello@example.com', phone: '+27 (21) 555-0100', mapLinkUrl: 'https://www.google.com/maps/place/Example' })]);
  assert.equal(valid.locationLat, -33.9); assert.equal(valid.locationLng, 18.4);
});

test('branch updates use existing website section revisions and reject malformed server writes', () => {
  const previous = { website: { address: 'Primary address' }, sectionRevisions: { website: 3 } };
  const next = applyWorkspaceChanges(previous, [{ section: 'website', expectedRevision: 3, patch: { website: { ...previous.website, branches: [branch()] } } }]);
  assert.equal(next.sectionRevisions.website, 4); assert.equal(next.website.address, previous.website.address);
  assert.throws(() => applyWorkspaceChanges(next, patch([branch()], 3)), error => error.code === 'aborted');
  assert.throws(() => applyWorkspaceChanges({}, patch([branch({ internalNote: { unsafe: true } })])), error => error.code === 'invalid-argument');
});

test('only explicitly public active branches are published and internal branch notes stay private', () => {
  const rows = validateBranches([branch({ showOnWebsite: true, internalNote: 'Alarm code is confidential', email: 'studio@example.com' }), branch({ id: 'branch_private' }), branch({ id: 'branch_closed', enabled: false, showOnWebsite: true })]);
  const published = publicBranches(rows);
  assert.deepEqual(published.map(row => row.id), ['branch_city']);
  assert.equal(published[0].email, 'studio@example.com');
  assert.equal(Object.hasOwn(published[0], 'internalNote'), false);
  assert.deepEqual(publicBranches([{ ...branch(), enabled: 'true', showOnWebsite: true }]), []);
});

test('public business projection preserves the primary venue and exposes only the approved branch fields', () => {
  const workspace = { brandName: 'Our studio', website: { address: 'Primary venue', branches: validateBranches([branch({ showOnWebsite: true, internalNote: 'Private team note' })]) }, products: [], services: [] };
  const published = publicProfile(workspace, 'owner_a');
  assert.equal(published.website.address, 'Primary venue');
  assert.equal(published.website.branches.length, 1); assert.equal(published.website.branches[0].name, 'City studio');
  assert.equal(JSON.stringify(published).includes('Private team note'), false);
});
