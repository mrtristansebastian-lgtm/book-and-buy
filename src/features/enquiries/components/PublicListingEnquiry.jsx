import { useId, useRef, useState } from 'react';
import { CalendarDays, Check, MessageCircle } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { saveDemoEnquiry } from '../enquiryStore';
import '../enquiries.css';

export function PublicListingEnquiry({ product, slug, isDemo = false, onSubmitted }) {
  const prefix = useId();
  const [intent, setIntent] = useState('enquiry');
  const [fields, setFields] = useState({ customerName: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const retry = useRef(null);
  const unavailable = product?.active === false || ['draft', 'archived'].includes(product?.status) || product?.listingAvailability && product.listingAvailability !== 'available';
  const change = key => event => { setFields(prior => ({ ...prior, [key]: event.target.value })); setError(''); };
  const submit = async event => {
    event.preventDefault();
    if (busy || unavailable) return;
    const content = { slug, productId: product.id, intent, ...fields };
    const signature = JSON.stringify(content);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, requestId: crypto.randomUUID() };
    const payload = { ...content, requestId: retry.current.requestId };
    setBusy(true); setError('');
    try {
      const result = isDemo ? saveDemoEnquiry(payload, product) : await firebaseCallables.createPublicListingEnquiry(payload);
      if (!result?.ok || !result?.id) throw new Error('Your enquiry could not be saved. Please try again.');
      setSent(true);
      onSubmitted?.(result);
    } catch (failure) { setError(failure.message || 'Your enquiry could not be sent. Please try again.'); }
    finally { setBusy(false); }
  };
  if (sent) return <div className="bb-listing-enquiry bb-listing-enquiry-success" role="status"><span className="bb-enquiry-success-icon"><Check size={22} /></span><h3>{isDemo ? 'Demo enquiry saved' : 'Enquiry sent'}</h3><p>{isDemo ? 'Saved on this device. Find it in the demo Inbox; no business has been contacted.' : 'Your enquiry is in the business’s Inbox. They can use your contact details to reply.'}</p></div>;
  return <form className="bb-listing-enquiry" onSubmit={submit}>
    <div className="bb-listing-enquiry-heading"><h3>Interested in this listing?</h3><p>Ask a question or arrange a closer look.</p></div>
    {isDemo && <p className="bb-enquiry-demo-note">Demo · enquiries stay on this device</p>}
    <fieldset disabled={busy || unavailable}>
      <legend className="bb-control-sr-only">Enquiry type</legend>
      <div className="bb-enquiry-intent">{[{ id: 'enquiry', label: 'Ask a question', Icon: MessageCircle }, { id: 'viewing', label: 'Request a viewing', Icon: CalendarDays }].map(({ id, label, Icon }) => <label key={id} className={intent === id ? 'is-selected' : ''}><input type="radio" name={`${prefix}-intent`} value={id} checked={intent === id} onChange={() => setIntent(id)} /><Icon size={16} /><span>{label}</span></label>)}</div>
      <div className="bb-enquiry-form-grid">
        <label htmlFor={`${prefix}-name`}>Your name<input id={`${prefix}-name`} autoComplete="name" value={fields.customerName} onChange={change('customerName')} required minLength={2} maxLength={100} /></label>
        <label htmlFor={`${prefix}-email`}>Email address<input id={`${prefix}-email`} type="email" autoComplete="email" value={fields.email} onChange={change('email')} required maxLength={254} /></label>
        <label className="bb-enquiry-form-wide" htmlFor={`${prefix}-phone`}>Phone <span className="bb-enquiry-optional">Optional</span><input id={`${prefix}-phone`} type="tel" autoComplete="tel" value={fields.phone} onChange={change('phone')} maxLength={32} /></label>
        <label className="bb-enquiry-form-wide" htmlFor={`${prefix}-message`}>{intent === 'viewing' ? 'When would you like to visit?' : 'Your message'}<textarea id={`${prefix}-message`} rows={3} value={fields.message} onChange={change('message')} maxLength={3000} placeholder={intent === 'viewing' ? 'Let the business know a day and time that suits you.' : 'What would you like to know about this listing?'} /></label>
      </div>
    </fieldset>
    <p className="bb-enquiry-privacy">Your details are shared with this business to respond to your request. A viewing time is confirmed by the business.</p>
    {unavailable && <p role="status">This listing is currently unavailable for enquiries.</p>}
    {error && <p className="bb-enquiry-error" role="alert">{error}</p>}
    <Button type="submit" icon={intent === 'viewing' ? CalendarDays : MessageCircle} variant="primary" busy={busy} busyLabel="Sending…" disabled={Boolean(unavailable)}>{isDemo ? 'Save demo enquiry' : intent === 'viewing' ? 'Request viewing' : 'Send enquiry'}</Button>
  </form>;
}
