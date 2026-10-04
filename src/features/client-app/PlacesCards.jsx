import { ChevronRight, Navigation } from 'lucide-react';
import { navigate, publicPagePath } from '../../app/routing';
import { formatDistanceKm } from '../../shared/geo/haversine';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { getBusinessProfileMeta } from './exploreDiscovery';
import { reportDiscoveryVisit } from '../../shared/analytics/beacon';

function Picture({ src, variant }) {
  return src ? <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <BlankMedia variant={variant} />;
}

function Identity({ biz, showFullAddress = false, showLocation = true, showDistance = true }) {
  const { category, location, onlineOnly } = getBusinessProfileMeta(biz);
  const distance = onlineOnly ? '' : formatDistanceKm(biz.distanceKm);
  const locationLabel = !onlineOnly && showFullAddress
    ? String(biz.fullAddress || biz.address || location || '').trim()
    : location;
  return <>
    <span className="bb-places-title-block">
      <span className="bb-places-name">{biz.brandName}</span>
      {category ? <span className="bb-places-category">{category}</span> : null}
    </span>
    {(showLocation && locationLabel) || (showDistance && distance) ? (
      <span className="bb-places-detail-row">
        {showLocation && locationLabel ? (
          <span className="bb-public-profile-meta bb-places-meta">
            <span className="bb-public-profile-chip bb-public-profile-chip--location"><span className="bb-public-profile-chip-icon" aria-hidden="true" /><span className="bb-public-profile-location">{locationLabel}</span></span>
          </span>
        ) : null}
        {showDistance && distance ? (
          <span className="bb-places-distance">
            <Navigation size={12} strokeWidth={2.15} aria-hidden="true" />
            <strong>{distance}</strong>
            <span>from you</span>
          </span>
        ) : null}
      </span>
    ) : null}
  </>;
}

/** Places is an entry point to the same profile the business edits in E-Business. */
export function PlacesCards({ businesses, analyticsEnabled = false }) {
  return (
    <div className="bb-places-list">
      {businesses.map((item) => <article className="bb-places-row" key={item.slug}>
        <button type="button" className="bb-places-open" onClick={() => {
          if (analyticsEnabled) reportDiscoveryVisit({ ownerId: item.ownerId, slug: item.slug });
          navigate(publicPagePath(item.slug, 'home'));
        }} aria-label={`View ${item.brandName} business profile`}>
          <span className="bb-places-row-art"><Picture src={item.heroImageUrl} variant="banner" /><span className="bb-places-avatar"><Picture src={item.logoUrl} variant="avatar" /></span></span>
          <span className="bb-places-row-identity"><Identity biz={item} showFullAddress /></span>
          <span className="bb-places-row-chevron" aria-hidden="true"><ChevronRight size={20} /></span>
        </button>
      </article>)}
    </div>
  );
}
