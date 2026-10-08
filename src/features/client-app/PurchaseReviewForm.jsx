import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { firebaseCallables } from '../../shared/firebase/callables';
import { useAuth } from '../auth/AuthContext';

const errorCode = error => String(error?.code || '').replace(/^functions\//, '');
const ineligibleCodes = new Set(['permission-denied', 'failed-precondition', 'unauthenticated', 'not-found']);

export function PurchaseReviewForm({ slug, purchaseId, itemId, kind, demo = false }) {
  const { user, claims } = useAuth();
  const [eligible, setEligible] = useState(null);
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const generation = useRef(0);
  const payload = { slug, purchaseId, itemId, kind };

  const loadReview = async (openEditor = false) => {
    const ticket = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await firebaseCallables.getPurchaseReview(payload);
      if (ticket !== generation.current) return;
      setEligible(result); setQuote(result.review?.quote || ''); setRating(result.review?.rating || 5);
      setStale(false);
      if (openEditor) setOpen(true);
    } catch (failure) {
      if (ticket !== generation.current) return;
      if (ineligibleCodes.has(errorCode(failure))) { setEligible(null); setOpen(false); }
      else setError('Review options are temporarily unavailable. Please try again.');
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  };

  useEffect(() => {
    ++generation.current;
    setEligible(null); setOpen(false); setError(''); setBusy(false); setLoading(false); setStale(false);
    if (user && !demo && slug && itemId) loadReview();
    return () => { ++generation.current; };
  }, [slug, purchaseId, itemId, kind, user?.uid, claims.email_verified, demo]);

  const save = async event => {
    event.preventDefault();
    if (busy || loading || stale) return;
    const ticket = generation.current;
    setBusy(true); setError('');
    try {
      const result = await firebaseCallables.submitPurchaseReview({ ...payload, quote, rating, expectedRevision: eligible.review?.revision || 0 });
      if (ticket === generation.current) { setEligible(previous => ({ ...previous, review: result.review })); setOpen(false); }
    } catch (failure) {
      if (ticket === generation.current) {
        const changed = errorCode(failure) === 'aborted';
        setStale(changed);
        setError(changed ? 'Your review changed elsewhere. Reload the latest review before editing again.' : failure.message || 'Your review could not be saved.');
      }
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  };

  if (!eligible && !error) return null;
  return <div className="bb-purchase-review">
    {eligible && <Button variant="secondary" type="button" busy={loading} disabled={busy} onClick={() => open ? setOpen(false) : loadReview(true)}>{eligible.review ? 'Edit your review' : `Review ${eligible.itemName}`}</Button>}
    {error && <p role="alert">{error}</p>}
    {(!eligible && error || stale) && <Button variant="secondary" type="button" busy={loading} disabled={busy} onClick={() => loadReview(Boolean(eligible))}>{stale ? 'Reload latest review' : 'Retry'}</Button>}
    {open && eligible && <form onSubmit={save}>
      <p>Verified purchase · your first name appears with your review.</p>
      <label>Rating<select aria-label={`Rating for ${eligible.itemName}`} value={rating} disabled={busy || loading || stale} onChange={event => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}</select></label>
      <label>Your experience<textarea aria-label={`Review of ${eligible.itemName}`} value={quote} disabled={busy || loading || stale} onChange={event => setQuote(event.target.value)} minLength={3} maxLength={2000} required rows={3}/></label>
      <div><Button variant="secondary" type="button" disabled={busy || loading} onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" busy={busy} disabled={loading || stale} type="submit">Publish review</Button></div>
    </form>}
  </div>;
}
