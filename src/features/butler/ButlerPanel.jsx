import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ArrowUp, Square, Link2, Plus, MoreHorizontal, Settings2, ChevronDown, ArrowUpRight, CalendarDays, ShoppingBag, Globe2, CheckCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Button } from '../../shared/ui/Button';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';
import { AIConnectionsDialog } from '../ai/AIConnectionsDialog';
import { listAIConnections, listAIModels, runAI, getAIRun, cancelAIRun } from '../../shared/firebase/aiGateway';
import { butlerCall } from '../../shared/firebase/butler';
import { buildButlerCommand, BUTLER_TOOLS, UNAVAILABLE_CAPABILITIES } from '../../../functions/butlerDomain.js';
import { applyWorkspaceChanges } from '../../../functions/workspaceDomain.js';
import { buildBuilderCommerceContext } from '../builder/builderCommerce';
import { navigate, workspacePagePath } from '../../app/routing';
import { APP_LOGO_URL } from '../../config/appConfig';
import './butler.css';

const LOCAL = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
const LABELS = { openai: 'OpenAI', anthropic: 'Claude', chatgpt: 'ChatGPT', local: 'ChatGPT' };
const DEMO_SCHEMA = { type: 'object', additionalProperties: false, required: ['reply', 'tool', 'argumentsJson'], properties: { reply: { type: 'string' }, tool: { type: 'string', enum: ['', 'catalog.preview', 'settings.preview', 'clients.preview', 'inventory.preview', 'bookings.preview', 'orders.preview'] }, argumentsJson: { type: 'string' } } };
const label = value => value.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const display = value => Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'Empty');
function Preview({ preview, busy, onApprove, onDismiss }) {
  const args = preview.args || {}; const patch = args.patch || args.record || args.booking || {};
  return <article className="bb-butler-review" role="group" aria-label="Butler action awaiting approval"><p className="bb-butler-review-eyebrow"><CheckCheck size={14} /> A quick check with you</p>
    <strong>{preview.tool?.startsWith('catalog') ? 'Catalog change' : preview.tool?.startsWith('inventory') ? 'Stock change' : label(preview.tool?.split('.')[0] || 'Business change')}</strong>
    {args.id && <p>{preview.recordName || args.id}</p>}
    {args.body && <p>{args.body}</p>}
    {Object.entries(patch).map(([key, value]) => <div className="bb-butler-change" key={key}><span>{label(key)}</span>{preview.before?.[key] !== undefined && <del>{display(preview.before[key])}</del>}<strong>{display(value)}</strong></div>)}
    {args.updates?.map(update => <p key={update.productId + update.variantId}>{update.productId}{update.variantId ? ` / ${update.variantId}` : ''}: {update.expectedStockAvailable} → {update.patch?.stockAvailable}</p>)}
    {args.operation === 'publish' && <p>Publish the prepared website for customers.</p>}
    {args.operation === 'rollback' && <p>Restore the selected published version.</p>}
    <small>Nothing changes until you approve. This review is valid for 15 minutes.</small>
    <div className="bb-butler-actions"><Button busy={busy} variant="primary" onClick={() => onApprove(preview)}>Approve</Button><Button disabled={busy} onClick={() => onDismiss(preview)}>Dismiss</Button></div>
  </article>;
}
export function ButlerPanel() {
  const { user } = useAuth();
  const api = useWorkspace(); const { workspace } = api; const ownerId = workspace.ownerId || workspace.slug;
  const [menuOpen, setMenuOpen] = useState(false), [settingsOpen, setSettingsOpen] = useState(false);
  const [open, setOpen] = useState(false), [connectionsOpen, setConnectionsOpen] = useState(false);
  const [provider, setProvider] = useState(workspace.butler?.preferredProvider || (LOCAL && workspace.isDemo ? 'local' : 'openai')), [model, setModel] = useState(''), [models, setModels] = useState([]), [connections, setConnections] = useState([]);
  const [mode, setMode] = useState(workspace.butler?.defaultMode || 'butler'), [input, setInput] = useState(''), [messages, setMessages] = useState([]), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const [state, setState] = useState({ previews: [], automations: [], activity: [], tools: BUTLER_TOOLS }), [demoPreviews, setDemoPreviews] = useState([]);
  const composerRef = useRef(null);
  const dialogRef = useRef(null), abortRef = useRef(null), runRef = useRef(null), conversationRef = useRef(crypto.randomUUID());
  useDialogFocus(dialogRef, open, () => setOpen(false), connectionsOpen);
  useLayoutEffect(() => {
    if (!open) return;
    const fit = () => {
      const field = composerRef.current;
      if (!field) return;
      field.style.height = 'auto';
      field.style.height = `${Math.min(160, Math.max(31, field.scrollHeight))}px`;
      field.style.overflowY = field.scrollHeight > 160 ? 'auto' : 'hidden';
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [input, open]);
  const key = `bookbuy-butler-run:${ownerId}`;
  const refresh = async () => {
    if (workspace.isDemo) return;
    const result = await butlerCall('getButlerState', ownerId); setState(result);
  };
  const refreshConnections = async () => {
    if (provider === 'local') {
      const response = await fetch('/api/builder/codex/health'); const result = await response.json();
      if (!response.ok || !result.connected) throw new Error(result.error || 'Connect ChatGPT in the website editor to use local Butler.');
      setNote(''); setModels(result.models || []); setModel(old => old || result.defaultModel || result.models?.[0]?.name || ''); return;
    }
    if (workspace.isDemo) { setModels([]); return; }
    const [status, catalog] = await Promise.all([listAIConnections(ownerId), listAIModels(ownerId)]);
    setConnections(status.connections); const selected = catalog.providers.find(row => row.provider === provider);
    setModels(selected?.models || []); setModel(old => selected?.models.some(row => row.name === old) ? old : selected?.defaultModel || '');
  };
  useEffect(() => { conversationRef.current = crypto.randomUUID(); setModel(''); if (open) refreshConnections().catch(error => setNote(error.message)); }, [provider, mode, ownerId]);
  useEffect(() => {
    if (!open) return;
    refresh().catch(error => setNote(error.message)); refreshConnections().catch(error => setNote(error.message));
    let stopped = false;
    const saved = localStorage.getItem(key);
    if (saved && !workspace.isDemo) {
      getAIRun(ownerId, saved).then(result => { if (stopped) return; runRef.current = saved; setMessages(old => [...old, { role: 'assistant', content: result.content || 'A saved request is available.', runId: saved }]); setNote(result.status === 'running' ? 'This request is still running. Refresh progress or stop it below.' : result.error?.message || `Recovered ${result.status} request.`); if (result.status !== 'running') localStorage.removeItem(key); }).catch(error => setNote(error.message));
    }
    return () => { stopped = true; };
  }, [open, ownerId]);
  const perform = async operation => { if (busy) return; setBusy(true); setNote(''); try { await operation(); await refresh(); } catch (error) { setNote(error.message); } finally { setBusy(false); } };
  async function submit(event) {
    event.preventDefault(); if (busy || !input.trim()) return;
    const question = input.trim(); setInput(''); setBusy(true); setNote('Working…');
    const next = [...messages.filter(row => !row.runId), { role: 'user', content: question }]; setMessages(next);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let reply;
      if (provider === 'local') {
        if (!workspace.isDemo) throw new Error('Local Butler changes are available in the demo workspace. Use a hosted connection for your business.');
        const response = await fetch('/api/builder/codex/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ model, conversationId: conversationRef.current, format: DEMO_SCHEMA, messages: [{ role: 'system', content: `You are Book and Buy Butler in a local demo. Answer using this live demo catalog: ${JSON.stringify(buildBuilderCommerceContext(workspace))}. Counts: ${JSON.stringify({ orders: workspace.orders?.length, bookings: workspace.bookings?.length })}. Never claim a write succeeded. For changes return one registered preview tool and its arguments as JSON text. Settings arguments: {section,patch}; catalog: {section:products|services,id,operation:upsert|archive,patch}. Inventory: {updates:[{productId,variantId,expectedStockAvailable,patch:{stockAvailable}}]}. Booking: {booking}. Order: {id,patch}. Ask and Plan only return text. Mode=${mode}. Do not request credentials. Unavailable: ${UNAVAILABLE_CAPABILITIES.join(', ')}.` }, { role: 'user', content: question }] }) });
        const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || 'Butler could not answer.');
        const parsed = JSON.parse(result.content); reply = parsed.reply;
        if (mode === 'butler' && parsed.tool) {
          const args = JSON.parse(parsed.argumentsJson), command = buildButlerCommand(workspace, parsed.tool, args);
          const record = workspace[args.section]?.find?.(row => row.id === args.id);
          setDemoPreviews(prior => [...prior, { id: crypto.randomUUID(), tool: parsed.tool, args, command, before: record || workspace[args.section], recordName: record?.name, signature: JSON.stringify(workspace), expiresAt: Date.now() + 900000 }]);
          setNote('A change is ready for your review below.');
        } else setNote('');
      } else {
        const requestId = crypto.randomUUID(); runRef.current = requestId; localStorage.setItem(key, requestId);
        const result = await runAI({ workspaceId: ownerId, provider, model, mode, conversationId: conversationRef.current, requestId, messages: next.slice(-10).map(({ role, content }) => ({ role, content })) }, event => { if (event.type === 'text') setNote('Writing the answer…'); if (event.type === 'tool') setNote('Checking business information…'); }, controller.signal);
        reply = result.content; if (result.status === 'running') setNote('Saved progress is available. Use Refresh progress.'); else { localStorage.removeItem(key); setNote(result.error?.message || ''); }
        await refresh();
      }
      if (reply) setMessages(old => [...old, { role: 'assistant', content: reply }]);
    } catch (error) { setNote(error.name === 'AbortError' ? 'Stopped. Saved server progress can be recovered.' : error.message); } finally { setBusy(false); abortRef.current = null; }
  }
  const approve = preview => perform(async () => {
    if (!workspace.isDemo) await butlerCall('applyButlerPreview', ownerId, { previewId: preview.id, approve: true });
    else {
      if (preview.expiresAt < Date.now() || preview.signature !== JSON.stringify(workspace)) throw new Error('This demo changed. Prepare a fresh preview.');
      const command = preview.command;
      if (command.operation === 'workspace.patch') api.updateProfile(applyWorkspaceChanges(workspace, command.changes));
      else if (command.operation === 'inventory.adjust') { const result = await api.updateInventory(command.updates); if (!result.ok) throw new Error(result.error); }
      else if (command.operation === 'booking.write') { if (command.booking.id) await api.updateBooking(command.booking.id, command.booking); else await api.addBooking(command.booking); }
      else if (command.operation === 'order.update') { const result = await api.updateOrder(command.id, command.patch); if (!result) throw new Error('The order could not be changed.'); }
      else throw new Error('Use the secure owner flow for this action.');
      setDemoPreviews(prior => prior.filter(row => row.id !== preview.id));
    }
    setMessages(prior => [...prior, { role: 'assistant', content: workspace.isDemo ? 'All taken care of. Your demo has been updated.' : 'All taken care of. The server has confirmed your change.' }]); setNote('');
  });
  const dismiss = preview => perform(async () => { if (workspace.isDemo) setDemoPreviews(prior => prior.filter(row => row.id !== preview.id)); else await butlerCall('dismissButlerPreview', ownerId, { previewId: preview.id }); });
  const previews = workspace.isDemo ? demoPreviews : state.previews;
  const selectedConnection = connections.find(row => row.provider === provider);
  const person = workspace.staff?.find(row => user?.email && row.email?.toLowerCase() === user.email.toLowerCase()) || workspace.staff?.find(row => row.accessRole === 'Owner');
  const firstName = (person?.name || user?.displayName || '').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const newChat = () => { setMessages([]); setInput(''); setMenuOpen(false); conversationRef.current = crypto.randomUUID(); setNote(''); };
  const suggestion = text => { setInput(text); dialogRef.current?.querySelector('textarea')?.focus(); };
  const stop = () => { abortRef.current?.abort(); if (provider !== 'local' && runRef.current) cancelAIRun(ownerId, runRef.current).catch(error => setNote(error.message)); };
  const Mark = ({ large = false }) => <span className={`bb-butler-mark${large ? ' is-large' : ''}`} aria-hidden="true"><img src="/brand/butler-bow-tie.png" alt="" /></span>;
  return <>
    <button type="button" className="bb-butler-launch" aria-label="Open Book and Buy Butler" onClick={() => setOpen(true)}><Mark /><span>Butler</span>{previews.length > 0 && <b>{previews.length}</b>}</button>
    {open && <div className="bb-butler-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}><section className="bb-butler-panel" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="butler-title">
      <header className="bb-butler-header"><div className="bb-butler-identity"><img className="bb-butler-header-logo" src={APP_LOGO_URL} alt="Book and Buy" /><div><h2 id="butler-title">Butler<span>by Book &amp; Buy</span></h2></div></div><div className="bb-butler-header-actions"><button className="bb-butler-icon" aria-label="New Butler chat" title="New chat" disabled={busy} onClick={newChat}><Plus size={18} /></button><div className="bb-butler-menu-wrap"><button className="bb-butler-icon" aria-label="Butler options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>{menuOpen && <div className="bb-butler-menu"><button onClick={() => { navigate(workspacePagePath('settings/butler')); setOpen(false); setMenuOpen(false); }}><Settings2 size={16} />Butler settings</button><button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}><Link2 size={16} />AI &amp; connections</button></div>}</div><button className="bb-butler-icon" aria-label="Close Butler" onClick={() => setOpen(false)}><X size={19} /></button></div></header>
      <div className={`bb-butler-content${!messages.length && !previews.length ? ' is-welcome' : ''}`}>
          {settingsOpen && <section className="bb-butler-connection-settings"><header><strong>Your AI connection</strong><button className="bb-butler-icon" aria-label="Close connection settings" onClick={() => setSettingsOpen(false)}><X size={16}/></button></header><label>Assistant<select aria-label="Butler AI provider" value={provider} disabled={busy} onChange={e => setProvider(e.target.value)}>{LOCAL && workspace.isDemo && <option value="local">ChatGPT · local</option>}<option value="openai">Book and Buy / OpenAI</option><option value="chatgpt">ChatGPT account</option></select></label><label>Model<select aria-label="Butler model" value={model} disabled={busy} onChange={e => { setModel(e.target.value); conversationRef.current = crypto.randomUUID(); }}><option value="">Choose a model</option>{models.map(row => <option key={row.name} value={row.name}>{row.label || row.name}</option>)}</select></label><p>{provider === 'local' ? 'Uses your signed-in local ChatGPT connection.' : selectedConnection?.billing === 'byok' ? 'API usage is billed to your provider account.' : selectedConnection?.billing === 'included' ? 'Uses your included Book and Buy AI allowance.' : selectedConnection?.reason || 'Choose a connection to get started.'}</p><Button icon={Link2} onClick={() => setConnectionsOpen(true)}>Manage connections</Button></section>}
          {!messages.length ? <div className="bb-butler-welcome"><Mark large /><p className="bb-butler-greeting">{greeting}{firstName ? `, ${firstName}` : ''}.</p><h1>What would you like<br />to do next?</h1><p className="bb-butler-intro">A fresh idea, a small task, or your next big move.<br />I'm here to help you take care of it.</p><div className="bb-butler-suggestions"><button onClick={() => suggestion('What needs my attention today? Check my bookings and orders.')}><span className="bb-butler-suggestion-icon"><CalendarDays size={17} strokeWidth={1.6}/></span><span>Get a little clarity on today</span><ArrowUpRight size={16}/></button><button onClick={() => suggestion('Help me improve my products and services. Suggest a useful next step.')}><span className="bb-butler-suggestion-icon"><ShoppingBag size={17} strokeWidth={1.6}/></span><span>Give my business a little love</span><ArrowUpRight size={16}/></button><button onClick={() => { navigate(workspacePagePath('builder')); setOpen(false); }}><span className="bb-butler-suggestion-icon"><Globe2 size={17} strokeWidth={1.6}/></span><span>Create something beautiful</span><ArrowUpRight size={16}/></button></div></div> : <div className="bb-butler-messages" aria-live="polite">{messages.map((message, index) => <article key={index} className={message.role}>{message.role === 'assistant' && <div className="bb-butler-message-author"><Mark /><span>Butler</span></div>}<p>{message.content}</p></article>)}</div>}
          {previews.map(preview => <Preview key={preview.id} preview={preview} busy={busy} onApprove={approve} onDismiss={dismiss} />)}
      </div>
      {note && <p className={`bb-butler-note${busy ? ' is-working' : ''}`} role="status">{busy && <span className="bb-butler-working-dot"/>}{note}</p>}
      <div className="bb-butler-composer-area"><form className="bb-butler-composer" onSubmit={submit}><textarea ref={composerRef} className="native-control-nest" aria-label="Message Butler" placeholder="Ask your Butler anything…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !busy && model && input.trim()) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} rows="1" maxLength={6000} /><div className="bb-butler-composer-bottom"><label className="bb-butler-mode"><select aria-label="Butler conversation mode" value={mode} disabled={busy} onChange={e => setMode(e.target.value)}><option value="butler">Assist</option><option value="plan">Plan</option><option value="ask">Ask</option></select></label><button type="button" className="bb-butler-model-chip" aria-label="Choose Butler AI and model" onClick={() => { setSettingsOpen(!settingsOpen); dialogRef.current?.querySelector('.bb-butler-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>{LABELS[provider]}<ChevronDown size={12}/></button><button className="bb-butler-send" type={busy ? 'button' : 'submit'} aria-label={busy ? 'Stop Butler' : 'Send message to Butler'} disabled={!busy && (!model || !input.trim())} onClick={busy ? stop : undefined}>{busy ? <Square size={14} fill="currentColor"/> : <ArrowUp size={18}/>}</button></div></form><p className="bb-butler-assurance">I'll check with you before making changes.</p>{runRef.current && provider !== 'local' && <button className="bb-butler-recover" disabled={busy} onClick={() => perform(async () => { const result = await getAIRun(ownerId, runRef.current); setMessages(old => [...old, { role: 'assistant', content: result.content || result.error?.message || 'Waiting for progress.' }]); setNote(result.status); })}>Recover saved progress</button>}</div>
    </section></div>}
    {connectionsOpen && <AIConnectionsDialog workspaceId={ownerId} provider={provider === 'local' ? 'chatgpt' : provider} onClose={() => setConnectionsOpen(false)} onChanged={() => refreshConnections().catch(error => setNote(error.message))} />}
  </>;
}
