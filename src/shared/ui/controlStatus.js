/** Presentation only: these keys never replace persisted business status values. */
export const STATUS_TONE_MAP = Object.freeze({
  confirmed: 'positive', accepted: 'positive', approved: 'positive',
  paid: 'positive', fulfilled: 'positive', completed: 'positive',
  active: 'positive', available: 'positive', working: 'positive', connected: 'positive',
  live: 'positive', online: 'positive', success: 'positive', upcoming: 'positive',
  pending: 'pending', new: 'pending', unpaid: 'pending',
  'awaiting-payment': 'pending', 'awaiting-eft': 'pending',
  'manual-pending': 'pending',
  'pending-payment': 'pending', 'awaiting-verification': 'pending',
  shipped: 'info', processing: 'info', provisioning: 'info',
  reschedule: 'info', 'reschedule-requested': 'info',
  waitlist: 'waitlist', waitlisted: 'waitlist', 'wait-list': 'waitlist', leave: 'waitlist',
  declined: 'danger', rejected: 'danger', cancelled: 'danger', canceled: 'danger',
  failed: 'danger', error: 'danger', refunded: 'danger',
  draft: 'neutral', inactive: 'neutral', unknown: 'neutral',
  offline: 'neutral', off: 'neutral', 'off-day': 'neutral', 'business-closed': 'neutral',
  archived: 'neutral', withdrawn: 'neutral', superseded: 'neutral', expired: 'neutral'
});

export function normalizeControlStatus(status) {
  return String(status ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

export function getStatusTone(status) {
  const key = normalizeControlStatus(status);
  return Object.prototype.hasOwnProperty.call(STATUS_TONE_MAP, key)
    ? STATUS_TONE_MAP[key]
    : 'neutral';
}

export function getStatusPresentation(status) {
  const key = normalizeControlStatus(status);
  return { status: key, tone: getStatusTone(key), showCheck: key === 'confirmed' };
}
