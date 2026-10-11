import { profileTabs, profileSectionTabs } from '../profileModel';
import { useEffect, useRef } from 'react';
import { BusinessProfileHeader } from './BusinessProfileHeader';
import { ProfileCardFooter } from './ProfileCardFooter';
import { ProfileFooter } from './ProfileFooter';
import { ProfileStoryNavigation } from './ProfileStoryNavigation';
import { EditableText } from './editable';
import { navigate, publicPagePath } from '../../../app/routing';
import { createDefaultHomeSectionOrder } from '../../../config/workspaceDefaults';
import { PublicBookingFlow } from '../../booking/components/PublicBookingFlow';
import { PublicStorefront } from '../../storefront/components/PublicStorefront';
import {
  AboutSection,
  FaqSection,
  MapSection,
  ReviewsSection,
  VenueSection,
  WhatWeOfferSection
} from './home-sections';

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

function normalizeRailTab(value) {
  const id = String(value || 'home').trim().toLowerCase();
  if (id === 'social' || id === 'content') return 'home';
  if (['book', 'buy', 'home', 'about', 'offers', 'gallery', 'reviews', 'map', 'faq', 'contact', 'cancellation', 'terms', 'privacy'].includes(id)) return id;
  return 'home';
}

export function PublicHomeView({
  workspace,
  railTab = 'home',
  preview = false,
  editMode = false,
  publicMode = false,
  marketPicker = null,
  onOpenItem,
  onOpenPage,
  onUpdateWebsite,
  onUpdateProfile
}) {
  const website = workspace.website || {};
  const venueImages = website.venueImages || [];
  const reviews = website.reviews || [];
  const reasons = website.reasons || [];
  const requestedTab = normalizeRailTab(railTab);

  const patchWebsite = (patch) => onUpdateWebsite?.(patch);

  const patchVenue = (id, field, value) => {
    patchWebsite({
      venueImages: venueImages.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };
  const patchReason = (id, field, value) => {
    patchWebsite({
      reasons: reasons.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    });
  };
  const patchReview = (id, field, value) => {
    patchWebsite({
      reviews: reviews.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    });
  };

  const order = resolveSectionOrder().filter((id) => sectionOn(website, id) || editMode);
  const tabs = [...profileTabs(workspace).map(tab => tab.id === 'home' ? { ...tab, label: 'Business card' } : tab), ...profileSectionTabs(workspace, { editing: editMode })];
  // The URL is the selected tab: deep links, browser Back and analytics agree.
  const policyLabels = { cancellation: 'Cancellation policy', terms: 'Terms of service', privacy: 'Privacy policy' };
  const visibleTab = policyLabels[requestedTab] || tabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'home';
  const informationPage = visibleTab !== 'home' && !['book', 'buy'].includes(visibleTab);
  const contentRef = useRef(null);
  const railRef = useRef(null);
  const previousTabRef = useRef(visibleTab);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (previousTabRef.current !== visibleTab && !editMode) {
      const target = contentRef.current || railRef.current;
      target?.focus({ preventScroll: true });
    }
    previousTabRef.current = visibleTab;
  }, [visibleTab, editMode]);
  const openRailTab = (id) => {
    if (onOpenPage) { onOpenPage(id); return; }
    navigate(publicPagePath(workspace.slug, id));
  };

  const homeSections = (
    <div className="bb-public-profile-home-stack">
      {marketPicker}
      {order.filter(id => id === (visibleTab === 'offers' ? 'offerIntro' : visibleTab)).map((id) => {
        if (id === 'offerIntro') {
          if (!editMode && !reasons.some((reason) => reason.title || reason.body) && !website.reasonsBody) return null;
          return (
            <WhatWeOfferSection
              key="offerIntro"
              website={website}
              reasons={reasons}
              editMode={editMode}
              hidden={!sectionOn(website, 'offerIntro')}
              patchWebsite={patchWebsite}
              patchReason={patchReason}
            />
          );
        }
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
              workspaceSlug={workspace.slug}
              isDemo={Boolean(workspace.isDemo)}
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
    <div id={`bb-profile-panel-${visibleTab}`} className="bb-public-profile-panel" role="region" aria-label={tabs.find(tab => tab.id === visibleTab)?.label}>
      {!policyLabels[visibleTab] && visibleTab !== 'contact' && homeSections}
      {policyLabels[visibleTab] && <section className="bb-profile-policy-page"><h2>{policyLabels[visibleTab]}</h2><p>{workspace.policies?.[visibleTab]?.trim() || 'This business has not added this policy yet. Please contact them for details.'}</p></section>}
      {visibleTab === 'contact' && <ProfileFooter asPage workspace={workspace} preview={preview} editMode={editMode} patchWebsite={patchWebsite} />}
    </div>
  );

  if (visibleTab === 'book') {
    panel = (
      <div id="bb-profile-panel-book" className="bb-public-profile-panel bb-public-profile-panel--book" role="region" aria-label="Book">
        <header className="bb-profile-page-intro"><h2>Book</h2><EditableText as="p" editMode={editMode} multiline value={String(website.bookSubtext || '').trim() || 'Choose a service and request a time.'} onChange={value => patchWebsite({ bookSubtext: value })} /></header>
        {marketPicker}
        <PublicBookingFlow
          catalogWorkspace={workspace}
          workspaceName={workspace.brandName}
          hideTitle
          preview={preview}
          publicMode={publicMode}
          onOpenItem={onOpenItem}
        />
      </div>
    );
  } else if (visibleTab === 'buy') {
    panel = (
      <div id="bb-profile-panel-buy" className="bb-public-profile-panel bb-public-profile-panel--buy" role="region" aria-label="Buy">
        <header className="bb-profile-page-intro"><h2>Buy</h2><EditableText as="p" editMode={editMode} multiline value={String(website.buySubtext || '').trim() || 'Discover products from this business.'} onChange={value => patchWebsite({ buySubtext: value })} /></header>
        {marketPicker}
        <PublicStorefront
          catalogWorkspace={workspace}
          workspaceName={workspace.brandName}
          hideTitle
          hideIntro
          preview={preview}
          publicMode={publicMode}
          onOpenItem={onOpenItem}
        />
      </div>
    );
  }

  return (
    <div className={`bb-public-home-stack bb-public-profile bb-business-profile bb-profile-storyboard${visibleTab === 'home' ? ' is-card-home' : ' is-section-page'}${informationPage ? ' is-information-page' : ''}${editMode ? ' is-editing' : ''}`}>
      <div className="bb-public-profile-rail" ref={railRef} tabIndex={-1}>
        <BusinessProfileHeader workspace={workspace} editMode={editMode} preview={preview}
          patchWebsite={patchWebsite} onUpdateProfile={onUpdateProfile} onOpenTab={openRailTab} navigation={tabs} activePage={visibleTab} compact={visibleTab !== 'home'} />
        {visibleTab !== 'home' && <div className="bb-public-profile-modules" ref={contentRef} data-scroll-root tabIndex={0} aria-label={`${tabs.find(tab => tab.id === visibleTab)?.label || 'Business profile'} content`}>
          {informationPage ? <div className="bb-profile-information-content">
            <div key={visibleTab} className="bb-profile-story-motion">{panel}</div>
            {!editMode && <ProfileStoryNavigation workspace={workspace} page={visibleTab} onOpenPage={openRailTab} />}
          </div> : panel}
        </div>}
        <ProfileCardFooter workspace={workspace} onOpenPage={openRailTab} />
      </div>
    </div>
  );
}
