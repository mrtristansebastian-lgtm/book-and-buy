import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Link2, Plus, MoreHorizontal, Settings2, ArrowUpRight, CalendarDays, ShoppingBag, Globe2, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { Button } from '../../shared/ui/Button';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';
import { AIConnectionsDialog } from '../ai/AIConnectionsDialog';
import { listAIConnections, listAIModels, listAIConversations, getAIConversation, runAI, getAIRun, cancelAIRun, deleteAIConversation } from '../../shared/firebase/aiGateway';
import { conversationMessages, updateRunMessage, butlerIdentity, butlerStorageKeys, matchesConversation, scopedHistory, isCurrentButlerRequest, restoredRunMessages } from './butlerConversation';
import { recoverDurableRun } from '../../shared/firebase/aiRunRecovery';
import { butlerCall } from '../../shared/firebase/butler';
import { buildButlerCommand, BUTLER_TOOLS, UNAVAILABLE_CAPABILITIES } from '../../../functions/butlerDomain.js';
import { applyWorkspaceChanges } from '../../../functions/workspaceDomain.js';
import { buildBuilderCommerceContext } from '../builder/builderCommerce';
import { navigate, workspacePagePath } from '../../app/routing';
import { APP_LOGO_URL } from '../../config/appConfig';
import './butler.css';
import { ButlerComposer } from './ButlerComposer';
import { useAIConfirmations } from '../ai/useAIConfirmations';
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
    {args.project && <details><summary>Review website draft · {args.project.name || 'Untitled project'}</summary><p>This saves a draft for the website editor. Customers will see it only after a separate publish approval.</p><pre className="bb-butler-code-review">{args.project.html}</pre></details>}
    {preview.lastError && <p role="status">{preview.lastError}</p>}
    <small>Nothing changes until you approve. This review is valid for 15 minutes.</small>
    <div className="bb-butler-actions"><Button busy={busy} variant="primary" onClick={() => onApprove(preview)}>Approve</Button><Button disabled={busy} onClick={() => onDismiss(preview)}>Dismiss</Button></div>
  </article>;
}
export function ButlerPanel() {
  const { user } = useAuth();
  const api = useWorkspace(); const { workspace } = api; const ownerId = workspace.ownerId || workspace.slug;
  const confirmations = useAIConfirmations(ownerId);
  const [recoveryUrl, setRecoveryUrl] = useState('');
  const [menuOpen, setMenuOpen] = useState(false), [composerMenu, setComposerMenu] = useState('');
  const [open, setOpen] = useState(false), [connectionsOpen, setConnectionsOpen] = useState(false);
  const [provider, setProvider] = useState((['openai', 'chatgpt'].includes(workspace.butler?.preferredProvider) ? workspace.butler.preferredProvider : LOCAL && workspace.isDemo ? 'local' : 'openai')), [model, setModel] = useState(''), [models, setModels] = useState([]), [connections, setConnections] = useState([]);
  const [mode, setMode] = useState((['butler', 'plan'].includes(workspace.butler?.defaultMode) ? workspace.butler.defaultMode : 'butler')), [input, setInput] = useState(''), [messages, setMessages] = useState([]), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]), [historyOpen, setHistoryOpen] = useState(false), [effort, setEffort] = useState('');
  const [state, setState] = useState({ previews: [], automations: [], activity: [], tools: BUTLER_TOOLS }), [demoPreviews, setDemoPreviews] = useState([]);
  const composerRef = useRef(null);
  const modeDraftRef = useRef(null);
  const setSettingsOpen = value => setComposerMenu(value ? 'ai' : '');
  const [visibleViewport, setVisibleViewport] = useState(null);
  useLayoutEffect(() => {
    if (!open || !window.visualViewport) return undefined;
    const viewport = window.visualViewport;
    const fit = () => setVisibleViewport({ height: viewport.height, top: viewport.offsetTop });
    fit(); viewport.addEventListener('resize', fit); viewport.addEventListener('scroll', fit);
    return () => { viewport.removeEventListener('resize', fit); viewport.removeEventListener('scroll', fit); };
  }, [open]);
  const dialogRef = useRef(null), abortRef = useRef(null), runRef = useRef(null), conversationRef = useRef(crypto.randomUUID()), identityRef = useRef(''), requestScope = useRef(0), operationRef = useRef(false), restoredRef = useRef(''), pinnedRef = useRef(null);
  const [restoring, setRestoring] = useState(false);
  useDialogFocus(dialogRef, open, () => { setOpen(false); setComposerMenu(''); }, connectionsOpen || confirmations.pending);
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
  const selectedConnection = connections.find(row => row.provider === provider);
  const connectionRevision = provider === 'local' ? 'local' : selectedConnection?.revision || '';
  const identity = butlerIdentity({ ownerId, uid: user?.uid, demo: workspace.isDemo, provider, mode, revision: connectionRevision });
  // Update during render so responses for the previous owner cannot land between
  // a new render and its reset effect.
  identityRef.current = identity;
  const storage = butlerStorageKeys(identity), key = storage.run, conversationKey = storage.conversation;
  const readSaved = (store, name) => { try { return store.getItem(name); } catch { return null; } };
  const writeSaved = (store, name, value) => { try { if (value) store.setItem(name, value); else store.removeItem(name); } catch { /* server history remains available */ } };
  const capture = () => ({ identity, epoch: requestScope.current, conversationId: conversationRef.current });
  const isCurrent = scope => isCurrentButlerRequest(scope, { identity: identityRef.current, epoch: requestScope.current, conversationId: conversationRef.current });
  const contract = conversationId => ({ provider, mode, revision: connectionRevision, ...(conversationId ? { conversationId } : {}) });
  const refresh = async (scope = capture()) => {
    if (workspace.isDemo || !isCurrent(scope)) return;
    const result = await butlerCall('getButlerState', ownerId);
    if (isCurrent(scope)) setState({ ...result, previews: (result.previews || []).map(preview => ({ ...preview, uiScope: scope })) });
  };
  const refreshConnections = async (scope = capture()) => {
    if (!isCurrent(scope)) return;
    if (provider === 'local') {
      const response = await fetch('/api/builder/codex/health'); const result = await response.json();
      if (!isCurrent(scope)) return;
      if (!response.ok || !result.connected) throw new Error(result.error || 'Connect ChatGPT in the website editor to use local Butler.');
      setNote(''); setModels(result.models || []); setModel(old => old || result.defaultModel || result.models?.[0]?.name || ''); return;
    }
    if (workspace.isDemo) { setModels([]); return; }
    const [status, catalog] = await Promise.all([listAIConnections(ownerId), listAIModels(ownerId)]);
    if (!isCurrent(scope)) return;
    setConnections(status.connections); const selected = catalog.providers.find(row => row.provider === provider);
    setModels(selected?.models || []); if (selected?.reason) setNote(selected.reason); if (selected?.error?.details?.recoveryUrl) setRecoveryUrl(selected.error.details.recoveryUrl);
    if (!pinnedRef.current) setModel(old => selected?.models.some(row => row.name === old) ? old : selected?.defaultModel || '');
  };
  const refreshHistory = async (scope = capture()) => {
    const result = await listAIConversations(ownerId);
    if (isCurrent(scope)) setHistory(scopedHistory(result.conversations, contract()));
  };
  useEffect(() => {
    if (pinnedRef.current) return;
    const selected = models.find(row => row.name === model);
    setEffort(old => selected?.efforts?.some(row => row.reasoningEffort === old) ? old : selected?.defaultEffort || '');
  }, [models, model]);
  useEffect(() => {
    requestScope.current++; abortRef.current?.abort(); abortRef.current = null; runRef.current = null; operationRef.current = false; pinnedRef.current = null; restoredRef.current = '';
    setMessages([]); setState({ previews: [], automations: [], activity: [], tools: BUTLER_TOOLS }); setDemoPreviews([]); setHistory([]); setNote(''); setModel(''); setEffort(''); setBusy(false); setRestoring(false); const draft = modeDraftRef.current; setInput(draft && draft.ownerId === ownerId && draft.uid === user?.uid && draft.provider === provider && draft.revision === connectionRevision ? draft.text : ''); modeDraftRef.current = null; setHistoryOpen(false);
    conversationRef.current = !workspace.isDemo && connectionRevision && readSaved(sessionStorage, conversationKey) || crypto.randomUUID();
    if (!workspace.isDemo && connectionRevision) writeSaved(sessionStorage, conversationKey, conversationRef.current);
  }, [identity]);
  useEffect(() => () => { requestScope.current++; abortRef.current?.abort(); }, []);
  async function recover(scope, runId, controller) {
    runRef.current = runId; writeSaved(localStorage, key, runId);
    const result = await recoverDurableRun({ runId, signal: controller.signal, getRun: async (_id, sequence) => {
      const saved = await getAIRun(ownerId, runId, sequence);
      if (!isCurrent(scope)) { controller.abort(); throw new DOMException('Conversation changed.', 'AbortError'); }
      if (!matchesConversation(saved, contract(scope.conversationId)) || pinnedRef.current && pinnedRef.current.model !== saved.model) throw Object.assign(new Error('This saved request belongs to another AI connection or conversation.'), { code: 'invalid-argument' });
      if (!pinnedRef.current) { pinnedRef.current = { model: saved.model, effort: saved.reasoningEffort || '' }; setModel(saved.model); setEffort(saved.reasoningEffort || ''); }
      setMessages(old => restoredRunMessages(old, saved)); setNote(saved.status === 'running' ? 'Recovering your saved request...' : saved.error?.message || '');
      return saved;
    } });
    if (isCurrent(scope)) { writeSaved(localStorage, key, null); runRef.current = null; setMessages(old => restoredRunMessages(old, result)); }
    return result;
  }
  async function restoreConversation(scope, conversationId, { optional = false } = {}) {
    if (!isCurrent(scope) || operationRef.current) return;
    operationRef.current = true; setRestoring(true); setNote('Loading your conversation...');
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let conversation;
      try { conversation = await getAIConversation(ownerId, conversationId); }
      catch (error) { if (!optional || !String(error.code || '').endsWith('not-found')) throw error; }
      if (!isCurrent(scope)) return;
      if (conversation) {
        if (!matchesConversation(conversation, contract(conversationId))) throw new Error('This conversation belongs to a different AI connection. Start a new chat.');
        pinnedRef.current = { model: conversation.model, effort: conversation.reasoningEffort || '' };
        setModel(conversation.model); setEffort(conversation.reasoningEffort || ''); setMessages(conversationMessages(conversation));
      }
      restoredRef.current = `${scope.identity}:${conversationId}`;
      const savedRun = conversation?.activeRun || readSaved(localStorage, key);
      if (savedRun) await recover(scope, savedRun, controller);
      else setNote('');
    } catch (error) { if (isCurrent(scope)) setNote(error.name === 'AbortError' ? 'Stopped. Saved progress is available.' : error.message); }
    finally { if (isCurrent(scope)) { operationRef.current = false; setRestoring(false); abortRef.current = null; } }
  }
  useEffect(() => {
    if (!open) return;
    const scope = capture();
    refresh(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); });
    refreshConnections(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); });
    if (workspace.isDemo || !connectionRevision) return;
    refreshHistory(scope).catch(() => {});
    if (restoredRef.current !== `${identity}:${scope.conversationId}` && !operationRef.current) void restoreConversation(scope, scope.conversationId, { optional: true });
  }, [open, identity]);
  const perform = async operation => {
    const scope = capture(); if (operationRef.current) return;
    operationRef.current = true; setBusy(true); setNote('');
    try { await operation(scope); if (isCurrent(scope)) await refresh(scope); }
    catch (error) { if (isCurrent(scope)) setNote(error.message); }
    finally { if (isCurrent(scope)) { operationRef.current = false; setBusy(false); } }
  };
  async function submit(event) {
    event.preventDefault(); if (operationRef.current || !canSend || !input.trim() || !model || provider !== 'local' && (!connectionRevision || !selectedConnection?.available)) return;
    const scope = capture(); operationRef.current = true; restoredRef.current = `${identity}:${scope.conversationId}`;
    const question = input.trim(); setInput(''); setBusy(true); setNote('Working...'); setRecoveryUrl('');
    const next = [...messages, { role: 'user', content: question }]; setMessages(next);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let reply;
      if (provider === 'local') {
        if (!workspace.isDemo) throw new Error('Local Butler changes are available in the demo workspace. Use a hosted connection for your business.');
        const response = await fetch('/api/builder/codex/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ model, reasoningEffort: effort || undefined, conversationId: scope.conversationId, format: DEMO_SCHEMA, messages: [{ role: 'system', content: `You are Book and Buy Butler in a local demo. Answer using this live demo catalog: ${JSON.stringify(buildBuilderCommerceContext(workspace))}. Counts: ${JSON.stringify({ orders: workspace.orders?.length, bookings: workspace.bookings?.length })}. Never claim a write succeeded. For changes return one registered preview tool and its arguments as JSON text. Settings arguments: {section,patch}; catalog: {section:products|services,id,operation:upsert|archive,patch}. Inventory: {updates:[{productId,variantId,expectedStockAvailable,patch:{stockAvailable}}]}. Booking: {booking}. Order: {id,patch}. Chat (ask) and Plan only return text. Work (butler) may prepare reviewed actions. Mode=${mode}. Do not request credentials. Unavailable: ${UNAVAILABLE_CAPABILITIES.join(', ')}.` }, { role: 'user', content: question }] }) });
        const result = await response.json(); if (!isCurrent(scope)) return;
        if (!response.ok || result.error) throw new Error(result.error || 'Butler could not answer.');
        const parsed = JSON.parse(result.content); reply = parsed.reply;
        if (mode === 'butler' && parsed.tool) {
          const args = JSON.parse(parsed.argumentsJson), command = buildButlerCommand(workspace, parsed.tool, args);
          const record = workspace[args.section]?.find?.(row => row.id === args.id);
          setDemoPreviews(prior => [...prior, { id: crypto.randomUUID(), tool: parsed.tool, args, command, before: record || workspace[args.section], recordName: record?.name, signature: JSON.stringify(workspace), expiresAt: Date.now() + 900000, uiScope: scope }]);
          setNote('A change is ready for your review below.');
        } else setNote('');
      } else {
        await confirmations.ensurePlanUsage(selectedConnection, controller.signal);
        if (!isCurrent(scope) || controller.signal.aborted) return;
        const requestId = crypto.randomUUID(); runRef.current = requestId; writeSaved(localStorage, key, requestId);
        const result = await runAI({ workspaceId: ownerId, provider, connectionRevision, model, reasoningEffort: effort || undefined, mode, conversationId: scope.conversationId, requestId, messages: next.slice(-10).map(({ role, content }) => ({ role, content })) }, event => { if (!isCurrent(scope)) return; if (event.type === 'content' && event.text) { setNote('Writing the answer...'); setMessages(old => updateRunMessage(old, requestId, event.text, { append: true })); } if (event.type === 'tool') setNote('Checking business information...'); }, controller.signal);
        if (!isCurrent(scope)) return;
        setMessages(old => restoredRunMessages(old, result));
        if (result.status === 'running') setNote('Saved progress is available. Use Recover saved progress.');
        else { writeSaved(localStorage, key, null); runRef.current = null; setNote(result.error?.message || ''); setRecoveryUrl(result.error?.details?.recoveryUrl || ''); }
        await refresh(scope);
      }
      if (reply && provider === 'local' && isCurrent(scope)) setMessages(old => [...old, { role: 'assistant', content: reply }]);
    } catch (error) { if (isCurrent(scope)) setNote(error.name === 'AbortError' ? 'Stopped. Saved server progress can be recovered.' : error.message); }
    finally { if (isCurrent(scope)) { operationRef.current = false; setBusy(false); abortRef.current = null; } }
  }
  const approve = preview => perform(async scope => {
    if (!preview.uiScope || !isCurrent(preview.uiScope)) throw new Error('This review belongs to a previous conversation. Reload it before approving.');
    if (!workspace.isDemo) await butlerCall('applyButlerPreview', ownerId, { previewId: preview.id, approve: true });
    else {
      if (preview.expiresAt < Date.now() || preview.signature !== JSON.stringify(workspace)) throw new Error('This demo changed. Prepare a fresh preview.');
      const command = preview.command;
      if (command.operation === 'workspace.patch') api.updateProfile(applyWorkspaceChanges(workspace, command.changes));
      else if (command.operation === 'inventory.adjust') { const result = await api.updateInventory(command.updates); if (!result.ok) throw new Error(result.error); }
      else if (command.operation === 'booking.write') { if (command.booking.id) await api.updateBooking(command.booking.id, command.booking); else await api.addBooking(command.booking); }
      else if (command.operation === 'order.update') { const result = await api.updateOrder(command.id, command.patch); if (!result) throw new Error('The order could not be changed.'); }
      else throw new Error('Use the secure owner flow for this action.');
      if (isCurrent(scope)) setDemoPreviews(prior => prior.filter(row => row.id !== preview.id));
    }
    if (isCurrent(scope)) { setMessages(prior => [...prior, { role: 'assistant', content: workspace.isDemo ? 'All taken care of. Your demo has been updated.' : 'All taken care of. The server has confirmed your change.' }]); setNote(''); }
  });
  const dismiss = preview => perform(async scope => {
    if (!preview.uiScope || !isCurrent(preview.uiScope)) throw new Error('Reload this review before dismissing it.');
    if (workspace.isDemo) { if (isCurrent(scope)) setDemoPreviews(prior => prior.filter(row => row.id !== preview.id)); }
    else await butlerCall('dismissButlerPreview', ownerId, { previewId: preview.id });
  });
  const removeConversation = row => perform(async scope => {
    await confirmations.confirmDeletion(row);
    if (!isCurrent(scope)) return;
    await deleteAIConversation(ownerId, row.conversationId, row.updatedAt);
    if (!isCurrent(scope)) return;
    if (row.conversationId === conversationRef.current) { operationRef.current = false; setBusy(false); newChat(); }
    await refreshHistory(capture());
  });
  const previews = workspace.isDemo ? demoPreviews : state.previews;
  const person = workspace.staff?.find(row => user?.email && row.email?.toLowerCase() === user.email.toLowerCase()) || workspace.staff?.find(row => row.accessRole === 'Owner');
  const firstName = (person?.name || user?.displayName || '').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const newChat = () => {
    if (operationRef.current) return;
    requestScope.current++; pinnedRef.current = null; setMessages([]); setDemoPreviews([]); setState(old => ({ ...old, previews: [] })); setInput(''); setMenuOpen(false); setHistoryOpen(false);
    conversationRef.current = crypto.randomUUID(); writeSaved(sessionStorage, conversationKey, conversationRef.current); runRef.current = null; writeSaved(localStorage, key, null); setNote(''); restoredRef.current = `${identity}:${conversationRef.current}`;
    const scope = capture(); refresh(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); });
  };
  const selectConversation = row => {
    if (operationRef.current || !matchesConversation(row, contract())) return;
    requestScope.current++; conversationRef.current = row.conversationId; writeSaved(sessionStorage, conversationKey, row.conversationId); runRef.current = null; writeSaved(localStorage, key, null); setHistoryOpen(false); setMessages([]); pinnedRef.current = null;
    const scope = capture(); void restoreConversation(scope, row.conversationId); refresh(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); });
  };
  const toggleHistory = () => {
    if (operationRef.current) return; const scope = capture(); setMenuOpen(false); setHistoryOpen(!historyOpen);
    refreshHistory(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); });
  };
  const recoverSaved = () => {
    const scope = capture(), runId = runRef.current; if (!runId || operationRef.current) return;
    operationRef.current = true; setRestoring(true); const controller = new AbortController(); abortRef.current = controller;
    recover(scope, runId, controller).catch(error => { if (isCurrent(scope)) setNote(error.name === 'AbortError' ? 'Stopped.' : error.message); }).finally(() => { if (isCurrent(scope)) { operationRef.current = false; setRestoring(false); abortRef.current = null; } });
  };
  const suggestion = text => { setInput(text); dialogRef.current?.querySelector('textarea')?.focus(); };
  const stop = () => { const scope = capture(), runId = runRef.current; abortRef.current?.abort(); if (provider !== 'local' && runId) cancelAIRun(ownerId, runId).catch(error => { if (isCurrent(scope)) setNote(error.message); }); };
  const working = busy || restoring;
  const modelAvailable = models.some(row => row.name === model);
  const thinkingAvailable = !effort || models.find(row => row.name === model)?.efforts?.some(row => row.reasoningEffort === effort);
  const canSend = Boolean(modelAvailable && thinkingAvailable && (provider === 'local' || connectionRevision && selectedConnection?.available));
  const Mark = ({ large = false }) => <span className={`bb-butler-mark${large ? ' is-large' : ''}`} aria-hidden="true"><img src="/brand/butler-bow-tie.png" alt="" /></span>;
  return <>
    <button type="button" className="bb-butler-launch" aria-label="Open Book and Buy Butler" onClick={() => setOpen(true)}><Mark /><span>Butler</span>{previews.length > 0 && <b>{previews.length}</b>}</button>
    {open && <div className="bb-butler-overlay" style={visibleViewport ? { height: visibleViewport.height, top: visibleViewport.top, '--butler-viewport-height': `${visibleViewport.height}px`, bottom: 'auto' } : undefined} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}><section className="bb-butler-panel" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="butler-title">
      <header className="bb-butler-header"><div className="bb-butler-identity"><img className="bb-butler-header-logo" src={APP_LOGO_URL} alt="Book and Buy" /><div><h2 id="butler-title">Butler<span>by Book &amp; Buy</span></h2></div></div><div className="bb-butler-header-actions"><button className="bb-butler-icon" aria-label="New Butler chat" title="New chat" disabled={working} onClick={newChat}><Plus size={18} /></button><div className="bb-butler-menu-wrap"><button className="bb-butler-icon" aria-label="Butler options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>{menuOpen && <div className="bb-butler-menu"><button onClick={() => { navigate(workspacePagePath('settings/butler')); setOpen(false); setMenuOpen(false); }}><Settings2 size={16} />Butler settings</button>{!workspace.isDemo && <button disabled={working} onClick={toggleHistory}>Recent conversations</button>}<button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}><Link2 size={16} />AI &amp; connections</button></div>}</div><button className="bb-butler-icon" aria-label="Close Butler" onClick={() => setOpen(false)}><X size={19} /></button></div></header>
      <div className={`bb-butler-content${!messages.length && !previews.length ? ' is-welcome' : ''}`}>
          {historyOpen && <section className="bb-butler-connection-settings"><header><strong>Recent conversations</strong><button className="bb-butler-icon" aria-label="Close conversation history" onClick={() => setHistoryOpen(false)}><X size={16}/></button></header>{!history.length && <p>Your saved conversations will appear here.</p>}{history.map(row => <div className="bb-butler-history-row" key={row.conversationId}><button className="bb-butler-history-item" disabled={working} onClick={() => selectConversation(row)}>{row.title}</button><button className="bb-butler-icon" disabled={working} aria-label={`Delete ${row.title}`} onClick={() => removeConversation(row)}><Trash2 size={15}/></button></div>)}</section>}

          {!messages.length ? <div className="bb-butler-welcome"><Mark large /><p className="bb-butler-greeting">{greeting}{firstName ? `, ${firstName}` : ''}.</p><h1>What would you like<br />to do next?</h1><p className="bb-butler-intro">A fresh idea, a small task, or your next big move.<br />{' '}I'm here to help you take care of it.</p><div className="bb-butler-suggestions"><button onClick={() => suggestion('What needs my attention today? Check my bookings and orders.')}><span className="bb-butler-suggestion-icon"><CalendarDays size={17} strokeWidth={1.6}/></span><span>Get a little clarity on today</span><ArrowUpRight size={16}/></button><button onClick={() => suggestion('Help me improve my products and services. Suggest a useful next step.')}><span className="bb-butler-suggestion-icon"><ShoppingBag size={17} strokeWidth={1.6}/></span><span>Give my business a little love</span><ArrowUpRight size={16}/></button><button onClick={() => { navigate(workspacePagePath('builder')); setOpen(false); }}><span className="bb-butler-suggestion-icon"><Globe2 size={17} strokeWidth={1.6}/></span><span>Create something beautiful</span><ArrowUpRight size={16}/></button></div></div> : <div className="bb-butler-messages" aria-live="polite">{messages.map((message, index) => <article key={index} className={message.role}>{message.role === 'assistant' && <div className="bb-butler-message-author"><Mark /><span>Butler</span></div>}<p>{message.content}</p></article>)}</div>}
          {previews.map(preview => <Preview key={preview.id} preview={preview} busy={working} onApprove={approve} onDismiss={dismiss} />)}
      </div>
      {note && <p className={`bb-butler-note${working ? ' is-working' : ''}`} role="status">{working && <span className="bb-butler-working-dot"/>}{note}</p>}
      {recoveryUrl === 'https://chatgpt.com/settings/usage' && <a className="bb-butler-recover" href={recoveryUrl} target="_blank" rel="noreferrer">Manage ChatGPT usage ↗</a>}
      <div className="bb-butler-composer-area"><ButlerComposer input={input} onInput={setInput} fieldRef={composerRef} mode={mode} onMode={next => { modeDraftRef.current = { ownerId, uid: user?.uid, provider, revision: connectionRevision, text: input }; setMode(next); }} working={working} canSend={canSend} onSubmit={submit} onStop={stop} menu={composerMenu} onMenu={setComposerMenu} aiSettings={<section className="bb-butler-connection-settings"><header><strong>Your AI connection</strong><button className="bb-butler-icon" aria-label="Close connection settings" onClick={() => setSettingsOpen(false)}><X size={16}/></button></header><label>Assistant<select aria-label="Butler AI provider" value={provider} disabled={working} onChange={e => setProvider(e.target.value)}>{LOCAL && workspace.isDemo && <option value="local">ChatGPT · local</option>}<option value="openai">Book and Buy / OpenAI</option><option value="chatgpt">ChatGPT account</option></select></label><label>Model<select aria-label="Butler model" value={model} disabled={working} onChange={e => { setModel(e.target.value); newChat(); }}><option value="">Choose a model</option>{model && !modelAvailable && <option value={model}>{model} ... unavailable</option>}{models.map(row => <option key={row.name} value={row.name}>{row.label || row.name}</option>)}</select></label>{models.find(row => row.name === model)?.efforts?.length > 0 && <label>Thinking level<select aria-label="Butler thinking level" value={effort} disabled={working} onChange={e => { setEffort(e.target.value); newChat(); }}>{models.find(row => row.name === model).efforts.map(row => <option key={row.reasoningEffort} value={row.reasoningEffort}>{label(row.reasoningEffort)}</option>)}</select></label>}<p>{provider === 'local' ? 'Uses your signed-in local ChatGPT connection.' : selectedConnection?.billing === 'byok' ? 'API usage is billed to your provider account.' : selectedConnection?.billing === 'included' ? 'Uses your included Book and Buy AI allowance.' : selectedConnection?.reason || 'Choose a connection to get started.'}</p><Button icon={Link2} onClick={() => setConnectionsOpen(true)}>Manage connections</Button></section>} onReports={() => { navigate(workspacePagePath('analytics')); setOpen(false); }}/><p className="bb-butler-assurance">{selectedConnection?.billing === 'chatgpt' ? <>Using ChatGPT plan · <a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Manage usage</a></> : <>I'll check with you before making changes.</>}</p>{runRef.current && provider !== 'local' && <button className="bb-butler-recover" disabled={working} onClick={recoverSaved}>Recover saved progress</button>}</div>
    </section></div>}
    {connectionsOpen && <AIConnectionsDialog workspaceId={ownerId} provider={provider === 'local' ? 'chatgpt' : provider} onClose={() => setConnectionsOpen(false)} onChanged={() => { const scope = capture(); refreshConnections(scope).catch(error => { if (isCurrent(scope)) setNote(error.message); }); }} />}
    {confirmations.modal}
  </>;
}
