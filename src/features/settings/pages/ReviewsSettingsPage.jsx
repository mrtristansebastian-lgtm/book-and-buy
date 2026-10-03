import { useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, RefreshCw, Star } from 'lucide-react';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { useWorkspace } from '../../workspace/WorkspaceContext';

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
  return <div className="bb-settings-content bb-settings-content--reviews">
    <div className="bb-review-overview"><div className="bb-settings-section-heading"><h2>Let your customers speak.</h2><p>Connect a trusted review source to your Home page. Original wording, real ratings, clear attribution.</p></div><span><Star size={16} /> Customer reviews</span></div>
    <div className="bb-review-provider-grid is-google-only">{providers.map((provider) => {
      const value = String(website[provider.field] || '').trim();
      const enabled = Boolean(website[provider.id + 'ReviewsEnabled']);
      const verified = value && website[provider.id + 'ReviewsVerifiedId'] === value;
      return <section className="bb-panel bb-review-provider" key={provider.id}>
        <header><div className="bb-review-logo-heading"><img src={'/review-logos/' + provider.id + '.svg'} alt={provider.name} />{provider.id === 'google' && <span>Reviews</span>}</div><span className={'bb-review-state ' + (verified ? 'is-checked' : '')}>{verified ? <CheckCircle2 size={14} /> : null}{isDemo ? 'Demo' : verified ? 'Checked' : 'Not connected'}</span></header>
        <p className="bb-domain-hint">{provider.detail}</p>
        <div className="bb-review-how"><h3>How to connect</h3><ol>{provider.steps.map((step) => <li key={step}>{step}</li>)}</ol><a className="bb-domain-link" href={provider.help} target="_blank" rel="noopener noreferrer">Official setup guide <ArrowUpRight size={15} /></a></div>
        <label className="bb-settings-field">{provider.label}<input className="native-control-input px-4" disabled={Boolean(busy)} value={website[provider.field] || ''} placeholder={provider.placeholder} maxLength={255} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(event) => { updateWebsite({ [provider.field]: event.target.value, [provider.id + 'ReviewsEnabled']: false, [provider.id + 'ReviewsVerifiedId']: '', [provider.id + 'ReviewsCheckedAt']: '' }); setPreview((old) => ({ ...old, [provider.id]: [] })); setMessages((old) => ({ ...old, [provider.id]: '' })); setErrors((old) => ({ ...old, [provider.id]: '' })); }} /></label>
        <button type="button" className="bb-primary-btn" disabled={Boolean(busy) || !value} onClick={() => check(provider)}><RefreshCw size={15} />{busy === provider.id ? 'Checking…' : isDemo ? 'Preview connection' : 'Check connection'}</button>
        <label className="bb-review-toggle"><input type="checkbox" checked={enabled} disabled={!verified || Boolean(busy)} onChange={(event) => updateWebsite({ googleReviewsEnabled: event.target.checked, ...(event.target.checked ? { sections: { ...(website.sections || {}), reviews: true } } : {}) })} /><span><strong>Show {provider.name} reviews on Home</strong><small>Publish your website to apply changes.</small></span></label>
        {messages[provider.id] && <p className="bb-review-success" role="status">{messages[provider.id]}</p>}
        {errors[provider.id] && <p className="bb-reschedule-error" role="alert">{errors[provider.id]}</p>}
        {website[provider.id + 'ReviewsCheckedAt'] && <p className="bb-domain-hint">Last checked {new Date(website[provider.id + 'ReviewsCheckedAt']).toLocaleString()}</p>}
        {preview[provider.id]?.length > 0 && <div className="bb-review-preview"><h3>{isDemo ? 'Sample preview' : 'Review preview'}</h3>{preview[provider.id].map((review, index) => <article key={review.id || index}><span aria-label={String(review.rating) + ' out of 5 stars'}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0))))}</span><p>{review.quote}</p><strong>{review.name}</strong>{safeLink(review.reviewUrl) && <a href={safeLink(review.reviewUrl)} target="_blank" rel="noopener noreferrer">View original <ArrowUpRight size={13} /></a>}</article>)}</div>}
      </section>;
    })}</div>
    <section className="bb-panel bb-review-privacy"><h2>Authentic reviews. No copying or editing.</h2><p>Connected reviews load from Google when visitors open your Home page. Review text is not saved into your workspace or edited in the page builder. Failed requests never show invented reviews.</p><p>Google requires Maps and author attribution. Manual testimonials remain separate.</p></section>
  </div>;
}
