import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Home,
  MapPin,
  MessageCircle,
  Bookmark,
  Share2,
  ShoppingBag,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import { isPublicPageEnabled } from '../../config/eBusinessPlatform';
import { publicPagePath } from '../../app/routing';
import { formatDistanceKm } from '../../shared/geo/haversine';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { getBusinessProfileMeta } from './exploreDiscovery';

const destinations = [
  { id: 'home', label: 'Home', hint: 'Learn about this business', Icon: Home },
  { id: 'social', label: 'Social', hint: 'See their latest posts', Icon: Share2 },
  { id: 'book', label: 'Book', hint: 'Book a service or class', Icon: CalendarDays },
  { id: 'buy', label: 'Buy', hint: 'Shop their products', Icon: ShoppingBag }
];

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
    <span className="bb-places-name">{biz.brandName}</span>
    <span className="bb-public-profile-meta bb-places-meta">
      {category ? <span className="bb-public-profile-chip bb-public-profile-chip--category"><span className="bb-public-profile-category">{category}</span></span> : null}
      {showLocation && locationLabel ? <span className="bb-public-profile-chip bb-public-profile-chip--location"><span className="bb-public-profile-chip-icon" aria-hidden="true" /><span className="bb-public-profile-location">{locationLabel}</span></span> : null}
    </span>
    {showDistance && distance ? <span className="bb-places-distance">{distance} from you</span> : null}
  </>;
}

function SectionTitle({ children }) {
  return <h3 className="bb-places-section-title">{children}</h3>;
}

function BusinessCard({ biz, onClose, followed, onFollow, onMessage, messaging, saved, onSave }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('button')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.current.querySelectorAll('button:not([disabled]), a[href]')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<div className="bb-places-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} className="bb-places-dialog" role="dialog" aria-modal="true" aria-label={`${biz.brandName} business card`}>
      <button type="button" className="bb-places-close" aria-label="Close business card" onClick={onClose}><X size={20} /></button>
      <div className="bb-places-cover"><Picture src={biz.heroImageUrl} variant="banner" /></div>
      <div className="bb-places-dialog-identity">
        <span className="bb-places-avatar"><Picture src={biz.logoUrl} variant="avatar" /></span>
        <Identity biz={biz} showLocation={false} showDistance={false} />
      </div>
      {biz.about ? <section className="bb-places-section bb-places-about" aria-labelledby="bb-places-about-title">
        <SectionTitle><span id="bb-places-about-title">About</span></SectionTitle>
        <p>{biz.about}</p>
      </section> : null}
      {biz.fullAddress && String(biz.venueMode || '').trim() !== 'online' ? (
        <section className="bb-places-section bb-places-visit" aria-labelledby="bb-places-visit-title">
          <SectionTitle><span id="bb-places-visit-title">Visit</span></SectionTitle>
          {biz.mapLinkUrl ? (
            <a className="bb-places-address" href={biz.mapLinkUrl} target="_blank" rel="noreferrer">
              <span className="bb-places-address-icon" aria-hidden="true"><MapPin size={18} /></span>
              <span className="bb-places-address-copy">{biz.fullAddress}</span>
              <span className="bb-places-directions">Directions <ArrowUpRight size={14} aria-hidden="true" /></span>
            </a>
          ) : (
            <div className="bb-places-address">
              <span className="bb-places-address-icon" aria-hidden="true"><MapPin size={18} /></span>
              <span className="bb-places-address-copy">{biz.fullAddress}</span>
            </div>
          )}
        </section>
      ) : null}
      <section className="bb-places-section bb-places-pages-section" aria-labelledby="bb-places-pages-title">
        <SectionTitle><span id="bb-places-pages-title">Explore this business</span></SectionTitle>
        <nav className="bb-places-pages" aria-label="Business pages">
          {destinations.filter(({ id }) => isPublicPageEnabled(biz.pages, id)).map(({ id, label, hint, Icon }) => <a key={id} href={`#${publicPagePath(biz.slug, id)}`} onClick={onClose}>
            <span className="bb-places-page-icon" aria-hidden="true"><Icon size={17} /></span>
            <span className="bb-places-page-copy"><strong>{label}</strong><small>{hint}</small></span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>)}
        </nav>
      </section>
      <div className="bb-places-secondary">
        <button type="button" className="bb-places-action is-message" onClick={() => onMessage(biz)} disabled={messaging}><MessageCircle size={16} />{messaging ? 'Opening…' : 'Message'}</button>
        <button type="button" className={`bb-places-action ${saved ? 'is-saved' : 'is-save'}`} onClick={() => onSave(biz.slug)} aria-pressed={saved}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button>
        <button type="button" className={`bb-places-action ${followed ? 'is-following' : 'is-follow'}`} onClick={() => onFollow(biz.slug)}>{followed ? <UserCheck size={16} /> : <UserPlus size={16} />}{followed ? 'Following' : 'Follow'}</button>
      </div>
    </section>
  </div>, document.body);
}

export function PlacesCards({ businesses, followed, followSlug, unfollowSlug, messageBiz, messagingSlug, savedPlaces = new Set(), togglePlaceSave = () => {} }) {
  const [selected, setSelected] = useState(null);
  const biz = businesses.find((item) => item.slug === selected);
  return <>
    <div className="bb-places-list">
      {businesses.map((item) => <article className="bb-places-row" key={item.slug}>
        <button type="button" className="bb-places-open" onClick={() => setSelected(item.slug)} aria-label={`View ${item.brandName} business card`}>
          <span className="bb-places-row-art"><Picture src={item.heroImageUrl} variant="banner" /><span className="bb-places-avatar"><Picture src={item.logoUrl} variant="avatar" /></span></span>
          <span className="bb-places-row-identity"><Identity biz={item} showFullAddress /></span>
          <span className="bb-places-row-chevron" aria-hidden="true"><ChevronRight size={20} /></span>
        </button>
      </article>)}
    </div>
    {biz ? <BusinessCard biz={biz} onClose={() => setSelected(null)} followed={followed.has(biz.slug)} onFollow={(slug) => followed.has(slug) ? unfollowSlug(slug) : followSlug(slug)} onMessage={messageBiz} messaging={messagingSlug === biz.slug} saved={savedPlaces.has(biz.slug)} onSave={togglePlaceSave} /> : null}
  </>;
}
