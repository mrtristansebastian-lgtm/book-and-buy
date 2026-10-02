import { useEffect, useState } from 'react';
import { PanelTop, ShieldCheck, Copy, ArrowUpRight, Check } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { publicPagePath } from '../../../app/routing';
import { firebaseCallables } from '../../../shared/firebase/callables';

const registrars = [
  { id: 'godaddy', name: 'GoDaddy', url: 'https://dcc.godaddy.com/', help: 'https://www.godaddy.com/help/add-a-cname-record-19236', steps: ['Open your Domain Portfolio and select your domain.', 'Choose DNS, then Add New Record. Select the record type supplied below.', 'Enter the Name and Value exactly as supplied. Save the record.'] },
  { id: 'namecheap', name: 'Namecheap', url: 'https://ap.www.namecheap.com/domains/list/', help: 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/', steps: ['Open Domain List and select Manage beside your domain.', 'Open Advanced DNS → Host Records → Add New Record.', 'Enter the Type, Host and Value supplied below. Use Automatic TTL and save.'] }
];
const statuses = { awaiting_verification: 'Verify ownership', provisioning: 'DNS & HTTPS setup', connected: 'Connected securely' };

export function DomainsSettingsPage() {
  const { workspace, updateProfile } = useWorkspace();
  const [domain, setDomain] = useState('');
  const [connection, setConnection] = useState(null);
  const [registrar, setRegistrar] = useState('godaddy');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const isDemo = Boolean(workspace.isDemo);
  const guide = registrars.find((entry) => entry.id === registrar);
  useEffect(() => {
    let cancelled = false;
    if (!isDemo) firebaseCallables.manageBusinessDomain({ action: 'load' }).then((result) => { if (!cancelled) setConnection(result.connection); }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [isDemo, workspace.ownerId]);
  async function copy(value, key) {
    try { await navigator.clipboard.writeText(value); setCopied(key); } catch { setError('Clipboard access is unavailable. Select and copy the record manually.'); }
  }
  async function act(action) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (isDemo) {
        if (action !== 'prepare') throw new Error('Design preview only. No DNS checks or real domain connection are made in demo mode.');
        const input = domain.trim().toLowerCase();
        if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(input)) throw new Error('Enter a domain name without https:// or a path.');
        setConnection({ domain: input, status: 'awaiting_verification', verificationHost: `_bookandbuy.${input}`, verificationValue: 'bookandbuy-verification=DEMO-DO-NOT-ADD', records: [] });
      } else setConnection((await firebaseCallables.manageBusinessDomain({ action, domain })).connection);
    } catch (failure) { setError(failure.message || 'Setup could not complete. Please try again.'); }
    finally { setBusy(false); }
  }
  const records = connection ? [{ type: 'TXT', host: connection.verificationHost, value: connection.verificationValue, action: 'KEEP' }, ...(connection.records || [])] : [];
  return <div className="bb-settings-content bb-settings-content--domains">
    <section className="bb-panel bb-domain-address">
      <div className="bb-domain-icon"><PanelTop size={22} /></div>
      <div className="bb-settings-section-heading"><h2>Your Book & Buy address</h2><p>Your included business address stays available while you connect a domain.</p></div>
      <label className="bb-settings-field">Business address<input className="native-control-input px-4" value={workspace.slug || ''} maxLength={63} onChange={(event) => updateProfile({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></label>
      <a href={`#${publicPagePath(workspace.slug || 'your-business')}`} className="bb-domain-link">Open business page <ArrowUpRight size={16} /></a>
    </section>
    <section className="bb-panel bb-domain-connect"><header className="bb-domain-head"><div className="bb-settings-section-heading"><h2>A domain of your own.</h2><p>Keep your domain with your provider. Connect it to your Book & Buy storefront, with secure HTTPS.</p></div><span className="bb-domain-status"><ShieldCheck size={15} />{isDemo ? 'Design preview' : statuses[connection?.status] || 'Not connected'}</span></header><ol className="bb-domain-progress" aria-label="Connection progress">{['Choose domain', 'Verify ownership', 'Connect & secure'].map((step, index) => <li key={step} className={index === 0 || (connection && index === 1) || connection?.status === 'connected' ? 'is-current' : ''}><span>{index + 1}</span>{step}</li>)}</ol>
{!connection ? <form className="bb-domain-form" onSubmit={(event) => { event.preventDefault(); act('prepare'); }}><label className="bb-settings-field">Domain name<input className="native-control-input px-4" placeholder="shop.yourbusiness.com" value={domain} onChange={(event) => setDomain(event.target.value)} maxLength={253} autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></label><button className="bb-primary-btn" disabled={busy}>{busy ? 'Preparing…' : isDemo ? 'Preview setup' : 'Start connection'}</button></form> : <div className="bb-domain-selected"><PanelTop size={20} /><strong>{connection.domain}</strong><span>{statuses[connection.status]}</span></div>}
      {isDemo && <p className="bb-domain-hint">Preview only. Do not add demo records to your DNS. No real domain is changed.</p>}{error && <p role="alert" className="bb-reschedule-error">{error}</p>}
    </section>
    <section className="bb-domain-guides"><div className="bb-settings-section-heading"><h2>Connect with your domain provider</h2><p>Choose your provider for step-by-step instructions. No passwords or registrar API keys needed.</p></div><div className="bb-domain-providers">{registrars.map((entry) => <button key={entry.id} type="button" className={registrar === entry.id ? 'is-selected' : ''} aria-pressed={registrar === entry.id} onClick={() => setRegistrar(entry.id)}><img src={`/domain-logos/${entry.id}.svg`} alt={entry.name} /><span>{registrar === entry.id ? <Check size={18} /> : <ArrowUpRight size={18} />}</span></button>)}</div><div className="bb-panel bb-domain-guide"><header><h3>Set up DNS in {guide.name}</h3><a href={guide.url} target="_blank" rel="noopener noreferrer" className="bb-ghost-btn">Open {guide.name} <ArrowUpRight size={15} /></a></header><ol>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="bb-domain-hint">If your nameservers point elsewhere, edit records with that DNS provider instead. Keep email MX records untouched. Your root domain and www are separate addresses.</p><a href={guide.help} target="_blank" rel="noopener noreferrer" className="bb-domain-link">Official DNS guide <ArrowUpRight size={15} /></a></div></section>
    {connection && <section className="bb-panel bb-domain-records"><div className="bb-settings-section-heading"><h2>Your DNS records</h2><p>Add the ownership TXT first. After verification, the exact Hosting records appear here. Keep ownership records in place.</p></div><div className="bb-domain-record-list">{records.map((record, index) => <article key={`${record.type}-${record.host}-${index}`}><span className="bb-domain-record-type">{record.type}<small>{record.action}</small></span><div><small>Full record name</small><code>{record.host}</code><small>Value</small><code>{record.value}</code></div><button type="button" className="bb-ghost-btn" onClick={() => copy(record.value, String(index))} aria-label={`Copy ${record.type} record value`}>{copied === String(index) ? <Check size={16} /> : <Copy size={16} />}</button></article>)}</div><p className="bb-domain-hint">Providers may append your domain automatically. Use @ for the root or the relative host, such as _bookandbuy. Remove only conflicting records explicitly marked REMOVE—not email records.</p><button type="button" className="bb-primary-btn" disabled={busy} onClick={() => act('check')}>{busy ? 'Checking DNS…' : 'Check connection'}</button><p className="bb-domain-hint">Checks run only when requested. DNS and HTTPS provisioning can take up to 24 hours. Your included address remains available.</p></section>}
  </div>;
}
