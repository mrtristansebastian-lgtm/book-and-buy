import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, ArrowUpRight, Link2 } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { Button } from '../../../shared/ui/Button';
import { listAIConnections, startChatGPTConnection, disconnectAIConnection } from '../../../shared/firebase/aiGateway';
import './ai-settings.css';

export function AISettingsPage({ onChanged }) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace.ownerId || workspace.slug;
  const [connection, setConnection] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [note, setNote] = useState('');
  const generation = useRef(0);
  const refresh = async () => {
    const ticket = ++generation.current;
    if (workspace.isDemo) { setLoading(false); return; }
    setLoading(true); setError('');
    try { const result = await listAIConnections(workspaceId); if (ticket === generation.current) { setConnection(result.connections.find(row => row.provider === 'chatgpt') || null); onChanged?.(); } }
    catch (e) { if (ticket === generation.current) setError(e.message || 'We could not check your connection. Try again.'); }
    finally { if (ticket === generation.current) setLoading(false); }
  };
  useEffect(() => { setConnection(null); setNote(''); void refresh(); const focus = () => { void refresh(); }; window.addEventListener('focus', focus); return () => { generation.current++; window.removeEventListener('focus', focus); }; }, [workspaceId, workspace.isDemo]);
  const connect = async () => {
    if (busy || !connection?.oauthAvailable) return;
    const popup = window.open('about:blank', '_blank');
    if (!popup) { setError('Allow the sign-in window, then try again.'); return; }
    popup.opener = null; setBusy(true); setError(''); setNote('');
    try { const result = await startChatGPTConnection(workspaceId); const url = new URL(result.authUrl); if (url.protocol !== 'https:') throw new Error('Sign-in could not start securely.'); popup.location.replace(url.href); setNote('Finish signing in with ChatGPT, then return here. We’ll check your connection when you come back.'); }
    catch (e) { popup.close(); setError(e.message || 'Sign-in could not start. Try again.'); }
    finally { setBusy(false); }
  };
  const disconnect = async () => { if (busy) return; setBusy(true); setError(''); try { await disconnectAIConnection(workspaceId, 'chatgpt'); await refresh(); setNote('ChatGPT disconnected. Active requests using this account are stopped.'); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const connected = Boolean(connection?.connected);
  return <div className="bb-ai-settings">
    <article className="bb-panel bb-ai-connect-card">
      <div className="bb-ai-card-heading"><div className="bb-ai-provider"><img src="/brand/chatgpt.svg" alt="" /><div><h2>ChatGPT</h2><span className={`bb-ai-connection-status${connected ? ' is-connected' : ''}`}><i aria-hidden="true" />{loading ? 'Checking connection' : connected ? 'Connected' : 'Not connected'}</span></div></div><a href="https://chatgpt.com" target="_blank" rel="noreferrer" aria-label="Visit ChatGPT"><ArrowUpRight size={18}/></a></div>
      <p className="bb-ai-card-description">A familiar mind. A little more possibility.</p><p className="bb-ai-card-copy">Connect your ChatGPT account to work with Butler and create your website, all from Book and Buy.</p>
      {connected && <div className="bb-ai-account"><span>Connected account</span><strong>{connection.accountLabel || 'Your ChatGPT account'}</strong><small>{connection.available ? 'Ready to use' : 'Account connected · AI access pending'}</small></div>}
      <div className="bb-ai-card-actions"><Button icon={Link2} variant="primary" busy={busy} disabled={loading || busy || !connection?.oauthAvailable} onClick={connect}>{connected ? 'Reconnect ChatGPT' : 'Connect ChatGPT'}</Button>{connected && <Button variant="secondary" disabled={busy} onClick={disconnect}>Disconnect</Button>}<Button icon={RefreshCw} variant="secondary" disabled={busy || loading} onClick={refresh} aria-label="Refresh ChatGPT connection">Refresh</Button></div>
      {!loading && !connection?.oauthAvailable && <p className="bb-ai-availability">{workspace.isDemo ? 'Account connections are available in your signed-in business workspace. This demo won’t connect a personal account.' : connection?.reason || 'ChatGPT sign-in is not available yet. It will appear here when the supported account integration is enabled.'}</p>}
      {error && <p role="alert" className="bb-ai-error">{error}</p>}{note && <p role="status" className="bb-ai-note">{note}</p>}
    </article>
    <section className="bb-ai-connection-details"><div><ShieldCheck size={19}/><div><h3>Yours to connect. Yours to control.</h3><p>Sign in securely with ChatGPT. Your password stays with the provider, and your connection stays private to your business.</p></div></div><div><img src="/brand/book-and-buy-mark.png" alt=""/><div><h3>One connection, wherever you create.</h3><p>Use the same account in Butler and the website editor. You can review the model in chat and disconnect here whenever you like.</p></div></div><p className="bb-ai-footnote">Account sign-in and AI usage permissions are separate. Available models and plan usage depend on the access granted by ChatGPT.</p></section>
  </div>;
}
