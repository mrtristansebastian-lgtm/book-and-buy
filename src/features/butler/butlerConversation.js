export function conversationMessages(conversation) {
  return (conversation?.turns || []).flatMap(turn => [
    ...(turn.user ? [{ role: 'user', content: turn.user, turnId: turn.runId }] : []),
    ...(turn.assistant ? [{ role: 'assistant', content: turn.assistant, runId: turn.runId }] : [])
  ]);
}

// Owner, signed-in identity, provider generation and mode are separate scopes.
// The epoch also invalidates work when starting or selecting another chat.
export function butlerIdentity({ ownerId, uid, demo, provider, mode, revision }) {
  return JSON.stringify([ownerId, uid || '', Boolean(demo), provider, mode, revision || '']);
}
export function butlerStorageKeys(identity) {
  return { run: `bookbuy-butler-run:${identity}`, conversation: `bookbuy-butler-conversation:${identity}` };
}
export function matchesConversation(value, { provider, mode, revision, conversationId }) {
  return Boolean(value && value.provider === provider && value.mode === mode && value.connectionRevision === revision && (!conversationId || value.conversationId === conversationId));
}
export function scopedHistory(rows, scope) {
  return (rows || []).filter(row => matchesConversation(row, scope));
}
export function isCurrentButlerRequest(captured, current) {
  return captured.identity === current.identity && captured.epoch === current.epoch && captured.conversationId === current.conversationId;
}

export function restoredRunMessages(messages, run) {
  // Snapshot content replaces any streamed fragments for this durable run.
  // Empty content is still authoritative; don't manufacture an assistant reply.
  return updateRunMessage(messages, run.runId, run.content || '');
}

export function updateRunMessage(messages, runId, content, { append = false } = {}) {
  const found = messages.findIndex(row => row.role === 'assistant' && row.runId === runId);
  const next = [...messages];
  if (found < 0) next.push({ role: 'assistant', content, runId });
  else next[found] = { ...next[found], content: append ? next[found].content + content : content };
  return next;
}
