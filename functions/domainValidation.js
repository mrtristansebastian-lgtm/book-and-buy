import { domainToASCII } from 'node:url';

export function normalizeDomain(input) {
  const value = String(input || '').trim().toLowerCase();
  if (!value || /[\s/:?#@]/.test(value)) throw new Error('Enter a domain only, such as shop.example.com—without https:// or a path.');
  const domain = domainToASCII(value.replace(/\.$/, ''));
  const labels = domain.split('.');
  if (domain.length > 253 || labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || !/^[a-z]{2,63}$|^xn--[a-z0-9-]+$/.test(labels.at(-1))) throw new Error('Enter a valid public domain name.');
  if (['localhost', 'local', 'test', 'invalid', 'example', 'internal', 'web.app', 'firebaseapp.com'].some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`))) throw new Error('Use a public domain that you own, not a platform or reserved domain.');
  return domain;
}

export function hostingStatus(resource) {
  return resource?.hostState === 'HOST_ACTIVE' && resource?.ownershipState === 'OWNERSHIP_ACTIVE' && ['CERT_ACTIVE', 'CERT_EXPIRING_SOON'].includes(resource?.cert?.state) ? 'connected' : 'provisioning';
}

export function dnsRecords(resource) {
  const desired = [...(resource?.requiredDnsUpdates?.desired || []), ...(resource?.cert?.verification?.dns?.desired || [])];
  const removals = (resource?.requiredDnsUpdates?.discovered || []).flatMap((set) => (set.records || []).filter((record) => record.requiredAction === 'REMOVE'));
  const records = [...desired.flatMap((set) => set.records || []), ...removals].map((record) => ({ type: record.type, host: record.domainName, value: record.rdata, action: record.requiredAction || 'NONE' }));
  return [...new Map(records.map((record) => [JSON.stringify(record), record])).values()];
}
