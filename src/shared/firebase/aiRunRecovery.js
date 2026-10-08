export async function recoverDurableRun({ runId, getRun, onEvent = _event => {}, signal, afterSequence = 0, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, timeoutMs = 310000 }) {
  const startedAt = now(); let sequence = afterSequence, missing = 0;
  while (now() - startedAt < timeoutMs) {
    if (signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
    try {
      const result = await getRun(runId, sequence); missing = 0;
      for (const event of result.events || []) if (event.sequence > sequence) { sequence = event.sequence; onEvent(event); }
      if (result.status !== 'running') return result;
    } catch (error) {
      const code = String(error?.code || '').replace(/^functions\//, '');
      if (['unauthenticated', 'permission-denied', 'invalid-argument'].includes(code)) throw error;
      if (code === 'not-found' && ++missing >= 3) throw error;
    }
    await wait(1500);
  }
  const error = new Error('This request is still saved. Reopen the conversation to check its progress.');
  error.name = 'AIRunRecoveryError'; error.runId = runId; throw error;
}
