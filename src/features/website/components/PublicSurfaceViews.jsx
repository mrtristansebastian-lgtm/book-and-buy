import { useEffect, useState } from 'react';
import { createDefaultHomeSectionOrder } from '../../../config/workspaceDefaults';
import { PublicBookingFlow } from '../../booking/components/PublicBookingFlow';
import { SocialFeed } from '../../social/components/SocialFeed';
import { PublicCatalogDetail } from '../../storefront/components/PublicCatalogDetail';
import { PublicStorefront } from '../../storefront/components/PublicStorefront';
import { PublicPageIntro } from '../../public-surface/PublicPageIntro';
import {
  AboutSection,
  FaqSection,
  MapSection,
  ProfileIdentitySection,
  ReviewsSection,
  VenueSection
} from './home-sections';

const PROFILE_RAIL_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'content', label: 'Content' },
  { id: 'book', label: 'Book' },
  { id: 'buy', label: 'Buy' }
];

function sectionOn(website, key) {
  if (key === 'gallery') {
    if (website.sections?.gallery === false) return false;
    if (website.sections?.venue === false && website.sections?.gallery == null) {
      return false;
    }
    return true;
  }
  return website.sections?.[key] !== false;
}

/** Fixed Home order — sectionOrder kept in data for compatibility only. */
function resolveSectionOrder() {
  return createDefaultHomeSectionOrder();
}

function pageEnabled(website, pageId) {
  if (pageId === 'home') return true;
  if (pageId === 'content') return website.pages?.social !== false;
  if (pageId === 'book') return website.pages?.book !== false;
  if (pageId === 'buy') return website.pages?.buy !== false;
  return true;
}

export function PublicHomeView({
  workspace,
  preview = false,
  editMode = false,
  publicMode = false,
  onUpdateWebsite,
  onUpdateProfile,
  onUpdateSocialPost,
  onAddSocialPost,
  showDrafts = false
}) {
  const website = workspace.website || {};
  const venueImages = website.venueImages || [];
  const reviews = website.reviews || [];
  const products = workspace.products || [];

  const patchWebsite = (patch) => onUpdateWebsite?.(patch);

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

  const order = resolveSectionOrder().filter((id) => sectionOn(website, id) || editMode);
  const tabs = PROFILE_RAIL_TABS.filter(
    (tab) => pageEnabled(website, tab.id) || editMode
  );
  const tabKey = tabs.map((tab) => tab.id).join('|');
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'home');

  useEffect(() => {
    if (!tabKey) return;
    const ids = tabKey.split('|');
    if (!ids.includes(activeTab)) {
      setActiveTab(ids[0]);
    }
  }, [activeTab, tabKey]);

  const homeSections = (
    <div className="bb-public-profile-home-stack">
      {order.map((id) => {
        if (id === 'about') {
          return (
            <AboutSection
              key="about"
              website={website}
              editMode={editMode}
              hidden={!sectionOn(website, 'about')}
              patchWebsite={patchWebsite}
            />
          );
        }
        if (id === 'gallery') {
          return (
            <VenueSection
              key="gallery"
              website={website}
              venueImages={venueImages}
              editMode={editMode}
              hidden={!sectionOn(website, 'gallery')}
              patchVenue={patchVenue}
              patchWebsite={patchWebsite}
            />
          );
        }
        if (id === 'reviews') {
          return (
            <ReviewsSection
              key="reviews"
              website={website}
              reviews={reviews}
              editMode={editMode}
              hidden={!sectionOn(website, 'reviews')}
              patchReview={patchReview}
              patchWebsite={patchWebsite}
            />
          );
        }
        if (id === 'map') {
          return (
            <MapSection
              key="map"
              website={website}
              editMode={editMode}
              preview={preview}
              hidden={!sectionOn(website, 'map')}
              patchWebsite={patchWebsite}
            />
          );
        }
        if (id === 'faq') {
          return (
            <FaqSection
              key="faq"
              website={website}
              editMode={editMode}
              hidden={!sectionOn(website, 'faq')}
              patchWebsite={patchWebsite}
            />
          );
        }
        return null;
      })}
    </div>
  );

  let panel = (
    <div className="bb-public-profile-panel" role="tabpanel">
      {homeSections}
    </div>
  );

  if (activeTab === 'content') {
    panel = (
      <div className="bb-public-profile-panel" role="tabpanel">
        <SocialFeed
          workspace={workspace}
          preview={preview}
          editMode={editMode}
          embedded
          showDrafts={showDrafts}
          onUpdateWebsite={onUpdateWebsite}
          onUpdateSocialPost={onUpdateSocialPost}
          onAddSocialPost={onAddSocialPost}
        />
      </div>
    );
  } else if (activeTab === 'book') {
    panel = (
      <div className="bb-public-profile-panel bb-public-profile-panel--book" role="tabpanel">
        <PublicBookingFlow
          catalogWorkspace={workspace}
          workspaceName={workspace.brandName}
          hideTitle
          preview={preview || editMode}
          publicMode={publicMode}
        />
      </div>
    );
  } else if (activeTab === 'buy') {
    panel = (
      <div className="bb-public-profile-panel bb-public-profile-panel--buy" role="tabpanel">
        {editMode ? (
          <label className="bb-public-profile-featured grid gap-1 text-xs font-semibold">
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
        ) : null}
        <PublicStorefront
          catalogWorkspace={workspace}
          workspaceName={workspace.brandName}
          preview={preview || editMode}
          featuredProductId={website.featuredProductId}
          publicMode={publicMode}
        />
      </div>
    );
  }

  return (
    <div className="bb-public-home-stack bb-public-profile">
      <div className="bb-public-profile-rail">
        <ProfileIdentitySection
          workspace={workspace}
          website={website}
          editMode={editMode}
          preview={preview}
          patchWebsite={patchWebsite}
          onUpdateProfile={onUpdateProfile}
        />

        {tabs.length ? (
          <nav className="bb-public-profile-tabs" role="tablist" aria-label="Profile">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`bb-public-profile-tab${active ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        ) : null}

        <div className="bb-public-profile-modules">{panel}</div>
      </div>
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
      <div className="bb-public-book-main bb-public-gutter">
        <div className="bb-public-measure-wide grid gap-6">
          <PublicPageIntro
            title={website.bookHeadline || 'Book'}
            body={website.bookSubtext || ''}
            editMode={editMode}
            titlePlaceholder="Book title"
            bodyPlaceholder="Book supporting text"
            onTitleChange={(value) => onUpdateWebsite?.({ bookHeadline: value })}
            onBodyChange={(value) => onUpdateWebsite?.({ bookSubtext: value })}
          />
          <PublicBookingFlow
            catalogWorkspace={workspace}
            workspaceName={workspace.brandName}
            hideTitle
            preview={preview || editMode}
            publicMode={publicMode}
          />
        </div>
      </div>
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
      <div className="bb-public-gutter">
        <div className="bb-public-measure-wide grid gap-6">
          <PublicPageIntro
            title={website.buyHeadline || 'Buy'}
            body={website.buySubtext || ''}
            editMode={editMode}
            titlePlaceholder="Buy title"
            bodyPlaceholder="Buy supporting text"
            onTitleChange={(value) => onUpdateWebsite?.({ buyHeadline: value })}
            onBodyChange={(value) => onUpdateWebsite?.({ buySubtext: value })}
          />
          {editMode ? (
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
          ) : null}
        </div>
      </div>
      <PublicStorefront
        catalogWorkspace={workspace}
        workspaceName={workspace.brandName}
        preview={preview || editMode}
        featuredProductId={website.featuredProductId}
        publicMode={publicMode}
      />
    </div>
  );
}

export function PublicSocialView(props) {
  return <SocialFeed {...props} />;
}
