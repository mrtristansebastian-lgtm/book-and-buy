import { useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';
import { acknowledgeChatGPTPlanUsage } from '../../shared/firebase/aiGateway';
import { Button } from '../../shared/ui/Button';
import './ai-confirmations.css';

// Consent is scoped to the owner and connection revision, never to a browser flag.
export function useAIConfirmations(workspaceId) {
  const [dialog, setDialog] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(null), panel = useRef(null), owner = useRef(workspaceId);
  owner.current = workspaceId;
  const finish = (accepted = false) => {
    const request = pending.current; pending.current = null;
    request?.signal?.removeEventListener('abort', request.abort);
    setDialog(null); setBusy(false); setError('');
    if (accepted) request?.resolve(); else request?.reject(new DOMException('Action cancelled.', 'AbortError'));
  };
  useEffect(() => () => {
    const request = pending.current; pending.current = null;
    request?.signal?.removeEventListener('abort', request.abort);
    request?.reject(new DOMException('Workspace changed.', 'AbortError'));
  }, [workspaceId]);
  useEffect(() => { setDialog(null); setBusy(false); setError(''); }, [workspaceId]);
  useDialogFocus(panel, Boolean(dialog), () => { if (!busy) finish(); });
  const ask = (value, signal) => {
    if (signal?.aborted) return Promise.reject(new DOMException('Action cancelled.', 'AbortError'));
    if (pending.current) return Promise.reject(new Error('Complete the open confirmation first.'));
    return new Promise((resolve, reject) => {
      const abort = () => finish();
      pending.current = { resolve, reject, signal, abort, owner: workspaceId };
      signal?.addEventListener('abort', abort, { once: true });
      setError(''); setDialog(value);
    });
  };
  const ensurePlanUsage = (connection, signal) => connection?.provider === 'chatgpt' && connection.available && !connection.planUsageAcknowledged ? ask({ kind: 'plan', connection }, signal) : Promise.resolve();
  const confirmDeletion = (conversation, signal) => ask({ kind: 'delete', conversation }, signal);
  const accept = async () => {
    if (busy || !pending.current) return;
    const request = pending.current; setBusy(true); setError('');
    try {
      if (dialog.kind === 'plan') await acknowledgeChatGPTPlanUsage(workspaceId, dialog.connection.revision, dialog.connection.noticeVersion);
      if (pending.current !== request || owner.current !== request.owner) return;
      if (dialog.kind === 'plan') { dialog.connection.planUsageAcknowledged = true; window.dispatchEvent(new Event('bookbuy-ai-connections-changed')); }
      finish(true);
    } catch (e) { if (pending.current === request && owner.current === request.owner) { setError(e.message || 'Please try again.'); setBusy(false); } }
  };
  const modal = dialog && <div className="bb-ai-confirm-overlay"><section ref={panel} className="bb-ai-confirm" role="dialog" aria-modal="true" aria-labelledby="ai-confirm-title">
    {dialog.kind === 'plan' ? <><img src="/brand/chatgpt.svg" alt="" /><h2 id="ai-confirm-title">Your ChatGPT plan, here with you.</h2><p>Website Editor and Butler can use your eligible ChatGPT plan when you choose this connection. Usage counts toward your ChatGPT limits. Book &amp; Buy’s own request limits are separate.</p><p>We send your request, relevant chat history and the workspace information needed for the task. Connecting does not import your ChatGPT conversations. Credentials and payment secrets stay out of AI context.</p><p>Your Book &amp; Buy chats stay until you delete them. Business changes still need their own permission and review.</p><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage ChatGPT usage ↗</a></> : <><h2 id="ai-confirm-title">Delete this conversation?</h2><p>{dialog.conversation.title || 'Saved conversation'}</p><p>This removes its messages and saved AI progress, stops active requests, and dismisses changes that have not been executed. Your website, business records and action audit history stay intact.</p></>}
    {error && <p role="alert">{error}</p>}<footer><Button variant="secondary" disabled={busy} onClick={() => finish()}>Cancel</Button><Button variant="primary" busy={busy} onClick={accept}>{dialog.kind === 'plan' ? 'Use my ChatGPT plan' : 'Delete conversation'}</Button></footer>
  </section></div>;
  return { ensurePlanUsage, confirmDeletion, modal, pending: Boolean(dialog) };
}
