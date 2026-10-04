import { Button } from '../../../../shared/ui/Button';
import { useEffect, useId, useRef, useState } from 'react';
import { firebaseCallables } from '../../../../shared/firebase/callables';
import {
  EditableText,
  EditSection,
  EditableColor,
  readStyleToken,
  styleTokenColor,
  isSolidColorToken
} from '../editable';

const STAR_PATH =
  'M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.27l-5.8 3.1 1.11-6.47-4.7-4.58 6.49-.94L12 2.5z';

function StarGlyph({ variant }) {
  const clipId = useId().replace(/:/g, '');
  return (
    <svg
      className={`bb-public-star bb-public-star--${variant}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'half' ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <path className="bb-public-star-path bb-public-star-path--empty" d={STAR_PATH} />
          <path
            className="bb-public-star-path bb-public-star-path--filled"
            clipPath={`url(#${clipId})`}
            d={STAR_PATH}
          />
        </>
      ) : (
        <path
          className={`bb-public-star-path bb-public-star-path--${variant === 'full' ? 'filled' : 'empty'}`}
          d={STAR_PATH}
        />
      )}
    </svg>
  );
}

function Stars({
  rating = 5,
  editMode = false,
  website,
  patchWebsite,
  tokenId = 'reviews.stars'
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const token = readStyleToken(website, tokenId);
  const solid = styleTokenColor(token, '#e8b923');
  const isSolid = isSolidColorToken(token);
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const variants = Array.from({ length: 5 }, (_, index) => {
    const remainder = value - index;
    if (remainder >= 0.75) return 'full';
    if (remainder >= 0.25) return 'half';
    return 'empty';
  });
  const label = Number.isInteger(value) ? `${value} out of 5` : `${value.toFixed(1)} out of 5`;

  return (
    <>
      <span
        ref={ref}
        className={`bb-public-stars${editMode ? ' bb-editable-style-target' : ''}`}
        aria-label={label}
        data-star-solid={isSolid ? 'true' : undefined}
        style={isSolid ? { '--bb-star-fill': solid } : undefined}
        onClick={
          editMode
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(true);
              }
            : undefined
        }
      >
        {variants.map((variant, index) => (
          <StarGlyph key={index} variant={variant} />
        ))}
      </span>
      {editMode ? (
        <EditableColor
          open={open}
          anchorRef={ref}
          website={website}
          patchWebsite={patchWebsite}
          tokenId={tokenId}
          title="Star color"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ReviewsSection({
  website,
  reviews: storedReviews,
  workspaceSlug,
  isDemo = false,
  editMode,
  hidden,
  patchReview,
  patchWebsite
}) {
  const placeId = String(website.googlePlaceId || '').trim();
  const syncEnabled =
    website.googleReviewsEnabled == null ? Boolean(placeId) : Boolean(website.googleReviewsEnabled);
  const provider = syncEnabled ? 'google' : '';
  const [liveReviews, setLiveReviews] = useState([]);
  const [reviewError, setReviewError] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [attributions, setAttributions] = useState([]);
  useEffect(() => {
    let cancelled = false;
    setLiveReviews([]); setReviewError(''); setAttributions([]); setLoadingReviews(false);
    if (!provider || hidden || isDemo) return;
    setLoadingReviews(true);
    const request = editMode
      ? firebaseCallables.getGooglePlaceReviews({ placeId })
      : firebaseCallables.getPublicGoogleReviews({ slug: workspaceSlug });
    request.then((result) => { if (!cancelled) { setLiveReviews(result.reviews || []); setAttributions(result.attributions || []); } }).catch(() => { if (!cancelled) setReviewError('Reviews are temporarily unavailable. Please try again later.'); }).finally(() => { if (!cancelled) setLoadingReviews(false); });
    return () => { cancelled = true; };
  }, [provider, placeId, workspaceSlug, editMode, hidden, isDemo]);
  const reviews = provider && !isDemo ? liveReviews : (storedReviews || []).filter((review) => !String(review.id).startsWith('gplace-') && !String(review.id).startsWith('trustpilot-'));
  const reviewsFromSettings = Boolean(provider);
  const canCurate = !provider;
  const contentEditMode = editMode && canCurate;

  return (
    <EditSection
      editMode={editMode}
      title="Reviews"
      sectionId="reviews"
      hidden={hidden}
      coach={
        syncEnabled
          ? 'Reviews sync from Settings → Reviews. Edit title and colors here.'
          : 'Turn on Google reviews sync in Settings, or curate reviews here.'
      }
      className="bb-public-home-block bb-public-reviews-block"
    >
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide bb-public-reviews-shell">
          <header className="bb-public-profile-section-head">
            <EditableText
              as="h2"
              className="bb-public-profile-heading bb-public-reviews-title"
              editMode={editMode}
              value={website.reviewsTitle || 'Reviews'}
              placeholder="Reviews"
              website={website}
              patchWebsite={patchWebsite}
              colorTokenId="reviews.title"
              accentTokenId="reviews.titleUnderline"
              onChange={(value) => patchWebsite({ reviewsTitle: value })}
            />
            {editMode || String(website.reviewsBody || '').trim() ? (
              <EditableText
                as="p"
                className="bb-public-profile-section-body"
                editMode={editMode}
                multiline
                value={website.reviewsBody || ''}
                placeholder="Short reviews intro"
                website={website}
                patchWebsite={patchWebsite}
                colorTokenId="reviews.body"
                onChange={(value) => patchWebsite({ reviewsBody: value })}
              />
            ) : null}
          </header>

          <div className="bb-public-reviews">
            {reviews.map((review, index) => {
              const name = String(review.name || '').trim();
              const initial = (name || '?').charAt(0).toUpperCase();
              return (
                <article
                  key={review.id}
                  className="bb-public-review"
                  style={{ '--bb-review-i': index }}
                >
                  <div className="bb-public-review-top">
                    {provider && !isDemo && <span className="bb-review-source">Google Maps</span>}
                    <Stars
                      rating={review.rating}
                      editMode={editMode}
                      website={website}
                      patchWebsite={patchWebsite}
                    />
                  </div>
                  {provider && !isDemo && /^https:\/\/(?:www\.)?(?:google\.com|maps\.google\.com)\//i.test(review.reviewUrl || '') && <a className="bb-review-original" href={review.reviewUrl} target="_blank" rel="noopener noreferrer">View original review</a>}
                  {provider === 'google' && !isDemo && /^https:\/\/(?:www\.)?(?:google\.com|maps\.google\.com)\//i.test(review.authorUrl || '') && <a className="bb-review-original" href={review.authorUrl} target="_blank" rel="noopener noreferrer">Reviewer profile</a>}
                  <EditableText
                    as="p"
                    className="bb-public-review-quote"
                    editMode={contentEditMode}
                    multiline
                    value={review.quote || ''}
                    placeholder="Review quote"
                    website={website}
                    patchWebsite={patchWebsite}
                    colorTokenId={`reviews.item.${review.id}.quote`}
                    onChange={(value) => patchReview(review.id, 'quote', value)}
                  />
                  <div className="bb-public-review-author">
                    <span className="bb-public-review-avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <EditableText
                      as="p"
                      className="bb-public-review-name"
                      editMode={contentEditMode}
                      value={name}
                      placeholder="Client name"
                      website={website}
                      patchWebsite={patchWebsite}
                      colorTokenId={`reviews.item.${review.id}.name`}
                      onChange={(value) => patchReview(review.id, 'name', value)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
          {provider && !isDemo && <p className="bb-review-provider-attribution">Reviews from Google Maps. Original ratings and wording.</p>}
          {reviewError && <p className="bb-domain-hint" role="status">{reviewError}</p>}
          {provider && !isDemo && !reviewError && <p className="bb-domain-hint" role="status">{loadingReviews ? 'Loading customer reviews…' : reviews.length === 0 ? 'No reviews are available from this provider yet.' : ''}</p>}
          {provider === 'google' && !isDemo && attributions.map((entry, index) => <p className="bb-review-provider-attribution" key={index}>{entry.provider || entry.providerName || ''}{/^https:\/\//i.test(entry.providerUri || '') && <a href={entry.providerUri} target="_blank" rel="noopener noreferrer"> · Attribution source</a>}</p>)}

          {contentEditMode ? (
            <div className="bb-public-section-actions bb-public-reviews-actions">
              {reviews.length < 6 ? (
                <Button action="add" variant="primary"
                  type="button"
                  className="bb-public-section-action"
                  onClick={() =>
                    patchWebsite({
                      reviews: [
                        ...reviews,
                        { id: `rev-${Date.now()}`, quote: '', name: '', rating: 5 }
                      ]
                    })
                  }
                >
                  Add review
                </Button>
              ) : null}
              {reviews.length > 0 ? (
                <Button action="remove" variant="destructive"
                  type="button"
                  className="bb-public-section-action"
                  aria-label="Remove last review"
                  onClick={() =>
                    patchWebsite({
                      reviews: reviews.slice(0, -1)
                    })
                  }
                >
                  Remove review
                </Button>
              ) : null}
            </div>
          ) : null}

          {editMode && reviewsFromSettings ? (
            <p className="bb-public-reviews-sync-note">
              Connected through Settings → Reviews. Provider reviews are read-only.
            </p>
          ) : null}
        </div>
      </div>
    </EditSection>
  );
}
