import { useEffect, useState } from 'react';
import { Link2, Pause, Play, RefreshCw, Clock3, CheckCheck } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { Button } from '../../../shared/ui/Button';
import { navigate, workspacePagePath } from '../../../app/routing';
import { butlerCall } from '../../../shared/firebase/butler';
import './butler-settings.css';

export function ButlerSettingsPage() {
  const { workspace, updateProfile } = useWorkspace();
  const ownerId = workspace.ownerId || workspace.slug;
  const [state, setState] = useState({ automations: [], activity: [], runs: [] });
  const [dialog, setDialog] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const [productId, setProductId] = useState(''), [tag, setTag] = useState(''), [frequency, setFrequency] = useState('1440'), [maximum, setMaximum] = useState('1'), [showNew, setShowNew] = useState(false);
  const refresh = async () => { if (!workspace.isDemo) setState(await butlerCall('getButlerState', ownerId)); };
  useEffect(() => { refresh().catch(error => setNote(error.message)); }, [ownerId]);
  const run = async task => { if (busy) return; setBusy(true); setNote(''); try { await task(); await refresh(); } catch (error) { setNote(error.message); } finally { setBusy(false); } };
  const preference = patch => updateProfile({ butler: { ...workspace.butler, ...patch } });
  const saveRoutine = event => { event.preventDefault(); run(async () => {
    await butlerCall('saveButlerAutomation', ownerId, { expectedRevision: 0, policy: { name: `Add ${tag.trim()} to ${workspace.products.find(row => row.id === productId)?.name || 'product'}`, enabled: true, tool: 'catalog.preview', recordIds: [productId], allowedFields: ['tags'], mergeTags: true, args: { section: 'products', id: productId, operation: 'upsert', patch: { tags: [tag.trim()] } }, trigger: 'schedule', intervalMinutes: Number(frequency), maxRunsPerDay: Number(maximum), maxRecords: 1 } }); setShowNew(false); setNote('Your routine is enabled.');
  }); };
  return <div className="bb-butler-settings-page">
    <section className="bb-panel bb-butler-settings-section"><header><h2>Your assistant, your way.</h2><p>Choose how Butler helps you, and what it can take care of on its own.</p></header>
      <div className="bb-butler-preference-row"><div><strong>Start conversations in</strong><p>Normally, Butler answers questions and prepares requested actions for review. Plan thinks through the approach without making changes.</p></div><select aria-label="Default Butler conversation mode" value={workspace.butler?.defaultMode === 'plan' ? 'plan' : 'butler'} onChange={e => preference({ defaultMode: e.target.value })}><option value="butler">Normal</option><option value="plan">Plan</option></select></div>
      <div className="bb-butler-preference-row"><div><strong>Your preferred AI</strong><p>Manage your account in AI connections.</p></div><select aria-label="Default Butler AI provider" value={workspace.butler?.preferredProvider || (workspace.isDemo ? 'local' : 'openai')} onChange={e => preference({ preferredProvider: e.target.value })}>{import.meta.env.DEV && workspace.isDemo && <option value="local">ChatGPT · local</option>}<option value="openai">Book and Buy / OpenAI</option><option value="chatgpt">ChatGPT account</option></select></div>
      <div className="bb-butler-preference-row"><div><strong>Connections</strong><p>Choose included AI or your own supported account or API allowance.</p></div><Button icon={Link2} onClick={() => navigate(workspacePagePath('settings/ai'))}>Manage</Button></div>
      <div className="bb-butler-permission-note"><CheckCheck size={18} strokeWidth={1.5}/><p>You're always in the loop. Changes appear in the conversation for approval. Specific routines below can run within the limits you choose.</p></div>
    </section>
    <section className="bb-panel bb-butler-settings-section"><header className="bb-butler-settings-heading"><div><h2>Routines</h2><p>A little help on repeat, with clear boundaries.</p></div><Button action="create" disabled={workspace.isDemo || busy} onClick={() => setShowNew(!showNew)}>New routine</Button></header>
      {workspace.isDemo ? <p className="bb-butler-settings-empty">Routines require your hosted owner backend. You can still try Butler in the local demo.</p> : !state.automations.length && !showNew && <p className="bb-butler-settings-empty">No routines yet. Choose one task, the records it can affect, and how often it may run.</p>}
      {showNew && <form className="bb-butler-routine-form" onSubmit={saveRoutine}><h3>Keep a product tagged</h3><label>Product<select required value={productId} onChange={e => setProductId(e.target.value)}><option value="">Choose one product</option>{workspace.products.filter(row => row.status !== 'archived').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Tag to add<input required maxLength="80" value={tag} onChange={e => setTag(e.target.value)} /></label><label>Run every<select value={frequency} onChange={e => setFrequency(e.target.value)}><option value="60">Hour</option><option value="1440">Day</option><option value="10080">Week</option></select></label><label>Maximum runs per day<input type="number" min="1" max="96" required value={maximum} onChange={e => setMaximum(e.target.value)} /></label><p>This routine may only edit tags on the selected product. It cannot change prices, stock, payments or permissions.</p><div><Button busy={busy} variant="primary" type="submit">Enable routine</Button><Button disabled={busy} onClick={() => setShowNew(false)}>Cancel</Button></div></form>}
      {state.automations.map(policy => <div className="bb-butler-routine-row" key={policy.id}><Clock3 size={18}/><div><strong>{policy.name || 'Routine'}</strong><p>{policy.enabled ? 'Enabled' : 'Paused'} · every {policy.intervalMinutes >= 1440 ? `${Math.round(policy.intervalMinutes / 1440)} days` : `${policy.intervalMinutes} minutes`} · up to {policy.maxRunsPerDay} runs a day</p></div><Button icon={policy.enabled ? Pause : Play} disabled={busy} onClick={() => run(() => butlerCall('saveButlerAutomation', ownerId, { id: policy.id, expectedRevision: policy.revision, policy: { ...policy, enabled: !policy.enabled } }))}>{policy.enabled ? 'Pause' : 'Resume'}</Button></div>)}
    </section>
    <section className="bb-panel bb-butler-settings-section"><header className="bb-butler-settings-heading"><div><h2>Activity</h2><p>Completed actions and routine outcomes, all in one place.</p></div><Button icon={RefreshCw} busy={busy} onClick={() => run(refresh)}>Refresh</Button></header>
      {!state.activity.length && !state.runs?.length && <p className="bb-butler-settings-empty">Butler's completed actions will appear here.</p>}
      {[...state.activity, ...(state.runs || [])].sort((a, b) => b.at - a.at).map((item, index) => <div className="bb-butler-routine-row" key={item.id || index}><CheckCheck size={17}/><div><strong>{item.tool?.replaceAll('.', ' ') || 'Routine run'}</strong><p>{item.status} · {new Date(item.at).toLocaleString()}{item.error ? ` · ${item.error}` : ''}</p></div></div>)}
    </section>
    <details className="bb-butler-settings-capabilities"><summary>Available capabilities</summary><p>Catalog, bookings, schedules, availability, stock, orders, clients, inbox messages, website publishing, settings and reports use your business rules. Refunds, payouts, email/SMS reminders, tax, currency conversion and carrier labels are unavailable until their backends are connected.</p></details>
    {note && <p role="status" className="bb-butler-settings-note">{note}</p>}

  </div>;
}
