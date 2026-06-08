export const LIVE_MESSAGE_LIMIT = 20;

export const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export const cleanFirestoreIdPart = (value = '') => (
  String(value || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'item'
);

export const buildSupportThreadId = (ownerId = '', bookingId = '') => (
  `${cleanFirestoreIdPart(ownerId)}_${cleanFirestoreIdPart(bookingId)}`
);

export const timestampValue = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatPresenceTime = (value) => {
  const ms = timestampValue(value);
  if (!ms) return '';
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 60_000) return 'just now';
  if (diff < 60 * 60_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.max(1, Math.round(diff / (60 * 60_000)))}h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const createRescheduleProposal = ({
  date,
  time,
  requestedBy = 'client',
  source = 'request',
  message = '',
  bookingId = ''
}) => ({
  id: `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  bookingId,
  date,
  time,
  requestedBy,
  source,
  status: 'pending',
  message,
  createdAtMs: Date.now()
});

export const getThreadMessageProposal = (message = {}, activeThread = {}) => (
  message.proposedReschedule ||
  message.rescheduleProposal ||
  (String(message.kind || '').startsWith('reschedule') ? activeThread?.proposedReschedule : null)
);

export const isPendingRescheduleProposal = (proposal = {}) => (
  !['accepted', 'declined', 'cancelled'].includes(String(proposal.status || 'pending'))
);

export const formatProposalLabel = (proposal = {}) => [proposal.date, proposal.time].filter(Boolean).join(' at ');
