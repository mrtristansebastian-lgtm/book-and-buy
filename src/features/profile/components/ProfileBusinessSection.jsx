import { useState } from 'react';
import { Check, Image, Link2, Sparkles } from 'lucide-react';
import { ProfileBusinessIdentitySection } from './ProfileBusinessIdentitySection';
import { ProfileBusinessMediaSection } from './ProfileBusinessMediaSection';
import { ProfileBusinessSocialSection } from './ProfileBusinessSocialSection';

const BUSINESS_PANES = [
  { id: 'identity', label: 'Identity', detail: 'Name, logo, and first impression', icon: Sparkles },
  { id: 'media', label: 'Place & Media', detail: 'Banner, venue photos, and map', icon: Image },
  { id: 'links', label: 'Links', detail: 'Social profiles, referral, and publish', icon: Link2 }
];

export const ProfileBusinessSection = ({
  activeProfileSection,
  onCopyReferral,
  onImageCrop,
  onImageRemove,
  onImageUpload,
  onOpenStyleRoom,
  onRemoveVenuePhoto,
  onSaveProfile,
  onSettingChange,
  onVenuePhotoUpload,
  referralUrl,
  settings,
  venuePhotos
}) => {
  const [activeBusinessPane, setActiveBusinessPane] = useState('identity');
  const venuePhotoCount = Array.isArray(venuePhotos) ? venuePhotos.length : 0;
  const hasLocation = Boolean(settings.address || settings.mapPlace?.placeId || settings.mapPlace?.lat != null);
  const socialCount = Object.values(settings.socials || {}).filter(Boolean).length;
  const essentials = [
    { label: 'Name', ready: Boolean(settings.brandName), value: settings.brandName || 'Missing' },
    { label: 'Logo', ready: Boolean(settings.logo), value: settings.logo ? 'Uploaded' : 'Optional' },
    { label: 'Media', ready: Boolean(settings.bannerImage || venuePhotoCount), value: settings.bannerImage || venuePhotoCount ? `${venuePhotoCount + (settings.bannerImage ? 1 : 0)} ready` : 'Add photos' },
    { label: 'Location', ready: hasLocation, value: hasLocation ? 'Set' : 'Not set' },
    { label: 'Links', ready: Boolean(socialCount), value: socialCount ? `${socialCount} filled` : 'Optional' }
  ];
  const readyCount = essentials.filter(item => item.ready).length;
  return (
    <div data-tour="profile-business-info" className={`profile-section profile-section-business ${activeProfileSection === 'business' ? 'block' : 'hidden'}`}>
      <div className="business-settings-hero">
        <div className="business-settings-hero-copy">
          <p>Business Profile</p>
          <h3>Client-facing details</h3>
          <span>Move through one focused pane at a time. These are the details clients see before they decide to book.</span>
        </div>
        <div className="business-studio-summary" aria-label="Business profile readiness">
          <div className="business-studio-brandmark">
            {settings.logo ? <img src={settings.logo} alt="" /> : (settings.brandName?.charAt(0) || 'B')}
          </div>
          <div className="business-studio-summary-copy">
            <span>{readyCount} of {essentials.length} essentials ready</span>
            <strong>{settings.brandName || 'Your Business'}</strong>
            <div className="business-studio-meter">
              {essentials.map(item => <i key={item.label} className={item.ready ? 'is-ready' : ''} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="business-studio-shell">
        <nav className="business-studio-tabs" aria-label="Business detail sections">
          {BUSINESS_PANES.map(item => {
            const Icon = item.icon;
            const active = item.id === activeBusinessPane;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() => setActiveBusinessPane(item.id)}
                aria-pressed={active}
              >
                <span><Icon size={15} /></span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </button>
            );
          })}
        </nav>

        <div className="business-settings-stack" aria-live="polite">
          {activeBusinessPane === 'identity' && (
            <ProfileBusinessIdentitySection
              onImageCrop={onImageCrop}
              onImageRemove={onImageRemove}
              onImageUpload={onImageUpload}
              onSettingChange={onSettingChange}
              settings={settings}
            />
          )}
          {activeBusinessPane === 'media' && (
            <ProfileBusinessMediaSection
              onImageCrop={onImageCrop}
              onImageRemove={onImageRemove}
              onImageUpload={onImageUpload}
              onOpenStyleRoom={onOpenStyleRoom}
              onRemoveVenuePhoto={onRemoveVenuePhoto}
              onSettingChange={onSettingChange}
              onVenuePhotoUpload={onVenuePhotoUpload}
              settings={settings}
              venuePhotos={venuePhotos}
            />
          )}
          {activeBusinessPane === 'links' && (
            <ProfileBusinessSocialSection
              onCopyReferral={onCopyReferral}
              onSettingChange={onSettingChange}
              referralUrl={referralUrl}
              settings={settings}
            />
          )}

          <div className="business-studio-footer">
            <div>
              <span>Public profile</span>
              <strong>Save once you are happy with this pane.</strong>
            </div>
            <button type="button" onClick={onSaveProfile}>
              <Check size={14} />
              Save profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
