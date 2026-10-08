import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';
import { listAIConnections, saveAIConnection, disconnectAIConnection, startChatGPTConnection, selectAIBillingSource } from '../../shared/firebase/aiGateway';
import '../builder/builder-page.css';

/** Provider secrets live only in the authenticated host dialog, never in the editor. */
export function AIConnectionsDialog({ open = true, workspaceId: suppliedWorkspaceId, provider = 'anthropic', onClose, onChanged }) {
  const { workspace } = useWorkspace();
  const workspaceId = suppliedWorkspaceId || workspace.ownerId || workspace.slug;
  const ref = useRef(null);
  const [connections, setConnections] = useState([]);
  const [selected, setSelected] = useState(provider);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useDialogFocus(ref, open, onClose);
  const refresh = async () => { const result = await listAIConnections(workspaceId); setConnections(result.connections); };
  useEffect(() => { if (open) refresh().catch(error => setNote(error.message)); }, [workspaceId, open]);
  const connection = connections.find(row => row.provider === selected);
  const run = async operation => { setBusy(true); setNote(''); try { await operation(); setKey(''); await refresh(); setNote('Connection updated.'); onChanged?.(); } catch (error) { setNote(error.message); } finally { setBusy(false); } };
  if (!open) return null;
  return <div className="bb-builder-commerce-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} className="bb-builder-commerce-panel bb-ai-connections" role="dialog" aria-modal="true" aria-labelledby="ai-connection-title">
      <header><div><h2 id="ai-connection-title">Connect your AI</h2><p>Choose whose AI allowance pays for your requests.</p></div><Button icon={X} variant="secondary" aria-label="Close AI connections" onClick={onClose} /></header>
      <div className="bb-builder-commerce-body">
        <label>Connection<select value={selected} onChange={event => { setSelected(event.target.value); setKey(''); setNote(''); }}><option value="anthropic">Claude API</option><option value="openai">OpenAI API</option><option value="chatgpt">ChatGPT account</option></select></label>
        <p>{connection?.connected ? `Connected · ${connection.billing === 'byok' ? 'usage billed by your API provider' : connection.billing}${connection.last4 ? ` · key ending ${connection.last4}` : ''}` : connection?.reason || 'Connect a provider to continue.'}</p>
        {selected === 'chatgpt' ? <><p>ChatGPT account connections require the official supported partner integration. Availability appears here when it is configured.</p><Button disabled={busy || !connection?.oauthAvailable} onClick={() => run(async () => { const response = await startChatGPTConnection(workspaceId); const url = new URL(response.authUrl); if (url.protocol !== 'https:') throw new Error('Invalid sign-in URL.'); window.open(url.href, '_blank', 'noopener,noreferrer'); setNote('Complete sign-in in the provider window, then refresh.'); })}>Sign in with ChatGPT</Button></> : <form onSubmit={event => { event.preventDefault(); run(() => saveAIConnection(workspaceId, selected, key)); }}>
          <label>{selected === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key<input type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} placeholder="Paste your API key" required /></label>
          <p>Your provider bills API usage separately from a ChatGPT or Claude subscription. The server encrypts this key; your website and its generated code cannot access it.</p>
          <Button type="submit" disabled={busy || !key.trim()}>Connect API</Button>
        </form>}
        {connection?.connected && <Button variant="secondary" disabled={busy} onClick={() => run(() => disconnectAIConnection(workspaceId, selected))}>Disconnect</Button>}
        {selected !== 'chatgpt' && <Button variant="secondary" disabled={busy} onClick={() => run(() => selectAIBillingSource(workspaceId, selected, 'included'))}>Use included Book and Buy AI</Button>}
        <Button variant="secondary" disabled={busy} onClick={() => run(refresh)}>Refresh status</Button>
        {note && <p role="status">{note}</p>}
      </div>
    </section>
  </div>;
}

