import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Bookmark, MapPin, Phone, Menu, BookOpen, Images, Star, HelpCircle, MessageCircle, ShoppingBag, CalendarDays, LayoutGrid, Compass } from 'lucide-react';
import { EditableImage, EditableText, EditSection } from './editable';
import { Button } from '../../../shared/ui/Button';
import { navigate } from '../../../app/routing';
import { useClientProfile } from '../../client-app/ClientProfileContext';
import { startClientMessage } from '../../client-app/startClientMessage';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { profileSignInPath } from '../../client-app/profileAuthReturn';
import { profileJourney } from '../profileModel';

/** One identity for the public profile, discovery and the E-Business editor.
 * Keep the existing image/copy fields so published merchant content isn't lost.
 */
export function BusinessProfileHeader({ workspace, editMode, preview, patchWebsite, onUpdateProfile, onOpenTab, navigation = [], activePage = 'home', compact = false }) {
  const website = workspace.website || {};
  const { profile, isPlaceSaved, togglePlaceSave } = useClientProfile();
  const { workspace: local, startThreadFromClient } = useWorkspace();
  const [messaging, setMessaging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const menuId = `bb-profile-pages-${useId()}`;
  useEffect(() => {
    if (!menuOpen) return;
    (menuRef.current?.querySelector('[aria-current="page"]') || menuRef.current?.querySelector('button:not(:disabled)'))?.focus();
    const outside = event => {
      if (!menuRef.current?.contains(event.target) && !menuTriggerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); setMenuOpen(false); menuTriggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);
  const pageIcons = { home: Compass, about: BookOpen, offers: LayoutGrid, gallery: Images, reviews: Star, map: MapPin, faq: HelpCircle, contact: MessageCircle, book: CalendarDays, buy: ShoppingBag };
  const openPage = id => { setMenuOpen(false); onOpenTab?.(id); menuTriggerRef.current?.focus(); };
  const name = String(workspace.brandName || 'Your business').trim();
  const bio = website.homeSubtext || website.subcopy || workspace.tagline || '';
  const location = website.profileLocation || [website.city, website.region].filter(Boolean).join(', ');
  const category = website.profileCategory || '';
  const logo = website.logoUrl || workspace.logoUrl || '';
  const interactive = !preview && !editMode;
  const explorePage = editMode ? navigation.find(item => item.id === 'about') : profileJourney(workspace).nextStory;
  useEffect(() => {
    if (compact) return;
    const identity = menuTriggerRef.current?.closest('.bb-business-profile-identity');
    const copy = identity?.querySelector('.bb-business-profile-bio');
    if (!identity || !copy) return;
    // Balance the image against the actual start of the copy, including its max width.
    const alignPhoto = () => {
      const frame = identity.getBoundingClientRect();
      const text = copy.getBoundingClientRect();
      const shift = (text.left - frame.left) / 2 - frame.width / 4;
      identity.style.setProperty('--bb-profile-photo-shift', `${Math.max(0, shift)}px`);
    };
    const observer = new ResizeObserver(alignPhoto);
    observer.observe(identity);
    observer.observe(copy);
    alignPhoto();
    document.fonts.ready.then(alignPhoto);
    return () => { observer.disconnect(); identity.style.removeProperty('--bb-profile-photo-shift'); };
  }, [compact, editMode, bio]);


  const message = async () => {
    if (!profile?.email) { navigate(profileSignInPath(workspace.slug)); return; }
    if (messaging) return;
    setError('');
    setMessaging(true);
    try {
      await startClientMessage({
        profile, workspace, requireThread: true,
        // Local demo threads must never be used for a different real business.
        startThreadFromClient: workspace.isDemo && workspace.slug === local.slug ? startThreadFromClient : undefined
      });
    } catch {
      setError('Could not open the conversation. Please try again.');
    } finally { setMessaging(false); }
  };
  const save = async () => {
    if (!profile?.email) { navigate(profileSignInPath(workspace.slug)); return; }
    if (saving) return;
    setSaving(true);
    setError('');
    try { await togglePlaceSave(workspace.slug); }
    catch { setError('Could not save this business. Please try again.'); }
    finally { setSaving(false); }
  };

  return (
    <EditSection editMode={editMode} title="Business profile" sectionId="profile" className={`bb-business-profile-identity${compact ? ' is-compact' : ''}`}>
      <nav className="bb-business-profile-public-nav bb-profile-card-nav" aria-label="Business profile navigation">
        <div className="bb-profile-menu-anchor">
        <button type="button" ref={menuTriggerRef} className="bb-profile-menu-trigger" aria-label="Menu" aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(open => !open)}><Menu size={18} strokeWidth={1.6}/><span>Menu</span></button>
        {menuOpen && <div className="bb-profile-page-popover" ref={menuRef} id={menuId}>
          <nav aria-label="Business pages" onKeyDown={event => {
            if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            if (!buttons.length) return;
            const current = buttons.indexOf(document.activeElement);
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
            buttons[index]?.focus();
          }}>{navigation.map(item => { const Icon = pageIcons[item.id] || Compass; return <button type="button" key={item.id} aria-current={activePage === item.id ? 'page' : undefined} onClick={() => openPage(item.id)}><Icon size={16} strokeWidth={1.6}/><span>{item.label}</span></button>; })}</nav>
        </div>}
        </div>
        {compact && <button type="button" className="bb-profile-mini-identity" onClick={() => openPage('home')} aria-label={`Back to ${name} business card`}>
          {logo && <img src={logo} alt=""/>}<span>{name}</span>
        </button>}
        <div className="bb-profile-quick-actions">
          {navigation.some(item => item.id === 'book') && <button type="button" className={`bb-profile-quick-button${activePage === 'book' ? ' is-active' : ''}`} aria-label="Book" title="Book" onClick={() => openPage('book')}><CalendarDays size={16}/><span>Book</span></button>}
          {navigation.some(item => item.id === 'buy') && <button type="button" className={`bb-profile-quick-button${activePage === 'buy' ? ' is-active' : ''}`} aria-label="Buy" title="Buy" onClick={() => openPage('buy')}><ShoppingBag size={16}/><span>Buy</span></button>}
        </div>
      </nav>
      {compact && <h1 className="bb-profile-page-title sr-only">{navigation.find(item => item.id === activePage)?.label || ({ cart: 'Your cart', checkout: 'Checkout', success: 'Confirmation' })[activePage] || 'Business profile'}</h1>}
      {!compact && <>
      {website.heroImageUrl || website.heroImage || editMode ? <div className="bb-business-profile-banner">
        <EditableImage editMode={editMode} src={website.heroImageUrl || website.heroImage || ''}
          alt={`${name} cover photo`} className="bb-business-profile-banner-media"
          preset="profileBanner" storageFolder="brand" placeholderLabel="Add cover photo" editLabel="Edit cover photo"
          onChange={(url) => patchWebsite({ heroImageUrl: url, heroImage: '' })} />
      </div> : null}
      <div className="bb-business-profile-details">
        <div className="bb-business-profile-photo">
          <EditableImage editMode={editMode} src={logo} alt={`${name} profile photo`}
            className="bb-business-profile-photo-media" preset="logo" storageFolder="brand" compact
            placeholderLabel="Add profile photo" editLabel="Edit profile photo" onChange={(url) => {
              onUpdateProfile?.({ logoUrl: url });
              patchWebsite({ logoUrl: url });
            }} />
        </div>
        <div className="bb-business-profile-copy">
          <EditableText as="h1" className="bb-business-profile-name" editMode={editMode}
            maxLength={60}
            value={name} placeholder="Business name" website={website} patchWebsite={patchWebsite}
            onChange={(value) => {
              const next = value.trim() || 'Your business';
              onUpdateProfile?.({ brandName: next });
            }} />
          {(category || location) ? <p className="bb-business-profile-meta">
            {category ? <span className="bb-profile-metadata-pill">{category}</span> : null}
            {location ? <span className="bb-profile-metadata-pill"><MapPin size={14} aria-hidden="true" />{location}</span> : null}
          </p> : null}
          <EditableText as="p" className="bb-business-profile-bio" editMode={editMode} multiline
            maxLength={200}
            value={bio} placeholder="A short introduction to your business" website={website}
            patchWebsite={patchWebsite}
            onChange={(value) => patchWebsite({ homeSubtext: value, subcopy: value })} />
        </div>
        <div className="bb-business-profile-actions">
          {<>
            <Button action="chat" variant="secondary" disabled={!interactive} busy={messaging} onClick={message}>Message</Button>
            {workspace.email ? <Button as="a" action="email" variant="secondary" disabled={!interactive} href={`mailto:${workspace.email}`}>Email</Button> : null}
            {workspace.phone ? <Button as="a" icon={Phone} variant="secondary" disabled={!interactive} href={`tel:${workspace.phone}`}>Call</Button> : null}
            <Button action="save" icon={Bookmark} variant="secondary" className="bb-profile-bookmark" disabled={!interactive} busy={saving}
              selected={isPlaceSaved(workspace.slug)}
              aria-label={isPlaceSaved(workspace.slug) ? 'Unsave business' : 'Save business'}
              title={isPlaceSaved(workspace.slug) ? 'Unsave business' : 'Save business'}
              aria-pressed={isPlaceSaved(workspace.slug)} onClick={save}>
              {isPlaceSaved(workspace.slug) ? 'Saved' : 'Save'}
            </Button>
          </>}
        </div>
        {explorePage && <div className="bb-profile-explore-action">
          <Button icon={ArrowRight} variant="secondary" className="bb-profile-explore-button" onClick={() => openPage(explorePage.id)}>
            Explore the business
          </Button>
        </div>}
      </div>
      </>}
      {error ? <p className="bb-business-profile-error" role="alert">{error}</p> : null}
    </EditSection>
  );
}
