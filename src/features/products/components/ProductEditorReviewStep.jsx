import { categoryLabel } from '../../../config/businessCategories';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active — visible on Buy' },
  { value: 'draft', label: 'Draft — owner only' },
  { value: 'archived', label: 'Archived — hidden' }
];

export function ProductEditorReviewStep({
  imageUrls,
  draft,
  priceLabel,
  hasVariants,
  setStatus
}) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Review</h3>
      <div className="bb-services-review">
        <div className="bb-services-review-media">
          {imageUrls[0] ? (
            <img src={imageUrls[0]} alt="" />
          ) : (
            <span>No photo</span>
          )}
        </div>
        <dl className="bb-services-review-list">
          <div>
            <dt>Name</dt>
            <dd>{String(draft.name || '').trim() || '—'}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{priceLabel || '—'}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{String(draft.category || '').trim() || 'None'}</dd>
          </div>
          <div>
            <dt>Explore</dt>
            <dd>
              {draft.exploreMainCategoryId && draft.exploreSubcategoryId
                ? `${categoryLabel(draft.exploreMainCategoryId)} · ${categoryLabel(draft.exploreSubcategoryId)}`
                : 'Not set'}
            </dd>
          </div>
          <div>
            <dt>Variants</dt>
            <dd>
              {hasVariants
                ? `${draft.variants?.length || 0} options`
                : 'Single item'}
            </dd>
          </div>
          <div>
            <dt>Photos</dt>
            <dd>{imageUrls.length || 0}</dd>
          </div>
          {String(draft.description || '').trim() ? (
            <div className="bb-services-review-desc">
              <dt>Description</dt>
              <dd>{draft.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <label className="bb-services-field">
        <span>Status</span>
        <select
          className="native-control-input bb-services-control"
          value={draft.status || 'active'}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
