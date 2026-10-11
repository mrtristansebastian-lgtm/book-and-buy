import { useId, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { quoteRevisionPayload } from '../../../utils/publicCommerceCheckout';
import { getServiceUnitPriceCents, serviceHasVariants } from '../../../utils/services';
import { isFirstComeService } from '../../../../functions/bookingModes';
import '../../enquiries/enquiries.css';

export function FirstComeBookingRequest({ service, variant, workspace, slug, live = false, preview = false }) {
  const context = useWorkspace();
  const id = useId();
  const [fields, setFields] = useState({ name: '', email: '', phone: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const retry = useRef(null);
  const inFlight = useRef(false);
  const demo = workspace.isDemo === true && context.workspace.isDemo === true;
  const disabled = preview || (!live && !demo) || !isFirstComeService(workspace, service) || service.active === false || service.available === false || (serviceHasVariants(service) && !variant);
  const change = key => event => setFields(prior => ({ ...prior, [key]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    if (disabled || inFlight.current || sent) return;
    inFlight.current = true;
    setBusy(true); setError('');
    const clientCountry = workspace.website?.buyerCountryCode || '';
    const input = { serviceId: service.id, variantId: variant?.id || '', bookingMode: 'first_come',
      serviceName: service.name, scheduleType: 'appointment', date: '', dateKey: '', time: '',
      clientName: fields.name.trim(), clientEmail: fields.email.trim().toLowerCase(), clientPhone: fields.phone.trim(), clientNote: fields.note.trim(), clientCountry,
      source: 'public', status: 'pending', paymentStatus: 'unpaid', paymentMethod: 'cash', partySize: 1 };
    const signature = JSON.stringify({ slug, input });
    try {
      if (retry.current?.signature !== signature) {
        const requestId = crypto.randomUUID();
        let revision = {};
        if (live && !demo) {
          const quote = await firebaseCallables.quotePublicCommerce({ slug, kind: 'service', serviceId: service.id, variantId: variant?.id || '', countryCode: clientCountry });
          if (quote.amountInCents !== getServiceUnitPriceCents(service, variant)) throw new Error('The price has changed. Refresh this page to review it before requesting.');
          revision = quoteRevisionPayload(quote);
        }
        retry.current = { signature, payload: { ...input, slug, requestId, ...revision } };
      }
      const result = demo
        ? await context.addBooking({ ...input, id: `bk-request-${retry.current.payload.requestId}` })
        : await firebaseCallables.createPublicBookingRequest(retry.current.payload);
      if (!result?.id) throw new Error('Your request could not be saved. Please try again.');
      setSent(true);
    } catch (failure) { setError(failure.message || 'Your request could not be sent. Please try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  if (sent) return <div className="bb-listing-enquiry bb-listing-enquiry-success" role="status"><h3>{demo ? 'Demo booking request saved' : 'Booking request received'}</h3><p>{demo ? 'Find it in demo Bookings under Awaiting time. Nothing was sent outside this demo.' : 'You’re in the request queue. The business will confirm your request and arrange a time with you.'}</p><p>No payment has been taken.</p></div>;
  return <form className="bb-listing-enquiry" onSubmit={submit}>
    <div className="bb-listing-enquiry-heading"><h3>Request a booking</h3><p>First come, first served. Send your details; the business will confirm and arrange a time. No time selection or payment needed now.</p></div>
    {demo && <p className="bb-enquiry-demo-note">Demo · requests stay on this device</p>}
    <fieldset disabled={busy || disabled}>
      <legend className="bb-control-sr-only">Your booking request</legend>
      <div className="bb-enquiry-form-grid">
        <label htmlFor={`${id}-name`}>Your name<input id={`${id}-name`} autoComplete="name" required maxLength={100} value={fields.name} onChange={change('name')} /></label>
        <label htmlFor={`${id}-email`}>Email address<input id={`${id}-email`} type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={change('email')} /></label>
        <label className="bb-enquiry-form-wide" htmlFor={`${id}-phone`}>Phone {workspace.features?.collectClientPhone ? '' : '(optional)'}<input id={`${id}-phone`} type="tel" autoComplete="tel" required={Boolean(workspace.features?.collectClientPhone)} maxLength={32} value={fields.phone} onChange={change('phone')} /></label>
        <label className="bb-enquiry-form-wide" htmlFor={`${id}-note`}>Anything we should know? (optional)<textarea id={`${id}-note`} rows={3} maxLength={1000} placeholder="Tell us what you need or when you’d prefer to come." value={fields.note} onChange={change('note')} /></label>
      </div>
    </fieldset>
    {serviceHasVariants(service) && !variant && <p role="status">Choose a service option above first.</p>}
    {error && <p className="bb-enquiry-error" role="alert">{error}</p>}
    <p className="bb-enquiry-privacy">Your details are shared with this business to handle your booking request. A request is pending until the business accepts it.</p>
    <Button type="submit" action="send" variant="primary" disabled={disabled} busy={busy} busyLabel="Sending…">{demo ? 'Save demo booking request' : 'Submit booking request'}</Button>
  </form>;
}
