import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, ArrowUpRight, Link2 } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../../shared/ui/Button';
import { listAIConnections, startChatGPTConnection, disconnectAIConnection, selectAIBillingSource, getPendingChatGPTConnection, confirmChatGPTConnection } from '../../../shared/firebase/aiGateway';
import './ai-settings.css';
import { useAIConfirmations } from '../../ai/useAIConfirmations';

export function AISettingsPage({ onChanged }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = workspace.ownerId || workspace.slug;
  const [connection, setConnection] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [note, setNote] = useState('');
  const [included, setIncluded] = useState(null), [replacement, setReplacement] = useState(null);
  const confirmations = useAIConfirmations(workspaceId);
  const generation = useRef(0);
  const connectionPoll = useRef(null);
  const identity = JSON.stringify([workspaceId, user?.uid || '', Boolean(workspace.isDemo)]);
  const identityRef = useRef(identity); identityRef.current = identity;
  const mountedRef = useRef(false);
  const current = scope => mountedRef.current && identityRef.current === scope;
  const refresh = async () => {
    const scope = identity;
    const ticket = ++generation.current;
    if (workspace.isDemo) { setLoading(false); return; }
    setLoading(true); setError('');
    try { const result = await listAIConnections(workspaceId); if (current(scope) && ticket === generation.current) { setConnection(result.connections.find(row => row.provider === 'chatgpt') || null); setIncluded(result.connections.find(row => row.provider === 'openai') || null); onChanged?.(); } }
    catch (e) { if (current(scope) && ticket === generation.current) setError(e.message || 'We could not check your connection. Try again.'); }
    finally { if (current(scope) && ticket === generation.current) setLoading(false); }
  };
  useEffect(() => {
    mountedRef.current = true;
    setConnection(null); setIncluded(null); setReplacement(null); setNote(''); setBusy(false); void refresh();
    const url = new URL(window.location.href); const result = url.searchParams.get('aiConnection');
    if (result === 'pending' && url.searchParams.get('pendingConnection')) {
      const scope = identity;
      getPendingChatGPTConnection(workspaceId, url.searchParams.get('pendingConnection')).then(value => { if (current(scope)) setReplacement(value); }).catch(e => { if (current(scope)) setError(e.message); });
      url.searchParams.delete('aiConnection'); url.searchParams.delete('pendingConnection'); window.history.replaceState(window.history.state, '', url.href);
    }
    if (['connected', 'identity-only', 'failed'].includes(result)) {
      if (result === 'failed') setError('ChatGPT sign-in was not completed. Your previous connection was kept. Try again.');
      else setNote(result === 'connected' ? 'ChatGPT connected. Your account is ready to check in chat.' : 'Your account is connected. ChatGPT AI usage permission has not been granted.');
      url.searchParams.delete('aiConnection'); window.history.replaceState(window.history.state, '', url.href);
    }
    const focus = () => { void refresh(); }; window.addEventListener('focus', focus);
    return () => { mountedRef.current = false; generation.current++; window.removeEventListener('focus', focus); clearInterval(connectionPoll.current); };
  }, [identity]);
  const connect = async (intent = connection?.connected ? 'reconnect' : 'connect') => {
    if (busy || !connection?.oauthAvailable) return;
    const scope = identity;
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError('Allow the sign-in window, then try again.'); return; }
    popup.opener = null; setBusy(true); setError(''); setNote('');
    try { const result = await startChatGPTConnection(workspaceId, intent, connection?.revision); if (!current(scope)) { popup.close(); return; } popup.location.replace(result.authUrl); setNote('Finish signing in with ChatGPT, then return here. We’ll check your connection when you come back.'); clearInterval(connectionPoll.current); connectionPoll.current = setInterval(() => { if (!current(scope) || popup.closed || Date.now() >= result.expiresAt) { clearInterval(connectionPoll.current); if (current(scope)) void refresh(); } }, 1500); }
    catch (e) { popup.close(); if (current(scope)) setError(e.message || 'Sign-in could not start. Try again.'); }
    finally { if (current(scope)) setBusy(false); }
  };
  const disconnect = async () => { if (busy) return; const scope = identity; setBusy(true); setError(''); try { const result = await disconnectAIConnection(workspaceId, 'chatgpt'); if (!current(scope)) return; await refresh(); if (!current(scope)) return; setNote(result.remoteRevoked === false ? 'ChatGPT disconnected here and active requests stopped. We could not confirm remote revocation; remove this app in ChatGPT settings to finish revoking access.' : 'ChatGPT disconnected. Active requests using this account are stopped.'); } catch (e) { if (current(scope)) setError(e.message); } finally { if (current(scope)) setBusy(false); } };
  const useIncluded = async () => { if (busy || !included?.includedAvailable) return; const scope = identity; setBusy(true); setError(''); try { await selectAIBillingSource(workspaceId, 'openai', 'included'); if (!current(scope)) return; await refresh(); if (!current(scope)) return; setNote('Book and Buy AI is enabled. Choose it in chat to use your included allowance.'); } catch (e) { if (current(scope)) setError(e.message || 'Included AI could not be enabled.'); } finally { if (current(scope)) setBusy(false); } };
  const connected = Boolean(connection?.connected);
  const chooseReplacement = async accept => {
    if (!replacement || busy) return;
    const scope = identity; setBusy(true); setError('');
    try { await confirmChatGPTConnection(workspaceId, replacement.pendingId, replacement.expectedRevision, accept); if (!current(scope)) return; setReplacement(null); await refresh(); if (current(scope)) setNote(accept ? 'ChatGPT account replaced. Review your model in chat.' : 'Your existing ChatGPT account was kept.'); }
    catch (e) { if (current(scope)) setError(e.message); }
    finally { if (current(scope)) setBusy(false); }
  };
  return <div className="bb-ai-settings">
    <article className="bb-panel bb-ai-connect-card">
      <div className="bb-ai-card-heading"><div className="bb-ai-provider"><img src="/brand/chatgpt.svg" alt="" /><div><h2>ChatGPT</h2><span className={`bb-ai-connection-status${connected && connection?.status !== 'reconnect-required' ? ' is-connected' : ''}`}><i aria-hidden="true" />{loading ? 'Checking connection' : connection?.status === 'reconnect-required' ? 'Reconnect needed' : connected ? 'Connected' : connection?.status === 'approval-pending' ? 'Awaiting approval' : 'Not connected'}</span></div></div><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer" aria-label="Review ChatGPT usage and access"><ArrowUpRight size={18}/></a></div>
      <p className="bb-ai-card-description">A familiar mind. A little more possibility.</p><p className="bb-ai-card-copy">Connect your ChatGPT account to work with Butler and create your website, all from Book and Buy.</p>
      {connected && <div className="bb-ai-account"><span>Connected account</span><strong>{connection.accountLabel || 'Your ChatGPT account'}</strong><small>{connection.available ? 'Ready to use' : 'Account connected · AI access pending'}</small></div>}
      <div className="bb-ai-card-actions"><Button icon={Link2} variant="primary" busy={busy} disabled={loading || busy || !connection?.oauthAvailable} onClick={() => connect()}>{connected ? 'Reconnect ChatGPT' : 'Continue with ChatGPT'}</Button>{connected && connection?.oauthAvailable && <Button variant="secondary" disabled={busy} onClick={() => connect('replace')}>Change account</Button>}{connected && connection?.status === 'identity-only' && connection?.capabilities?.planInference && <Button variant="secondary" disabled={busy} onClick={() => connect('enable-plan')}>Enable plan usage</Button>}{connected && <Button variant="secondary" disabled={busy} onClick={disconnect}>Disconnect</Button>}<Button icon={RefreshCw} variant="secondary" disabled={busy || loading} onClick={refresh} aria-label="Refresh ChatGPT connection">Refresh</Button></div>
      {!loading && !connection?.oauthAvailable && <p className="bb-ai-availability">{workspace.isDemo ? 'Account connections are available in your signed-in business workspace. This demo won’t connect a personal account.' : connection?.reason || 'ChatGPT sign-in is not available yet. It will appear here when the supported account integration is enabled.'}</p>}
      {replacement && <section className="bb-ai-account" aria-label="Review ChatGPT account replacement"><strong>Replace your connected account?</strong><p>The verified sign-in belongs to {replacement.accountLabel || 'a different ChatGPT account'}. Your existing account stays connected until you choose.</p><div className="bb-ai-card-actions"><Button disabled={busy} onClick={() => chooseReplacement(false)}>Keep current account</Button><Button variant="primary" busy={busy} onClick={() => chooseReplacement(true)}>Replace account</Button></div></section>}
      {connection?.available && !connection.planUsageAcknowledged && <Button disabled={busy} variant="secondary" onClick={() => confirmations.ensurePlanUsage(connection).then(() => refresh()).catch(e => { if (e.name !== 'AbortError') setError(e.message); })}>Review ChatGPT plan usage</Button>}
      {error && <p role="alert" className="bb-ai-error">{error}</p>}{note && <p role="status" className="bb-ai-note">{note}</p>}
    </article>
    <article className="bb-panel bb-ai-connect-card">
      <div className="bb-ai-card-heading"><div className="bb-ai-provider"><img src="/brand/book-and-buy-mark.png" alt=""/><div><h2>Book and Buy AI</h2><span className={`bb-ai-connection-status${included?.billing === 'included' ? ' is-connected' : ''}`}><i aria-hidden="true"/>{loading ? 'Checking availability' : included?.billing === 'included' ? 'Ready to use' : included?.includedAvailable ? 'Available' : 'Not available yet'}</span></div></div></div>
      <p className="bb-ai-card-description">Help is included.</p><p className="bb-ai-card-copy">Use your Book and Buy allowance in Butler and the website editor. You choose the connection in chat, with no automatic switch to a different bill.</p>
      <div className="bb-ai-card-actions"><Button variant="primary" disabled={loading || busy || !included?.includedAvailable || included?.billing === 'included'} onClick={useIncluded}>{included?.billing === 'included' ? 'Included AI enabled' : 'Use included AI'}</Button></div>
      {!loading && !included?.includedAvailable && <p className="bb-ai-availability">{workspace.isDemo ? 'Included AI is available when enabled in your signed-in business workspace.' : 'Included AI becomes available when the platform funding and workspace allowance are configured.'}</p>}
    </article>
    <section className="bb-ai-connection-details"><div><ShieldCheck size={19}/><div><h3>Yours to connect. Yours to control.</h3><p>Sign in securely with ChatGPT. Your password stays with the provider, and your connection stays private to your business.</p></div></div><div><img src="/brand/book-and-buy-mark.png" alt=""/><div><h3>One connection, wherever you create.</h3><p>Use the same account in Butler and the website editor. You can review the model in chat and disconnect here whenever you like.</p></div></div><p className="bb-ai-footnote">Account sign-in and AI usage permissions are separate. Available models and plan usage depend on the access granted by ChatGPT. Connecting keeps your Book &amp; Buy login unchanged and does not import ChatGPT conversations. Requests share only the relevant workspace information and chat context, excluding credentials and payment secrets. Chats stay until you delete them through conversation history.</p></section>
    {confirmations.modal}
  </div>;
}
