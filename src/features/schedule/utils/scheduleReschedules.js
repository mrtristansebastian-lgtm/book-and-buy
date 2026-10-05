const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const recency = proposal => Number(proposal?.updatedAt || proposal?.createdAt) || 0;

export function mapScheduleReschedules(documents = [], ownerId = '', maximum = 200) {
  const proposalsByBooking = new Map();
  for (const document of documents.slice(0, maximum)) {
    const proposal = document.data || {};
    const bookingId = proposal.bookingId || document.id;
    if (proposal.status !== 'pending' || !safeId(bookingId) || (proposal.ownerId && proposal.ownerId !== ownerId) ||
      (proposal.bookingId && document.id !== proposal.bookingId)) continue;
    const previous = proposalsByBooking.get(bookingId);
    if (!previous || recency(proposal) >= recency(previous)) proposalsByBooking.set(bookingId, {
      ...proposal, id: document.id, bookingId,
      threadId: safeId(proposal.threadId) ? proposal.threadId : null
    });
  }
  return { proposalsByBooking, pendingIds: new Set(proposalsByBooking.keys()), incomplete: documents.length > maximum };
}

export function demoScheduleReschedules(threads = []) {
  const current = new Map();
  for (const thread of threads) {
    if (!safeId(thread.bookingId) || !safeId(thread.id)) continue;
    const latest = [...(thread.messages || [])].reverse().find(message => message.type === 'reschedule' && message.proposal)?.proposal;
    if (!latest) continue;
    const previous = current.get(thread.bookingId);
    if (!previous || recency(latest) >= recency(previous)) current.set(thread.bookingId, { ...latest,
      bookingId: thread.bookingId, id: latest.id || thread.bookingId, threadId: thread.id });
  }
  const proposalsByBooking = new Map([...current].filter(([, proposal]) => proposal.status === 'pending'));
  return { proposalsByBooking, pendingIds: new Set(proposalsByBooking.keys()), incomplete: false };
}

/** Opening existing conversation context never creates a draft or sends text. */
export function scheduleBookingThreadId(booking, proposal, threads = []) {
  if (!safeId(booking?.id)) return null;
  if (proposal?.bookingId === booking.id && safeId(proposal.threadId)) return proposal.threadId;
  const thread = threads.find(thread => thread.bookingId === booking.id && safeId(thread.id));
  return thread?.id || null;
}
