import { categoryLabel } from '../../../config/businessCategories';
import { isEnquiryListing } from '../../../../functions/listingTypes.js';
import { SetupPicker } from '../../../shared/ui/SetupPicker';

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
          <div><dt>Subcategory</dt><dd>{categoryLabel(draft.exploreSubcategoryId) || 'Not set'}</dd></div>
          <div><dt>Customer action</dt><dd>{isEnquiryListing(draft) ? 'Enquiry or viewing request' : 'Online checkout'}</dd></div>
          <div>
            <dt>Name</dt>
            <dd>{String(draft.name || '').trim() || '—'}</dd>
          </div>
          <div>
            <dt>{isEnquiryListing(draft) ? 'Asking price' : 'Price'}</dt>
            <dd>{priceLabel || '—'}</dd>
          </div>
          <div>
            <dt>Store Category</dt>
            <dd>{String(draft.category || '').trim() || 'None'}</dd>
          </div>
          <div>
            <dt>Discovery Category</dt>
            <dd>
              {draft.exploreMainCategoryId && draft.exploreSubcategoryId
                ? `${categoryLabel(draft.exploreMainCategoryId)} · ${categoryLabel(draft.exploreSubcategoryId)}`
                : 'Not set'}
            </dd>
          </div>
          <div>
            <dt>{isEnquiryListing(draft) ? 'Availability' : 'Options'}</dt>
            <dd>
              {isEnquiryListing(draft) ? draft.listingAvailability || 'available' : hasVariants
                ? `${draft.variants?.length || 0} variants`
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

      <div className="bb-services-field">
        <span>Status</span>
        <SetupPicker label="Status" value={draft.status || 'active'} options={STATUS_OPTIONS} onChange={setStatus}/>
      </div>
    </section>
  );
}
