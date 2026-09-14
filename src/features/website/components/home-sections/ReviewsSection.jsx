import { useId } from 'react';
import { EditableText, EditSection } from '../editable';

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

function Stars({ rating = 5 }) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const variants = Array.from({ length: 5 }, (_, index) => {
    const remainder = value - index;
    if (remainder >= 0.75) return 'full';
    if (remainder >= 0.25) return 'half';
    return 'empty';
  });
  const label = Number.isInteger(value) ? `${value} out of 5` : `${value.toFixed(1)} out of 5`;

  return (
    <span className="bb-public-stars" aria-label={label}>
      {variants.map((variant, index) => (
        <StarGlyph key={index} variant={variant} />
      ))}
    </span>
  );
}

export function ReviewsSection({
  website,
  reviews,
  editMode,
  hidden,
  patchReview,
  patchWebsite
}) {
  return (
    <EditSection
      editMode={editMode}
      title="Reviews"
      sectionId="reviews"
      hidden={hidden}
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
                    <Stars rating={review.rating} />
                  </div>
                  <EditableText
                    as="p"
                    className="bb-public-review-quote"
                    editMode={editMode}
                    multiline
                    value={review.quote || ''}
                    placeholder="Review quote"
                    onChange={(value) => patchReview(review.id, 'quote', value)}
                  />
                  <div className="bb-public-review-author">
                    <span className="bb-public-review-avatar" aria-hidden="true">
                      {initial}
                    </span>
                    <EditableText
                      as="p"
                      className="bb-public-review-name"
                      editMode={editMode}
                      value={name}
                      placeholder="Client name"
                      onChange={(value) => patchReview(review.id, 'name', value)}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {editMode && reviews.length < 6 ? (
            <div className="bb-public-reviews-actions">
              <button
                type="button"
                className="bb-ghost-btn"
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
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </EditSection>
  );
}
