import { createDefaultHomeSectionOrder } from '../../../config/workspaceDefaults';
import { PublicBookingFlow } from '../../booking/components/PublicBookingFlow';
import { SocialFeed } from '../../social/components/SocialFeed';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import { PublicStorefront } from '../../storefront/components/PublicStorefront';
import { EditableText } from './editable';
import {
  AboutSection,
  HeroSection,
  MapSection,
  OfferSection,
  ReasonsSection,
  ReviewsSection,
  VenueSection
} from './home-sections';

function sectionOn(website, key) {
  return website.sections?.[key] !== false;
}

/** Fixed Home order — sectionOrder kept in data for compatibility only. */
function resolveSectionOrder() {
  return createDefaultHomeSectionOrder();
}

export function PublicHomeView({
  workspace,
  preview = false,
  editMode = false,
  onUpdateWebsite,
  onUpdateProfile
}) {
  const website = workspace.website || {};
  const reasons = website.reasons || [];
  const venueImages = website.venueImages || [];
  const reviews = website.reviews || [];

  const patchWebsite = (patch) => onUpdateWebsite?.(patch);

  const patchReason = (id, field, value) => {
    patchWebsite({
      reasons: reasons.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    });
  };
  const patchVenue = (id, field, value) => {
    patchWebsite({
      venueImages: venueImages.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };
  const patchReview = (id, field, value) => {
    patchWebsite({
      reviews: reviews.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    });
  };

  const sectionBlocks = {
    about: (
      <AboutSection
        key="about"
        website={website}
        editMode={editMode}
        hidden={!sectionOn(website, 'about')}
        patchWebsite={patchWebsite}
      />
    ),
    reasons: (
      <ReasonsSection
        key="reasons"
        website={website}
        reasons={reasons}
        editMode={editMode}
        hidden={!sectionOn(website, 'reasons')}
        patchReason={patchReason}
        patchWebsite={patchWebsite}
      />
    ),
    venue: (
      <VenueSection
        key="venue"
        website={website}
        venueImages={venueImages}
        editMode={editMode}
        hidden={!sectionOn(website, 'venue')}
        patchVenue={patchVenue}
        patchWebsite={patchWebsite}
      />
    ),
    map: (
      <MapSection
        key="map"
        website={website}
        editMode={editMode}
        preview={preview}
        hidden={!sectionOn(website, 'map')}
        patchWebsite={patchWebsite}
      />
    ),
    reviews: (
      <ReviewsSection
        key="reviews"
        website={website}
        reviews={reviews}
        editMode={editMode}
        hidden={!sectionOn(website, 'reviews')}
        patchReview={patchReview}
        patchWebsite={patchWebsite}
      />
    ),
    offer: (
      <OfferSection
        key="offer"
        workspace={workspace}
        website={website}
        editMode={editMode}
        preview={preview}
        hidden={!sectionOn(website, 'offer')}
        patchWebsite={patchWebsite}
      />
    )
  };

  return (
    <div className="bb-public-home-stack">
      <HeroSection
        workspace={workspace}
        website={website}
        editMode={editMode}
        preview={preview}
        onUpdateProfile={onUpdateProfile}
        patchWebsite={patchWebsite}
      />
      {resolveSectionOrder().map((id) => sectionBlocks[id])}
    </div>
  );
}

export function PublicBookView({
  workspace,
  itemId = '',
  preview = false,
  editMode = false,
  publicMode = false,
  onUpdateWebsite
}) {
  const website = workspace.website || {};
  const title = website.bookHeadline || 'Book';
  const subtext =
    website.bookSubtext ||
    `Choose a service and request a time with ${workspace.brandName || 'us'}.`;
  const faq = website.bookFaq || [];

  if (itemId) {
    const service =
      (workspace.services || []).find(
        (row) => row.id === itemId && row.active !== false
      ) || null;
    return (
      <PublicCatalogDetail
        kind="service"
        item={service}
        workspace={workspace}
        workspaceName={workspace.brandName}
        slug={workspace.slug}
        preview={preview || editMode}
        publicMode={publicMode}
      />
    );
  }

  return (
    <div className={`bb-public-book ${preview || editMode ? 'bb-public-preview-flow' : ''}`}>
      <div className="bb-public-page-intro bb-public-gutter">
        <div className="bb-public-measure grid gap-2">
          <EditableText
            as="h1"
            className="bb-public-catalog-title"
            editMode={editMode}
            value={title}
            placeholder="Book headline"
            onChange={(value) => onUpdateWebsite?.({ bookHeadline: value })}
          />
          <EditableText
            as="p"
            className="bb-public-lede"
            editMode={editMode}
            multiline
            value={subtext}
            placeholder="Book supporting line"
            onChange={(value) => onUpdateWebsite?.({ bookSubtext: value })}
          />
        </div>
      </div>

      <div className="bb-public-book-main bb-public-gutter">
        <PublicBookingFlow
          catalogWorkspace={workspace}
          workspaceName={workspace.brandName}
          hideTitle
          preview={preview || editMode}
          publicMode={publicMode}
        />
      </div>

      <section className="bb-public-book-faq bb-public-gutter">
        <div className="bb-public-measure bb-public-book-faq-shell">
          <header className="bb-public-book-faq-head">
            <p className="bb-public-section-eyebrow">
              <span className="bb-public-section-eyebrow-mark bb-public-native-fill" aria-hidden="true" />
              <EditableText
                as="span"
                className="bb-public-section-eyebrow-text"
                editMode={editMode}
                value={website.bookFaqEyebrow || 'FAQ'}
                placeholder="Eyebrow"
                onChange={(value) => onUpdateWebsite?.({ bookFaqEyebrow: value })}
              />
            </p>
            <div className="bb-public-section-heading">
              <EditableText
                as="h2"
                className="bb-public-book-faq-title"
                editMode={editMode}
                value={website.bookFaqTitle || 'What to expect'}
                placeholder="FAQ title"
                onChange={(value) => onUpdateWebsite?.({ bookFaqTitle: value })}
              />
              <span className="bb-public-section-accent bb-public-native-fill" aria-hidden="true" />
            </div>
          </header>

          <div className="bb-public-faq-list">
            {faq.map((item) =>
              editMode ? (
                <div key={item.id} className="bb-public-faq-item is-edit">
                  <div className="bb-public-faq-q">
                    <EditableText
                      as="span"
                      editMode
                      value={item.q || ''}
                      placeholder="Question"
                      onChange={(value) =>
                        onUpdateWebsite?.({
                          bookFaq: faq.map((row) =>
                            row.id === item.id ? { ...row, q: value } : row
                          )
                        })
                      }
                    />
                  </div>
                  <div className="bb-public-faq-a">
                    <EditableText
                      as="p"
                      editMode
                      multiline
                      value={item.a || ''}
                      placeholder="Answer"
                      onChange={(value) =>
                        onUpdateWebsite?.({
                          bookFaq: faq.map((row) =>
                            row.id === item.id ? { ...row, a: value } : row
                          )
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <details key={item.id} className="bb-public-faq-item">
                  <summary className="bb-public-faq-q">
                    <span>{item.q || 'Question'}</span>
                  </summary>
                  <div className="bb-public-faq-a">
                    <p>{item.a || ''}</p>
                  </div>
                </details>
              )
            )}
            {editMode && faq.length < 8 ? (
              <button
                type="button"
                className="bb-ghost-btn justify-self-start"
                onClick={() =>
                  onUpdateWebsite?.({
                    bookFaq: [...faq, { id: `f-${Date.now()}`, q: '', a: '' }]
                  })
                }
              >
                Add FAQ item
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PublicBuyView({
  workspace,
  itemId = '',
  preview = false,
  editMode = false,
  publicMode = false,
  onUpdateWebsite
}) {
  const website = workspace.website || {};
  const title = website.buyHeadline || 'Buy';
  const subtext =
    website.buySubtext ||
    `Kitchen goods and take-home sets from ${workspace.brandName || 'this business'}.`;

  const products = workspace.products || [];

  if (itemId) {
    const product =
      products.find((row) => row.id === itemId && row.active !== false) || null;
    return (
      <PublicCatalogDetail
        kind="product"
        item={product}
        workspace={workspace}
        workspaceName={workspace.brandName}
        slug={workspace.slug}
        preview={preview || editMode}
        publicMode={publicMode}
      />
    );
  }

  return (
    <div className={`bb-public-buy ${preview || editMode ? 'bb-public-preview-flow' : ''}`}>
      {editMode ? (
        <div className="bb-public-gutter pt-6">
          <div className="bb-public-measure grid gap-3 mb-2">
            <EditableText
              as="h1"
              className="bb-public-catalog-title"
              editMode
              value={title}
              placeholder="Buy headline"
              onChange={(value) => onUpdateWebsite?.({ buyHeadline: value })}
            />
            <EditableText
              as="p"
              className="bb-public-lede m-0"
              editMode
              multiline
              value={subtext}
              placeholder="Buy supporting line"
              onChange={(value) => onUpdateWebsite?.({ buySubtext: value })}
            />
            <label className="grid gap-1 text-xs font-semibold max-w-md">
              Featured product
              <select
                className="native-control-input px-3 py-2 text-sm"
                value={website.featuredProductId || ''}
                onChange={(event) =>
                  onUpdateWebsite?.({ featuredProductId: event.target.value })
                }
              >
                <option value="">None</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name || product.title || product.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
      <PublicStorefront
        catalogWorkspace={workspace}
        workspaceName={workspace.brandName}
        title={title}
        subtext={subtext}
        preview={preview || editMode}
        hideIntro={editMode}
        featuredProductId={website.featuredProductId}
        publicMode={publicMode}
      />
    </div>
  );
}

export function PublicSocialView(props) {
  return <SocialFeed {...props} />;
}
