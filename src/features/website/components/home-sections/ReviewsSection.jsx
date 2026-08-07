import { useState } from 'react';
import { fetchGooglePlaceReviews } from '../../../../shared/firebase/integrations';
import { EditableText, EditSection } from '../editable';

function Stars({ rating = 5 }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  const empty = 5 - n;
  return (
    <span className="bb-public-stars" aria-label={`${n} out of 5`}>
      <span className="bb-public-stars-on" aria-hidden="true">
        {'★'.repeat(n)}
      </span>
      {empty > 0 ? (
        <span className="bb-public-stars-off" aria-hidden="true">
          {'★'.repeat(empty)}
        </span>
      ) : null}
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
  const [placesNote, setPlacesNote] = useState('');
  const [placesBusy, setPlacesBusy] = useState(false);

  const importPlaceReviews = async () => {
    if (placesBusy) return;
    setPlacesBusy(true);
    setPlacesNote('');
    try {
      const result = await fetchGooglePlaceReviews(website.googlePlaceId || '');
      if (result.ok && result.reviews?.length) {
        patchWebsite({
          reviews: [
            ...reviews,
            ...result.reviews.map((item, index) => ({
              id: item.id || `grev-${Date.now()}-${index}`,
              quote: item.quote || item.text || '',
              name: item.name || item.author || '',
              rating: item.rating || 5
            }))
          ].slice(0, 6)
        });
        setPlacesNote('Imported reviews from Google Places.');
      } else {
        setPlacesNote(result.reason || 'Could not import reviews yet.');
      }
    } catch (error) {
      setPlacesNote(error?.message || 'Could not import reviews.');
    } finally {
      setPlacesBusy(false);
    }
  };

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
          <header className="bb-public-reviews-head">
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              Reviews
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-reviews-title"
                editMode={editMode}
                value={website.reviewsTitle || 'What clients say'}
                placeholder="Reviews title"
                onChange={(value) => patchWebsite({ reviewsTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
          </header>

          <div className="bb-public-reviews">
            {reviews.map((review, index) => (
              <article
                key={review.id}
                className="bb-public-review"
                style={{ '--bb-review-i': index }}
              >
                <Stars rating={review.rating} />
                <EditableText
                  as="p"
                  className="bb-public-review-quote"
                  editMode={editMode}
                  multiline
                  value={review.quote || ''}
                  placeholder="Review quote"
                  onChange={(value) => patchReview(review.id, 'quote', value)}
                />
                <EditableText
                  as="p"
                  className="bb-public-review-name"
                  editMode={editMode}
                  value={review.name || ''}
                  placeholder="Client name"
                  onChange={(value) => patchReview(review.id, 'name', value)}
                />
              </article>
            ))}
          </div>

          {editMode ? (
            <div className="bb-public-reviews-actions">
              {reviews.length < 6 ? (
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
              ) : null}
              <button
                type="button"
                className="bb-ghost-btn"
                disabled={placesBusy || !website.googlePlaceId}
                onClick={importPlaceReviews}
              >
                {placesBusy ? 'Importing…' : 'Import Google reviews'}
              </button>
            </div>
          ) : null}
          {editMode && placesNote ? <p className="bb-muted m-0 text-xs">{placesNote}</p> : null}
        </div>
      </div>
    </EditSection>
  );
}
