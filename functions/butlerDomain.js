import { applyWorkspaceChanges, assertId, domainError, WORKSPACE_SECTIONS } from './workspaceDomain.js';
export const BUTLER_TOOLS = [
  ['workspace.read', 'Read business summary and capability readiness', 'read'],
  ['schedules.read', 'Read live business hours and staff schedules', 'read'],
  ['availability.read', 'Check available service times using the booking validator', 'read'],
  ['website.read', 'Read the saved website design and publication status', 'read'],
  ['catalog.read', 'Read products or services and their stable identifiers', 'read'],
  ['bookings.read', 'Read selected bookings and their current revisions', 'read'],
  ['orders.read', 'Read selected orders and their current revisions', 'read'],
  ['clients.read', 'Read selected client records', 'read'],
  ['settings.read', 'Read a settings section', 'read'],
  ['analytics.read', 'Read current booking and order totals', 'read'],
  ['payments.read', 'Read saved payment status; does not move money', 'read'],
  ['inbox.read', 'Read business inbox threads or a selected conversation', 'read'],
  ['catalog.preview', 'Prepare a product/service change for owner review', 'write'],
  ['settings.preview', 'Prepare a revision checked settings change', 'write'],
  ['clients.preview', 'Prepare a client change or archive', 'write'],
  ['inventory.preview', 'Prepare a stock adjustment with expected quantities', 'write'],
  ['bookings.preview', 'Prepare a booking creation or update', 'write'],
  ['orders.preview', 'Prepare accepting, fulfilling, shipping or cancelling an order', 'write'],
  ['inbox.preview', 'Draft a message to a specific existing client conversation', 'write'],
  ['website.profile.preview', 'Prepare public business profile content changes', 'write'],
  ['website.publish.preview', 'Prepare publishing or rolling back a website version', 'write'],
  ['automations.read', 'Read saved automation configuration and run status', 'read']
].map(([name, description, kind]) => ({ name, description, kind, status: 'ready' }));
export const UNAVAILABLE_CAPABILITIES = ['billing.upgrade', 'payments.refund', 'payments.payout', 'notifications.email', 'notifications.sms', 'shipping.label', 'tax.calculate', 'currency.convert', 'team.invite', 'account.delete'];
export const AUTO_TOOL_FIELDS = { 'catalog.preview': ['tags', 'category', 'collections'], 'clients.preview': ['tags', 'notes'], 'settings.preview': ['collectClientPhone', 'collectClientNotes'] };
export const TOOL_INPUT_SCHEMA = {
  type: 'object', properties: {
    section: { type: 'string' }, id: { type: 'string' }, query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 },
    operation: { type: 'string', enum: ['upsert', 'archive', 'publish', 'rollback'] }, patch: { type: 'object', additionalProperties: true },
    record: { type: 'object', additionalProperties: true }, booking: { type: 'object', additionalProperties: true }, updates: { type: 'array', items: { type: 'object', additionalProperties: true } },
    threadId: { type: 'string' }, body: { type: 'string', maxLength: 3000 }, expectedRevision: { type: 'integer', minimum: 0 },
    project: { type: 'object', additionalProperties: true }, revision: { type: 'string' }, serviceId: { type: 'string' }, variantId: { type: 'string' }, dateKey: { type: 'string' }, staffId: { type: 'string' }, countryCode: { type: 'string' }
  }, additionalProperties: false
};
export function authorizeStandingPolicy(policy, tool, args, { now = Date.now(), count = 1 } = {}) {
  if (!args || args.record || args.booking || args.updates || args.project || args.body || args.threadId) return false;
  if (tool === 'settings.preview' && args.section !== 'features') return false;
  if (tool === 'catalog.preview' && !['products', 'services'].includes(args.section)) return false;
  if (!policy?.enabled || !AUTO_TOOL_FIELDS[tool] || !Number.isInteger(policy.maxRecords) || count > policy.maxRecords || policy.expiresAt && policy.expiresAt <= now) return false;
  if (!Array.isArray(policy.recordIds) || !policy.recordIds.includes(args.id)) return false;
  const fields = Object.keys(args.patch || {});
  return args.operation !== 'archive' && fields.length > 0 && fields.every(field => AUTO_TOOL_FIELDS[tool].includes(field) && policy.allowedFields?.includes(field));
}

function sectionChange(workspace, section, patch) {
  const change = { section, patch, expectedRevision: workspace.sectionRevisions?.[section] || 0 };
  applyWorkspaceChanges(workspace, [change]); return change;
}
export function buildButlerCommand(workspace, name, args) {
  if (['settings.preview', 'website.profile.preview'].includes(name)) {
    const section = name === 'website.profile.preview' ? 'website' : args.section;
    if (!WORKSPACE_SECTIONS[section]) domainError('Choose a writable settings section.');
    let patch = args.patch;
    if (section !== 'general' && !Object.keys(patch || {}).some(key => WORKSPACE_SECTIONS[section].includes(key))) patch = { [section]: { ...(workspace[section] || {}), ...patch } };
    return { operation: 'workspace.patch', changes: [sectionChange(workspace, section, patch)] };
  }
  if (['catalog.preview', 'clients.preview'].includes(name)) {
    const section = name === 'clients.preview' ? 'clients' : args.section;
    if (!['products', 'services', 'clients'].includes(section)) domainError('Choose products, services or clients.');
    const id = args.id || args.record?.id || globalThis.crypto.randomUUID(); assertId(id);
    const old = (workspace[section] || []).find(row => row.id === id);
    const item = args.operation === 'archive' ? { ...old, id, active: false, ...(section === 'products' ? { status: 'archived' } : { archived: true }) } : { ...old, ...(args.record || {}), ...(args.patch || {}), id };
    if (!old && args.operation === 'archive') domainError('Record not found.', 'not-found');
    if (section !== 'clients' && !String(item.name || '').trim()) domainError('A catalog name is required.');
    const rows = old ? workspace[section].map(row => row.id === id ? item : row) : [...(workspace[section] || []), item];
    return { operation: 'workspace.patch', changes: [sectionChange(workspace, section, { [section]: rows })] };
  }
  if (name === 'inventory.preview') {
    if (!Array.isArray(args.updates) || !args.updates.length || args.updates.length > 100) domainError('Choose stock changes.');
    return { operation: 'inventory.adjust', updates: args.updates, expectedRevision: workspace.sectionRevisions?.products || 0 };
  }
  if (name === 'bookings.preview') {
    const booking = args.booking || { ...args.patch, ...(args.id ? { id: args.id } : {}) };
    if (!booking || !booking.serviceId && !booking.id) domainError('Choose a booking or service.');
    const current = (workspace.bookings || []).find(row => row.id === booking.id);
    return { operation: 'booking.write', booking, expectedRevision: current?.revision || 0 };
  }
  if (name === 'orders.preview') {
    const order = (workspace.orders || []).find(row => row.id === args.id); if (!order) domainError('Order not found.', 'not-found');
    if (!args.patch || Object.keys(args.patch).some(key => !['status', 'paymentStatus', 'trackingNumber', 'notes'].includes(key))) domainError('Use an order status or tracking change.');
    return { operation: 'order.update', id: args.id, patch: args.patch, expectedRevision: order.revision || 0 };
  }
  if (name === 'inbox.preview') {
    assertId(args.threadId); if (!String(args.body || '').trim() || args.body.length > 3000) domainError('Write a message of up to 3000 characters.');
    return { operation: 'inbox.send', threadId: args.threadId, body: args.body.trim() };
  }
  if (name === 'website.publish.preview') return { ...args, operation: args.operation === 'rollback' ? 'website.rollback' : 'website.publish' };
  domainError('This capability is unavailable.', 'failed-precondition');
}

const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const fields = TOOL_INPUT_SCHEMA.properties;
const reads = { id: fields.id, query: fields.query, limit: fields.limit };
export const TOOL_SCHEMAS = {
  'workspace.read': schema({}), 'schedules.read': schema({ staffId: fields.staffId }),
  'availability.read': schema({ serviceId: fields.serviceId, variantId: fields.variantId, dateKey: fields.dateKey, staffId: fields.staffId, countryCode: fields.countryCode }, ['serviceId', 'dateKey']),
  'website.read': schema({}), 'catalog.read': schema({ ...reads, section: { type: 'string', enum: ['products', 'services'] } }),
  'bookings.read': schema(reads), 'orders.read': schema(reads), 'clients.read': schema(reads), 'payments.read': schema(reads),
  'analytics.read': schema({}), 'automations.read': schema({}), 'inbox.read': schema({ threadId: fields.threadId }),
  'settings.read': schema({ section: { type: 'string', enum: Object.keys(WORKSPACE_SECTIONS) } }, ['section']),
  'catalog.preview': schema({ section: { type: 'string', enum: ['products', 'services'] }, id: fields.id, operation: { type: 'string', enum: ['upsert', 'archive'] }, patch: fields.patch, record: fields.record }, ['section']),
  'clients.preview': schema({ id: fields.id, operation: { type: 'string', enum: ['upsert', 'archive'] }, patch: fields.patch, record: fields.record }),
  'settings.preview': schema({ id: fields.id, section: { type: 'string', enum: Object.keys(WORKSPACE_SECTIONS) }, patch: fields.patch }, ['section', 'patch']),
  'website.profile.preview': schema({ patch: fields.patch }, ['patch']),
  'inventory.preview': schema({ updates: fields.updates }, ['updates']),
  'bookings.preview': schema({ id: fields.id, patch: fields.patch, booking: fields.booking }),
  'orders.preview': schema({ id: fields.id, patch: fields.patch }, ['id', 'patch']),
  'inbox.preview': schema({ threadId: fields.threadId, body: fields.body }, ['threadId', 'body']),
  'website.publish.preview': schema({ operation: { type: 'string', enum: ['publish', 'rollback'] }, project: fields.project, revision: fields.revision, expectedRevision: { type: ['string', 'null'] } }, ['operation'])
};
export function validateButlerArguments(name, args) {
  const contract = TOOL_SCHEMAS[name];
  if (!contract || !args || Array.isArray(args) || typeof args !== 'object') domainError('Invalid Butler tool input.');
  if (Object.keys(args).some(key => !Object.hasOwn(contract.properties, key)) || contract.required.some(key => args[key] === undefined)) domainError('Butler tool input contains missing or unsupported fields.');
  for (const [key, value] of Object.entries(args)) {
    const field = contract.properties[key], types = Array.isArray(field.type) ? field.type : [field.type];
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
    if (!types.includes(type) || field.enum && !field.enum.includes(value) || field.maxLength && value.length > field.maxLength || field.minimum != null && value < field.minimum || field.maximum != null && value > field.maximum) domainError(`Invalid ${key} for this Butler tool.`);
  }
  return args;
}
