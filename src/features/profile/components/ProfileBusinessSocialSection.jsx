import { Globe, Instagram, Link2, Share2, Users, Zap } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle', icon: Instagram },
  { key: 'tiktok', label: 'TikTok', placeholder: '@yourtiktok', icon: Zap },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook page or handle', icon: Users },
  { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com', icon: Globe }
];

const platformDefaults = SOCIAL_PLATFORMS.reduce((acc, platform) => {
  acc[platform.key] = true;
  return acc;
}, {});

const Toggle = ({ active }) => (
  <span className={`business-toggle ${active ? 'is-on' : ''}`} aria-hidden="true">
    <span />
  </span>
);

const SocialPlatformRow = ({ disabled, onSettingChange, platform, platformEnabled, settings, socialPlatforms }) => {
  const Icon = platform.icon;
  const value = settings.socials?.[platform.key] || '';
  return (
    <div className={`business-social-row ${disabled ? 'is-disabled' : ''}`}>
      <label className="business-settings-row native-control-pill">
        <span className="business-settings-row-icon">
          <Icon size={16} />
        </span>
        <span className="business-settings-row-copy">
          <span>{platform.label}</span>
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={event => onSettingChange('socials', { ...settings.socials, [platform.key]: event.target.value })}
            placeholder={disabled ? 'Hidden on booking page' : platform.placeholder}
            className="native-control-input"
          />
        </span>
      </label>
      <button
        type="button"
        onClick={() => onSettingChange('socialPlatforms', { ...platformDefaults, ...(socialPlatforms || {}), [platform.key]: !platformEnabled })}
        className="business-toggle-button"
        aria-pressed={platformEnabled}
      >
        {platformEnabled ? 'Shown' : 'Hidden'}
        <Toggle active={platformEnabled} />
      </button>
    </div>
  );
};

export const ProfileBusinessSocialSection = ({
  onCopyReferral,
  onSettingChange,
  referralUrl,
  settings
}) => {
  const socialPlatforms = settings.socialPlatforms || platformDefaults;
  const masterEnabled = Boolean(settings.features?.socialLinks);

  return (
    <section className="business-settings-panel business-social-panel">
      <div className="business-panel-heading">
        <span className="business-panel-icon"><Link2 size={16} /></span>
        <div>
          <p>Public Links</p>
          <h4>Socials and referral</h4>
          <small>Choose exactly which filled links appear on the booking page.</small>
        </div>
        <button
          type="button"
          onClick={() => onSettingChange('features', { ...settings.features, socialLinks: !masterEnabled })}
          className="business-toggle-button business-master-toggle"
          aria-pressed={masterEnabled}
        >
          {masterEnabled ? 'Links on' : 'Links off'}
          <Toggle active={masterEnabled} />
        </button>
      </div>

      <div className="business-settings-group">
        {SOCIAL_PLATFORMS.map(platform => {
          const platformEnabled = socialPlatforms[platform.key] !== false;
          return (
            <SocialPlatformRow
              key={platform.key}
              disabled={!masterEnabled || !platformEnabled}
              onSettingChange={onSettingChange}
              platform={platform}
              platformEnabled={platformEnabled}
              settings={settings}
              socialPlatforms={socialPlatforms}
            />
          );
        })}
      </div>

      <div className="business-referral-card">
        <div>
          <span>
            <Share2 size={17} />
          </span>
          <span>
            <small>Affiliate link</small>
            <strong>{referralUrl}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCopyReferral(referralUrl, 'Affiliate link')}
          className="business-referral-copy"
        >
          <Share2 size={14} />
          Copy link
        </button>
      </div>
    </section>
  );
};
