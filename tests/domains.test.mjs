import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, hostingStatus, dnsRecords } from '../functions/domainValidation.js';

test('domain input canonicalization and hostile/reserved input rejection', () => {
  assert.equal(normalizeDomain(' SHOP.Acme.com. '), 'shop.acme.com');
  assert.equal(normalizeDomain('café.com'), 'xn--caf-dma.com');
  for (const value of ['https://acme.com', 'acme.com/path', 'user@acme.com', '127.0.0.1', 'localhost', 'x.web.app', 'x.firebaseapp.com', '-x.com', 'x..com', 'x.test', '*.acme.com']) assert.throws(() => normalizeDomain(value));
});
test('only fully active ownership, host and certificate count as connected', () => {
  const active = { hostState: 'HOST_ACTIVE', ownershipState: 'OWNERSHIP_ACTIVE', cert: { state: 'CERT_ACTIVE' } };
  assert.equal(hostingStatus(active), 'connected');
  assert.equal(hostingStatus({ ...active, ownershipState: 'OWNERSHIP_PENDING' }), 'provisioning');
  assert.equal(hostingStatus({ ...active, cert: { state: 'CERT_EXPIRED' } }), 'provisioning');
  assert.equal(hostingStatus(null), 'provisioning');
});
test('preserve exact Hosting record values and remove actions', () => {
  assert.deepEqual(dnsRecords({ requiredDnsUpdates: { desired: [{ records: [{ type: 'A', domainName: 'acme.com.', rdata: '199.36.158.100', requiredAction: 'ADD' }] }] } }), [{ type: 'A', host: 'acme.com.', value: '199.36.158.100', action: 'ADD' }]);
});
