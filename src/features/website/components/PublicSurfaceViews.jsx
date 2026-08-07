import { useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { createDefaultHomeSectionOrder } from '../../../config/workspaceDefaults';
import { fetchGooglePlaceReviews } from '../../../shared/firebase/integrations';
import { PublicBookingFlow } from '../../booking/components/PublicBookingFlow';
import { PublicStorefront } from '../../storefront/components/PublicStorefront';
import { EditableText, EditableImage, EditSection } from './editable';

const DEFAULT_HERO = '/example/flour-and-flame/hero.webp';

function go(preview, editMode, path) {
  if (preview || editMode) return;
  navigate(path);
}

function sectionOn(website, key) {
  return website.sections?.[key] !== false;
}

function resolveSectionOrder(website) {
  const defaults = createDefaultHomeSectionOrder();
  const custom = Array.isArray(website.sectionOrder) ? website.sectionOrder : [];
  const seen = new Set();
  const ordered = [];
  for (const id of [...custom, ...defaults]) {
    if (!defaults.includes(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

function Stars({ rating = 5 }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span className="bb-public-stars" aria-label={`${n} out of 5`}>
      {'★'.repeat(n)}
      <span className="opacity-25">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export function PublicHomeView({
  workspace,
  preview = false,
  editMode = false,
  onUpdateWebsite,
  onUpdateProfile
}) {
  const website = workspace.website || {};
  const brand = workspace.brandName || 'Business';
  const support =
    website.homeHeadline ||
    website.homeSubtext ||
    website.headline ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const heroSrc = website.heroImageUrl || website.heroImage || DEFAULT_HERO;
  const reasons = website.reasons || [];
  const venueImages = website.venueImages || [];
  const reviews = website.reviews || [];

  const [placesNote, setPlacesNote] = useState('');
  const [placesBusy, setPlacesBusy] = useState(false);

  const patchWebsite = (patch) => onUpdateWebsite?.(patch);
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
      <EditSection
        key="about"
        editMode={editMode}
        title="About"
        hidden={!sectionOn(website, 'about')}
        coach="Tell clients who you are."
        className="bb-public-home-block bb-public-gutter"
      >
        <div className="bb-public-measure bb-public-about">
          <div className="bb-public-about-copy grid gap-3">
            <EditableText
              as="h2"
              className="bb-page-title text-3xl md:text-4xl m-0"
              editMode={editMode}
              value={website.aboutTitle || 'About us'}
              placeholder="About title"
              onChange={(value) => patchWebsite({ aboutTitle: value })}
            />
            <EditableText
              as="p"
              className="bb-public-lede m-0"
              editMode={editMode}
              multiline
              value={website.aboutBody || ''}
              placeholder="About your business"
              onChange={(value) => patchWebsite({ aboutBody: value })}
            />
          </div>
          <EditableImage
            editMode={editMode}
            src={website.aboutImageUrl || ''}
            className="bb-public-about-media"
            imgClassName="w-full h-full object-cover"
            storageFolder="venue"
            onChange={(url) => patchWebsite({ aboutImageUrl: url })}
            placeholderLabel="About image URL"
          />
        </div>
      </EditSection>
    ),
    reasons: (
      <EditSection
        key="reasons"
        editMode={editMode}
        title="Why choose us"
        hidden={!sectionOn(website, 'reasons')}
        className="bb-public-home-block bb-public-gutter bb-public-home-block--soft"
      >
        <div className="bb-public-measure grid gap-6">
          <EditableText
            as="h2"
            className="bb-page-title text-3xl md:text-4xl m-0"
            editMode={editMode}
            value={website.reasonsTitle || 'Why choose us'}
            placeholder="Section title"
            onChange={(value) => patchWebsite({ reasonsTitle: value })}
          />
          <div className="bb-public-reasons">
            {reasons.map((reason) => (
              <article key={reason.id} className="bb-public-reason">
                <EditableText
                  as="h3"
                  className="bb-page-title text-xl m-0"
                  editMode={editMode}
                  value={reason.title || ''}
                  placeholder="Reason title"
                  onChange={(value) => patchReason(reason.id, 'title', value)}
                />
                <EditableText
                  as="p"
                  className="bb-public-reason-body m-0"
                  editMode={editMode}
                  multiline
                  value={reason.body || ''}
                  placeholder="Short reason"
                  onChange={(value) => patchReason(reason.id, 'body', value)}
                />
              </article>
            ))}
          </div>
        </div>
      </EditSection>
    ),
    venue: (
      <EditSection
        key="venue"
        editMode={editMode}
        title="Venue"
        hidden={!sectionOn(website, 'venue')}
        coach="Add 2–4 venue photos."
        className="bb-public-home-block bb-public-gutter"
      >
        <div className="bb-public-measure grid gap-5">
          <EditableText
            as="h2"
            className="bb-page-title text-3xl md:text-4xl m-0"
            editMode={editMode}
            value={website.venueTitle || 'Our space'}
            placeholder="Venue title"
            onChange={(value) => patchWebsite({ venueTitle: value })}
          />
          <div className="bb-public-venue-grid">
            {venueImages.length === 0 && editMode ? (
              <p className="bb-edit-section-coach m-0">Add a venue photo to show your space.</p>
            ) : null}
            {venueImages.map((image) => (
              <figure key={image.id} className="bb-public-venue-card">
                <EditableImage
                  editMode={editMode}
                  src={image.url || ''}
                  className="bb-public-venue-media"
                  imgClassName="w-full h-full object-cover"
                  storageFolder="venue"
                  onChange={(url) => patchVenue(image.id, 'url', url)}
                />
                <figcaption>
                  <EditableText
                    as="span"
                    editMode={editMode}
                    value={image.caption || ''}
                    placeholder="Caption"
                    onChange={(value) => patchVenue(image.id, 'caption', value)}
                  />
                </figcaption>
              </figure>
            ))}
          </div>
          {editMode && venueImages.length < 4 ? (
            <button
              type="button"
              className="bb-ghost-btn justify-self-start"
              onClick={() =>
                patchWebsite({
                  venueImages: [
                    ...venueImages,
                    { id: `v-${Date.now()}`, url: '', caption: '' }
                  ]
                })
              }
            >
              Add venue photo
            </button>
          ) : null}
        </div>
      </EditSection>
    ),
    map: (
      <EditSection
        key="map"
        editMode={editMode}
        title="Visit / Map"
        hidden={!sectionOn(website, 'map')}
        coach="Paste a Google Maps embed URL."
        className="bb-public-home-block bb-public-gutter bb-public-home-block--soft"
      >
        <div className="bb-public-measure bb-public-visit">
          <div className="grid gap-3 content-start">
            <h2 className="bb-page-title text-3xl m-0">Visit</h2>
            <EditableText
              as="p"
              className="bb-public-lede m-0"
              editMode={editMode}
              multiline
              value={website.address || ''}
              placeholder="Street address"
              onChange={(value) => patchWebsite({ address: value })}
            />
            {editMode ? (
              <div className="grid gap-3 max-w-xl">
                <label className="grid gap-1 text-xs font-semibold">
                  Map embed URL
                  <input
                    className="native-control-input px-3 py-2 text-sm"
                    value={website.mapEmbedUrl || ''}
                    placeholder="https://maps.google.com/maps?...&output=embed"
                    onChange={(event) => patchWebsite({ mapEmbedUrl: event.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  Google Place ID (optional)
                  <input
                    className="native-control-input px-3 py-2 text-sm"
                    value={website.googlePlaceId || ''}
                    placeholder="ChIJ…"
                    onChange={(event) => patchWebsite({ googlePlaceId: event.target.value })}
                  />
                </label>
              </div>
            ) : null}
            {website.mapLinkUrl || website.mapEmbedUrl ? (
              <a
                className="bb-ghost-btn justify-self-start"
                href={website.mapLinkUrl || website.mapEmbedUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (editMode || preview) event.preventDefault();
                }}
              >
                Open in Maps
              </a>
            ) : null}
          </div>
          <div className="bb-public-map-frame">
            {website.mapEmbedUrl ? (
              <iframe
                title="Map"
                src={website.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="bb-public-empty h-full grid place-items-center">
                {editMode ? 'Add a Google Maps embed URL' : 'Map coming soon'}
              </div>
            )}
          </div>
        </div>
      </EditSection>
    ),
    reviews: (
      <EditSection
        key="reviews"
        editMode={editMode}
        title="Reviews"
        hidden={!sectionOn(website, 'reviews')}
        className="bb-public-home-block bb-public-gutter"
      >
        <div className="bb-public-measure grid gap-6">
          <EditableText
            as="h2"
            className="bb-page-title text-3xl md:text-4xl m-0"
            editMode={editMode}
            value={website.reviewsTitle || 'What clients say'}
            placeholder="Reviews title"
            onChange={(value) => patchWebsite({ reviewsTitle: value })}
          />
          <div className="bb-public-reviews">
            {reviews.map((review) => (
              <article key={review.id} className="bb-public-review">
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
            <div className="flex flex-wrap gap-2">
              {reviews.length < 6 ? (
                <button
                  type="button"
                  className="bb-ghost-btn justify-self-start"
                  onClick={() =>
                    patchWebsite({
                      reviews: [
                        ...reviews,
                        {
                          id: `rev-${Date.now()}`,
                          quote: '',
                          name: '',
                          rating: 5
                        }
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
      </EditSection>
    ),
    bookStrip: (
      <EditSection
        key="bookStrip"
        editMode={editMode}
        title="Book strip"
        hidden={!sectionOn(website, 'bookStrip')}
        className="bb-public-home-block bb-public-gutter"
      >
        <div className="bb-public-measure bb-public-book-strip">
          <div className="grid gap-2">
            <EditableText
              as="h2"
              className="bb-page-title text-3xl m-0"
              editMode={editMode}
              value={website.bookStripTitle || 'Ready to book?'}
              placeholder="Strip title"
              onChange={(value) => patchWebsite({ bookStripTitle: value })}
            />
            <EditableText
              as="p"
              className="bb-public-lede m-0"
              editMode={editMode}
              multiline
              value={website.bookStripBody || ''}
              placeholder="Strip supporting line"
              onChange={(value) => patchWebsite({ bookStripBody: value })}
            />
          </div>
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'book'))}
          >
            <EditableText
              as="span"
              editMode={editMode}
              value={website.bookStripCta || 'See availability'}
              placeholder="CTA"
              onChange={(value) => patchWebsite({ bookStripCta: value })}
            />
          </button>
        </div>
      </EditSection>
    )
  };

  return (
    <div className="bb-public-home-stack">
      <EditSection editMode={editMode} title="Hero" className="bb-public-home relative">
        <div className="absolute inset-0 bb-public-home-atmosphere" aria-hidden="true" />
        <EditableImage
          editMode={editMode}
          src={heroSrc}
          className="absolute inset-0"
          imgClassName="absolute inset-0 w-full h-full object-cover"
          storageFolder="brand"
          onChange={(url) => patchWebsite({ heroImageUrl: url })}
          placeholderLabel="Add hero image URL"
        />
        <div className="absolute inset-0 bb-public-home-scrim" aria-hidden="true" />
        <div className="bb-public-home-copy bb-public-gutter">
          <EditableText
            as="h1"
            className="bb-public-home-brand"
            editMode={editMode}
            value={brand}
            placeholder="Business name"
            onChange={(value) => onUpdateProfile?.({ brandName: value })}
          />
          <EditableText
            as="p"
            className="bb-public-home-support"
            editMode={editMode}
            multiline
            value={support}
            placeholder="Short supporting line"
            onChange={(value) =>
              patchWebsite({ homeHeadline: value, headline: value, homeSubtext: value })
            }
          />
          <div className="bb-public-home-ctas">
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'book'))}
            >
              <EditableText
                as="span"
                editMode={editMode}
                value={website.ctaLabel || 'Book now'}
                placeholder="Book CTA"
                onChange={(value) => patchWebsite({ ctaLabel: value })}
              />
            </button>
            <button
              type="button"
              className="bb-ghost-btn bg-white/92"
              onClick={() => go(preview, editMode, publicPagePath(workspace.slug, 'buy'))}
            >
              <EditableText
                as="span"
                editMode={editMode}
                value={website.buyCtaLabel || 'Buy'}
                placeholder="Buy CTA"
                onChange={(value) => patchWebsite({ buyCtaLabel: value })}
              />
            </button>
          </div>
        </div>
      </EditSection>
      {resolveSectionOrder(website).map((id) => sectionBlocks[id])}
    </div>
  );
}

export function PublicBookView({
  workspace,
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

  return (
    <div className={`bb-public-book ${preview || editMode ? 'bb-public-preview-flow' : ''}`}>
      <div className="bb-public-page-intro bb-public-gutter">
        <div className="bb-public-measure grid gap-2">
          <EditableText
            as="h1"
            className="bb-page-title"
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
      <div className="bb-public-book-layout bb-public-gutter">
        <div className="bb-public-book-main">
          <PublicBookingFlow
            catalogWorkspace={workspace}
            workspaceName={workspace.brandName}
            hideTitle
            preview={preview || editMode}
            publicMode={publicMode}
          />
        </div>
        <aside className="bb-public-book-aside">
          <EditableText
            as="h2"
            className="bb-page-title text-xl m-0"
            editMode={editMode}
            value={website.bookFaqTitle || 'What to expect'}
            placeholder="FAQ title"
            onChange={(value) => onUpdateWebsite?.({ bookFaqTitle: value })}
          />
          <div className="grid gap-4 mt-4">
            {faq.map((item) => (
              <div key={item.id} className="grid gap-1">
                <EditableText
                  as="strong"
                  className="text-sm"
                  editMode={editMode}
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
                <EditableText
                  as="p"
                  className="bb-muted m-0 text-sm leading-relaxed"
                  editMode={editMode}
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
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PublicBuyView({
  workspace,
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

  return (
    <div className={`bb-public-buy ${preview || editMode ? 'bb-public-preview-flow' : ''}`}>
      {editMode ? (
        <div className="bb-public-gutter pt-6">
          <div className="bb-public-measure grid gap-3 mb-2">
            <EditableText
              as="h1"
              className="bb-page-title text-4xl m-0"
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

export function PublicSocialView({
  workspace,
  editMode = false,
  onUpdateWebsite,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const website = workspace.website || {};
  const posts = [...(workspace.socialPosts || [])]
    .filter((post) => (editMode && showDrafts ? true : post.published !== false))
    .sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0)
    );

  return (
    <section className="bb-public-social bb-public-gutter">
      <div className="bb-public-measure grid gap-8">
        <header className="bb-public-social-header grid gap-3">
          <EditableText
            as="h1"
            className="bb-page-title"
            editMode={editMode}
            value={website.socialHeadline || 'Social'}
            placeholder="Social headline"
            onChange={(value) => onUpdateWebsite?.({ socialHeadline: value })}
          />
          <EditableText
            as="p"
            className="bb-public-lede m-0"
            editMode={editMode}
            multiline
            value={website.socialSubtext || `Updates from ${workspace.brandName}.`}
            placeholder="Social supporting line"
            onChange={(value) => onUpdateWebsite?.({ socialSubtext: value })}
          />
        </header>

        {editMode ? (
          <button
            type="button"
            className="bb-primary-btn justify-self-start"
            onClick={() =>
              onAddSocialPost?.({
                type: 'text',
                title: 'New post',
                caption: 'Write your caption…',
                published: false
              })
            }
          >
            Add post
          </button>
        ) : null}

        <div className="bb-public-social-feed">
          {posts.length === 0 ? (
            <div className="bb-public-empty">No posts published yet.</div>
          ) : (
            posts.map((post) => {
              const isImage = post.type === 'image' || post.mediaUrl;
              return (
                <article
                  key={post.id}
                  className={`bb-public-social-card ${
                    isImage && post.mediaUrl
                      ? 'bb-public-social-card--image'
                      : 'bb-public-social-card--text'
                  }`}
                >
                  {editMode && post.published === false ? (
                    <div className="bb-edit-section-badge mx-4 mt-3">Draft</div>
                  ) : null}
                  {isImage ? (
                    <EditableImage
                      editMode={editMode}
                      src={post.mediaUrl || ''}
                      className="bb-public-social-media"
                      imgClassName="w-full h-full object-cover"
                      storageFolder="social"
                      onChange={(url) =>
                        onUpdateSocialPost?.(post.id, { mediaUrl: url, type: 'image' })
                      }
                    />
                  ) : null}
                  <div className="bb-public-social-body">
                    <EditableText
                      as="h2"
                      className="bb-page-title"
                      editMode={editMode}
                      value={post.title || ''}
                      placeholder="Title (optional)"
                      onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
                    />
                    <EditableText
                      as="p"
                      className="bb-public-social-caption"
                      editMode={editMode}
                      multiline
                      value={post.caption || ''}
                      placeholder="Caption"
                      onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
                    />
                    {editMode ? (
                      <button
                        type="button"
                        className="bb-ghost-btn justify-self-start py-1.5 px-3 text-xs"
                        onClick={() =>
                          onUpdateSocialPost?.(post.id, {
                            published: post.published === false
                          })
                        }
                      >
                        {post.published !== false ? 'Unpublish' : 'Publish'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
