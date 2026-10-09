import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { APP_LOGO_URL } from '../../../config/appConfig';
import { publicPagePath } from '../../../app/routing';

/** The card signature stays visible while its selected page scrolls. */
export function ProfileCardFooter({ workspace, onOpenPage }) {
  const slug = String(workspace?.slug || '').trim();
  const [copiedSlug, setCopiedSlug] = useState('');
  const [error, setError] = useState(null);
  const copied = Boolean(slug) && copiedSlug === slug;
  const message = error?.slug === slug ? error.message : '';

  const share = async () => {
    if (!slug) return;
    setError(null);
    setCopiedSlug('');
    try {
      // Only the public card address is shared, without preview routes or URL queries.
      const url = `${window.location.origin}${window.location.pathname || '/'}#${publicPagePath(encodeURIComponent(slug), 'home')}`;
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
    } catch {
      setError({ slug, message: 'Could not copy the card link. Please try again.' });
    }
  };

  return <footer className="bb-profile-card-signature">
    <span><img src={APP_LOGO_URL} alt="" /><span>Book &amp; Buy<small>Digital business card</small></span></span>
    <nav className="bb-profile-card-policies" aria-label="Client policies">{[['cancellation', 'Cancellation policy'], ['terms', 'Terms of service'], ['privacy', 'Privacy policy']].map(([id, label]) => <a key={id} href={`#${publicPagePath(slug, id)}`} onClick={event => { if (onOpenPage) { event.preventDefault(); onOpenPage(id); } }}>{label}</a>)}</nav>
    <div className="bb-profile-card-share"><button type="button" onClick={share} disabled={!slug} aria-live="polite">
      <Share2 size={15} strokeWidth={1.6} aria-hidden="true" />{copied ? 'Link copied' : 'Share card'}
    </button>
    {message && <p className="bb-profile-card-share-error" role="alert">{message}</p>}</div>
  </footer>;
}
