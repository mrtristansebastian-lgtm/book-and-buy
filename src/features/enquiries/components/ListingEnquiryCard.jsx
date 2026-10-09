import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CarFront, Check, ChevronDown, Mail, MessageCircle, Phone, Wrench } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { Button } from '../../../shared/ui/Button';
import { ENQUIRY_STATUSES, readDemoEnquiries, updateDemoEnquiry } from '../enquiryStore';
import '../enquiries.css';

export function ListingEnquiryCard({ thread }) {
  const { workspace } = useWorkspace();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({ status: 'new', ownerNotes: '' });
  const [saved, setSaved] = useState(false);
  const retry = useRef(null);
  const isDemo = workspace.isDemo === true;
  useEffect(() => {
    let current = true;
    setRecord(null); setLoading(true); setError(''); setSaved(false); setExpanded(false);
    const load = async () => {
      try {
        const result = isDemo ? { enquiry: readDemoEnquiries(workspace.slug).find(row => row.id === thread.enquiryId) } : await firebaseCallables.getOwnerListingEnquiry({ ownerId: workspace.ownerId, id: thread.enquiryId, threadId: thread.id });
        if (!result?.enquiry) throw new Error('Enquiry details could not be found.');
        if (current) { setRecord(result.enquiry); setDraft({ status: result.enquiry.status, ownerNotes: result.enquiry.ownerNotes || '' }); }
      } catch (failure) { if (current) setError(failure.message || 'Enquiry details could not be loaded.'); }
      finally { if (current) setLoading(false); }
    };
    load();
    return () => { current = false; };
  }, [thread.id, thread.enquiryId, workspace.ownerId, workspace.slug, isDemo, refresh]);
  const save = async event => {
    event.preventDefault();
    if (!record || busy) return;
    setBusy(true); setError(''); setSaved(false);
    const content = { ownerId: workspace.ownerId, id: record.id, ...draft, expectedRevision: record.revision || 0 };
    const signature = JSON.stringify(content);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, requestId: crypto.randomUUID() };
    try {
      const result = isDemo ? updateDemoEnquiry(workspace.slug, record.id, content) : await firebaseCallables.updateOwnerListingEnquiry({ ...content, requestId: retry.current.requestId });
      if (!result?.ok || !result.enquiry) throw new Error('Your follow-up could not be saved.');
      setRecord(result.enquiry); setDraft({ status: result.enquiry.status, ownerNotes: result.enquiry.ownerNotes || '' }); setSaved(true);
    } catch (failure) { setError(failure.message || 'Your follow-up could not be saved.'); }
    finally { setBusy(false); }
  };
  if (loading) return <section className="bb-inbox-enquiry" aria-busy="true"><p className="bb-enquiry-muted">Loading listing enquiry…</p></section>;
  if (!record) return <section className="bb-inbox-enquiry"><p className="bb-enquiry-error" role="alert">{error}</p><Button action="refresh" onClick={() => setRefresh(value => value + 1)}>Retry</Button></section>;
  const Icon = record.listingType === 'vehicle' ? CarFront : Wrench;
  const action = record.intent === 'viewing' ? 'Viewing request' : 'Listing enquiry';
  const intentIcon = record.intent === 'viewing' ? <CalendarDays size={14} /> : <MessageCircle size={14} />;
  const price = record.askingPrice && Number.isFinite(Number(record.askingPrice)) ? `${record.currency} ${Number(record.askingPrice).toLocaleString('en-ZA')}` : 'Price on enquiry';
  return <section className="bb-inbox-enquiry" aria-label="Listing enquiry details">
    <div className="bb-inbox-enquiry-summary"><span className="bb-inbox-enquiry-icon"><Icon size={22} /></span><div className="bb-inbox-enquiry-copy"><span className="bb-inbox-enquiry-eyebrow">{intentIcon}{action}</span><a href={`#/w/${encodeURIComponent(record.slug)}/buy/${encodeURIComponent(record.productId)}`}>{record.productName}</a><span className="bb-enquiry-muted">Asking price · {price}</span></div><span className={`bb-enquiry-status is-${record.status}`}>{ENQUIRY_STATUSES.find(status => status.id === record.status)?.label || 'New'}</span></div>
    <div className="bb-inbox-enquiry-contacts"><a href={`mailto:${encodeURIComponent(record.email)}`}><Mail size={15} /><span>{record.email}</span></a>{record.phone && <a href={`tel:${record.phone.replace(/[^+\d]/g, '')}`}><Phone size={15} /><span>{record.phone}</span></a>}</div>
    <p className="bb-inbox-enquiry-note">{isDemo ? 'Demo conversation · replies stay on this device.' : 'Reply by email or phone, or in this chat when the customer signs in. Email and SMS are not sent automatically.'}</p>
    <button type="button" className="bb-inbox-enquiry-expand" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Follow-up & private notes<ChevronDown size={16} className={expanded ? 'is-open' : ''} /></button>
    {expanded && <form className="bb-inbox-enquiry-followup" onSubmit={save}>
      <fieldset disabled={busy}><legend className="bb-control-sr-only">Manage enquiry</legend><label>Status<select value={draft.status} onChange={event => { setDraft(value => ({ ...value, status: event.target.value })); setSaved(false); }}>{ENQUIRY_STATUSES.map(status => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label><label>Private notes<textarea rows={3} maxLength={5000} placeholder="Record your next step, viewing details or outcome…" value={draft.ownerNotes} onChange={event => { setDraft(value => ({ ...value, ownerNotes: event.target.value })); setSaved(false); }} /></label></fieldset>
      <div className="bb-inbox-enquiry-save"><Button type="submit" action="save" busy={busy} busyLabel="Saving…">Save follow-up</Button>{saved && <span role="status"><Check size={14} />Saved</span>}<button type="button" className="bb-enquiry-refresh" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
    </form>}
    {error && <p className="bb-enquiry-error" role="alert">{error}</p>}
  </section>;
}
