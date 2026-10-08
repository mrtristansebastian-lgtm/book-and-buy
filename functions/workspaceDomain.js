import { validateBranches } from './branchesDomain.js';
// Shared policy metadata: safe to import in the browser. Enforcement lives on the server.
export const SETTINGS_COVERAGE = [
  { id: 'butler', status: 'ready', rule: 'Owner tools, previews and bounded policies', public: 'No private business capabilities', tool: 'automations.read', test: 'butler-emulator' },
  { id: 'general', status: 'ready', rule: 'workspace.patch + bookingDomain', public: 'Business identity, currency, timezone and hours', tool: 'settings.preview', test: 'workspace-commands, commerce-authority' },
  { id: 'plan', status: 'read_only', rule: null, public: 'No paid entitlement is implied', tool: 'workspace.read', test: 'butler' },
  { id: 'billing', status: 'unavailable', rule: null, public: 'Subscription billing is not implemented', tool: null, test: 'butler' },
  { id: 'users', status: 'ready', rule: 'workspace.patch.staff', public: 'Roster only; does not grant account access', tool: 'settings.preview', test: 'workspace-commands' },
  { id: 'payments', status: 'ready', rule: 'gatewayService + inventoryService', public: 'Enabled methods and verified payment status', tool: 'payments.read', test: 'payment-authority' },
  { id: 'ai', status: 'read_only', rule: 'Owner-only secure AI connection flow; approved account integration is deployment gated', public: 'No provider credentials or private AI capabilities', tool: null, test: 'ai-oauth, ai-gateway' },
  { id: 'bookings', status: 'ready', rule: 'bookingDomain + rescheduling', public: 'Live slots, notice, capacity and change policies', tool: 'bookings.preview', test: 'commerce-authority' },
  { id: 'checkout', status: 'ready', rule: 'marketOrders + inventoryDomain', public: 'Customer fields, stock holds and canonical totals', tool: 'settings.preview', test: 'inventory-authority' },
  { id: 'notifications', status: 'read_only', rule: 'workspace.patch.notifications', public: 'Activity visibility only; no email/SMS reminders', tool: 'settings.preview', test: 'workspace-commands' },
  { id: 'locations', status: 'ready', rule: 'workspace.patch.website + branchesDomain', public: 'Primary venue and explicitly public branch locations; shared booking schedule', tool: 'settings.preview', test: 'branches, workspace-commands' },
  { id: 'markets', status: 'ready', rule: 'marketPolicy', public: 'Country and catalog eligibility', tool: 'settings.preview', test: 'markets' },
  { id: 'shipping', status: 'ready', rule: 'marketPolicy', public: 'Flat/free rates; carrier labels are unavailable', tool: 'settings.preview', test: 'markets' },
  { id: 'reviews', status: 'ready', rule: 'places + reviews + workspace.patch.website', public: 'Google and verified-purchase platform reviews', tool: 'settings.preview', test: 'workspace-commands' },
  { id: 'domains', status: 'read_only', rule: 'domains (deployment gated)', public: 'Verified domain ownership and routing', tool: 'settings.read', test: 'domains' },
  { id: 'policies', status: 'ready', rule: 'workspace.patch.policies', public: 'Policy copy; enforced booking rules are separate', tool: 'settings.preview', test: 'workspace-commands' },
  { id: 'account', status: 'read_only', rule: null, public: 'Account deletion/export is unavailable', tool: 'workspace.read', test: 'butler' }
];

export const GENERAL_FIELDS = ['brandName', 'slug', 'email', 'phone', 'tagline', 'welcomeMessage', 'currency', 'timezone', 'primaryColor', 'headingColor', 'bodyColor', 'backgroundColor', 'fontFamily', 'nativeAccent', 'headingFontFamily', 'bodyFontFamily', 'buttonFontFamily', 'brandNameFontFamily', 'interfaceStyleDirection', 'onboardingComplete', 'avatarUrl', 'logoUrl'];
export const WORKSPACE_SECTIONS = {
  general: GENERAL_FIELDS,
  website: ['website'], products: ['products', 'productCategories'], services: ['services', 'serviceCategories'],
  staff: ['staff'], staffAvailability: ['staffAvailability'], clients: ['clients'], availabilityRules: ['availabilityRules'],
  notifications: ['notifications'], policies: ['policies'], features: ['features'], checkout: ['checkout'], threads: ['threads'], butler: ['butler']
};
export const SERVER_FIELDS = ['ownerId', 'id', 'isDemo', 'updatedAt', 'publishedAt', 'bookings', 'orders', 'bookingRevision', 'sectionRevisions', 'storageMode', 'storageEpoch', 'migration', 'mutationEpoch', 'schemaVersion', 'paymentGateways', 'lastCommandSource'];
export function domainError(message, code = 'invalid-argument') { const error = new Error(message); error.code = code; throw error; }
export function assertId(value, label = 'Identifier') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) domainError(`${label} is invalid.`);
  return value;
}
export function assertOwner(ownerId, auth) {
  assertId(ownerId, 'Workspace');
  if (!auth?.uid || auth.uid !== ownerId || auth.token?.firebase?.sign_in_provider === 'password' && !auth.token.email_verified) domainError('Sign in with the verified business owner account.', 'permission-denied');
}
export function safeValue(value, depth = 0) {
  if (depth > 16) domainError('This change is too deeply nested.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) { if (value.length > 2000) domainError('This change has too many records.'); return value.map(item => safeValue(item, depth + 1)); }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key) || /secret|password|apiKey|accessToken|refreshToken/i.test(key)) domainError('Credentials belong in the secure connection screen.');
      if (item !== undefined) result[key] = safeValue(item, depth + 1);
    }
    return result;
  }
  domainError('Change contains an unsupported value.');
}
function preserveStock(previous, products) {
  const stockFields = ['stockAvailable'];
  const result = products.map(row => {
    assertId(row.id, 'Product');
    const old = (previous.products || []).find(item => item.id === row.id);
    if (!old) return row;
    const next = { ...row };
    for (const field of stockFields) { if (old[field] === undefined) delete next[field]; else next[field] = old[field]; }
    next.variants = (row.variants || []).map(variant => {
      assertId(variant.id, 'Variant'); const prior = (old.variants || []).find(item => item.id === variant.id);
      if (!prior) return variant;
      const item = { ...variant }; if (prior.stockAvailable === undefined) delete item.stockAvailable; else item.stockAvailable = prior.stockAvailable;
      return item;
    });
    // Keep identities so outstanding reservations can still restore archived stock.
    for (const prior of old.variants || []) if (!next.variants.some(item => item.id === prior.id)) next.variants.push({ ...prior, available: false });
    return next;
  });
  for (const old of previous.products || []) if (!result.some(row => row.id === old.id)) result.push({ ...old, status: 'archived', active: false });
  return result;
}
export function applyWorkspaceChanges(previous = {}, changes = [], { initial = false } = {}) {
  if (!Array.isArray(changes) || !changes.length || changes.length > 20) domainError('Provide one or more workspace section changes.');
  const next = { ...previous, sectionRevisions: { ...(previous.sectionRevisions || {}) }, schemaVersion: 2 };
  const seen = new Set();
  for (const change of changes) {
    const fields = WORKSPACE_SECTIONS[change.section];
    if (!fields || seen.has(change.section)) domainError('Workspace section is unknown or duplicated.');
    seen.add(change.section);
    if (!Number.isSafeInteger(change.expectedRevision) || change.expectedRevision !== (previous.sectionRevisions?.[change.section] || 0)) domainError('This section changed in another session. Reload and review your change.', 'aborted');
    const patch = safeValue(change.patch);
    if (!patch || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some(key => !fields.includes(key))) domainError('Change contains fields outside this section.');
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'website' && value?.platformReviewsEnabled !== undefined && typeof value.platformReviewsEnabled !== 'boolean') domainError('Book & Buy reviews must be enabled or disabled.');
      if (key === 'website' && value?.branches !== undefined) value.branches = validateBranches(value.branches);
      if (key === 'products' || key === 'services' || key === 'staff' || key === 'clients') {
        if (!Array.isArray(value)) domainError(`${key} must be a list.`);
        const ids = new Set(); for (const row of value) { assertId(row.id, key); if (ids.has(row.id)) domainError('Record identifiers must be unique.'); ids.add(row.id);
          if (Array.isArray(row.variants)) { const variants = new Set(); for (const variant of row.variants) { assertId(variant.id, 'Variant'); if (variants.has(variant.id)) domainError('Variant identifiers must be unique.'); variants.add(variant.id); } }
        }
      }
      next[key] = key === 'products' && !initial ? preserveStock(previous, value) : value;
      if (key === 'services') for (const old of previous.services || []) if (!next.services.some(row => row.id === old.id)) next.services.push({ ...old, active: false });
    }
    next.sectionRevisions[change.section] = change.expectedRevision + 1;
  }
  if (next.slug && !/^[a-z0-9-]{1,63}$/.test(next.slug)) domainError('Use a valid business address.');
  if (next.timezone) { try { new Intl.DateTimeFormat('en', { timeZone: next.timezone }).format(); } catch { domainError('Choose a valid business timezone.'); } }
  for (const [key, min, max] of [['inventoryOnlineHoldMinutes', 1, 120], ['inventoryManualHoldHours', 1, 168]]) {
    const value = next.checkout?.[key]; if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max)) domainError(`Invalid stock hold setting: ${key}.`);
  }
  if (next.features?.collectClientName === false || next.features?.collectClientEmail === false) domainError('Customer name and email are required.');
  if (next.butler?.defaultMode && !['ask', 'plan', 'butler'].includes(next.butler.defaultMode)) domainError('Choose a valid Butler conversation mode.');
  if (next.butler?.preferredProvider && !['openai', 'anthropic', 'chatgpt', 'local'].includes(next.butler.preferredProvider)) domainError('Choose a supported Butler connection.');
  return next;
}
export function workspaceChanges(previous = {}, desired = {}) {
  return Object.entries(WORKSPACE_SECTIONS).flatMap(([section, fields]) => {
    const patch = Object.fromEntries(fields.filter(key => desired[key] !== undefined && JSON.stringify(previous[key]) !== JSON.stringify(desired[key])).map(key => [key, desired[key]]));
    return Object.keys(patch).length ? [{ section, patch, expectedRevision: previous.sectionRevisions?.[section] || 0 }] : [];
  });
}
export function readinessIssues(workspace = {}) {
  const issues = []; const rules = workspace.availabilityRules || {};
  if (rules.scheduleMode === 'first_come') issues.push({ section: 'bookings', code: 'unsupported_schedule', message: 'First-come scheduling is not supported by the website runtime.' });
  if (workspace.features?.emailUpdates === true) issues.push({ section: 'notifications', code: 'unsupported_reminders', message: 'Automatic email reminders are not connected.' });
  if (workspace.checkout?.taxEnabled || workspace.website?.taxEnabled) issues.push({ section: 'checkout', code: 'unsupported_tax', message: 'Tax calculation is not connected.' });
  return issues;
}
