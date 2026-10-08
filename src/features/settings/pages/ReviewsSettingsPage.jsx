import { Button } from '../../../shared/ui/Button';
import { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import './ai-settings.css';
import './reviews-settings.css';

const providers = [
  { id: 'google', name: 'Google', label: 'Google Place ID', field: 'googlePlaceId', placeholder: 'ChIJ…', help: 'https://developers.google.com/maps/documentation/places/web-service/place-id', steps: ['Find your business using Google’s Place ID finder.', 'Paste the Place ID and check the connection.', 'Enable your Home reviews section, then publish your website.'], detail: 'Show up to five reviews chosen by Google, with links to the original reviews. Google selects the reviews—not Book & Buy.' }
];
const safeLink = (value) => /^https:\/\/(?:www\.)?(?:google\.com|maps\.google\.com)\//i.test(value || '') ? value : null;

export function ReviewsSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const isDemo = Boolean(workspace.isDemo);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState({});
  const [messages, setMessages] = useState({});
  const [errors, setErrors] = useState({});
  const requestLock = useRef(false);
  async function check(provider) {
    if (requestLock.current) return;
    const value = String(website[provider.field] || '').trim();
    if (!value) { setErrors((old) => ({ ...old, [provider.id]: 'Add your ' + provider.label + ' first.' })); return; }
    requestLock.current = true; setBusy(provider.id);
    setErrors((old) => ({ ...old, [provider.id]: '' }));
    setMessages((old) => ({ ...old, [provider.id]: '' }));
    try {
      const result = isDemo ? { ok: true, reviews: (website.reviews || []).filter((review) => review.quote).slice(0, 5), placeName: workspace.name }
        : await firebaseCallables.getGooglePlaceReviews({ placeId: value });
      if (!result.ok) throw new Error('The provider could not verify this connection.');
      setPreview((old) => ({ ...old, [provider.id]: result.reviews || [] }));
      updateWebsite({ [provider.id + 'ReviewsVerifiedId']: value, [provider.id + 'ReviewsCheckedAt']: new Date().toISOString() });
      setMessages((old) => ({ ...old, [provider.id]: isDemo ? 'Demo preview only. No provider request was made.' : 'Connection checked · ' + (result.reviews || []).length + ' reviews available' }));
    } catch (error) { setErrors((old) => ({ ...old, [provider.id]: error.message || 'Connection failed. No reviews were changed.' })); }
    finally { requestLock.current = false; setBusy(''); }
  }
  return <div className="bb-ai-settings bb-reviews-settings">
    <div className="bb-review-provider-grid is-google-only">{providers.map((provider) => {
      const value = String(website[provider.field] || '').trim();
      const enabled = Boolean(website[provider.id + 'ReviewsEnabled']);
      const verified = value && website[provider.id + 'ReviewsVerifiedId'] === value;
      return <section className="bb-panel bb-ai-connect-card bb-review-connect-card" key={provider.id}>
        <div className="bb-ai-card-heading"><div className="bb-review-connect-identity"><img src={'/review-logos/' + provider.id + '.svg'} alt={provider.name} /></div><a href={provider.help} target="_blank" rel="noopener noreferrer" aria-label="Open Google review connection guide"><ArrowUpRight size={18}/></a></div>
        <p className="bb-ai-card-description">Let their experience speak.</p><p className="bb-ai-card-copy">Bring your Google reviews to your business Home. Real words from the people who know you.</p>
        <div className="bb-review-connect-form">
        <label className="bb-settings-field">{provider.label}<input className="native-control-input px-4" disabled={Boolean(busy)} value={website[provider.field] || ''} placeholder={provider.placeholder} maxLength={255} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { updateWebsite({ [provider.field]: event.target.value, [provider.id + 'ReviewsEnabled']: false, [provider.id + 'ReviewsVerifiedId']: '', [provider.id + 'ReviewsCheckedAt']: '' }); setPreview((old) => ({ ...old, [provider.id]: [] })); setMessages((old) => ({ ...old, [provider.id]: '' })); setErrors((old) => ({ ...old, [provider.id]: '' })); }} /></label>
        <Button action="connect" variant="primary" type="button" className="bb-review-connect-button" disabled={(Boolean(busy) && busy !== provider.id) || !value} busy={busy === provider.id} busyLabel="Checking…" onClick={() => check(provider)}>{isDemo ? 'Preview connection' : verified ? 'Refresh connection' : 'Connect Google reviews'}</Button></div>
        <details className="bb-review-connect-guide"><summary>Need a hand connecting?</summary><ol>{provider.steps.map(step => <li key={step}>{step}</li>)}</ol><a href={provider.help} target="_blank" rel="noopener noreferrer">Find your Google Place ID <ArrowUpRight size={14}/></a></details>
        <label className="bb-review-toggle"><input type="checkbox" checked={enabled} disabled={!verified || Boolean(busy)} onChange={(event) => updateWebsite({ googleReviewsEnabled: event.target.checked, ...(event.target.checked ? { sections: { ...(website.sections || {}), reviews: true } } : {}) })} /><span><strong>Show reviews on your Home page</strong><small>Publish your website to apply changes.</small></span></label>
        {messages[provider.id] && <p className="bb-review-success" role="status">{messages[provider.id]}</p>}
        {errors[provider.id] && <p className="bb-reschedule-error" role="alert">{errors[provider.id]}</p>}
        {website[provider.id + 'ReviewsCheckedAt'] && <p className="bb-domain-hint">Last checked {new Date(website[provider.id + 'ReviewsCheckedAt']).toLocaleString()}</p>}
        {preview[provider.id]?.length > 0 && <div className="bb-review-preview"><h3>{isDemo ? 'Sample preview' : 'Review preview'}</h3>{preview[provider.id].map((review, index) => <article key={review.id || index}><span aria-label={String(review.rating) + ' out of 5 stars'}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))))}</span><p>{review.quote}</p><strong>{review.name}</strong>{safeLink(review.reviewUrl) && <a href={safeLink(review.reviewUrl)} target="_blank" rel="noopener noreferrer">View original <ArrowUpRight size={13} /></a>}</article>)}</div>}
      </section>;
    })}</div>
    <section className="bb-panel bb-ai-connect-card bb-review-connect-card"><div className="bb-ai-card-heading"><div className="bb-ai-provider"><img src="/brand/book-and-buy-mark.png" alt=""/><div><h2>Book &amp; Buy reviews</h2></div></div></div><p className="bb-ai-card-description">From your customers, with love.</p><p className="bb-ai-card-copy">Let customers share their experience after a paid product purchase or completed, paid service. Every review is linked to a verified purchase on Book &amp; Buy.</p><label className="bb-review-toggle"><input type="checkbox" checked={Boolean(website.platformReviewsEnabled)} onChange={event => updateWebsite({ platformReviewsEnabled: event.target.checked, ...(event.target.checked ? { sections: { ...(website.sections || {}), reviews: true } } : {}) })}/><span><strong>Enable Book &amp; Buy reviews</strong><small>Customers review from their orders and bookings. Reviews appear on your Home page after publishing.</small></span></label><p className="bb-ai-availability">One review per purchased item. Customers can update their own words and rating. Disabling hides platform reviews and stops new submissions.</p></section>
  </div>;
}
