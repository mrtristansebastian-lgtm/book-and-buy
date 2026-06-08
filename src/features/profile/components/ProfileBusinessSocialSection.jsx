import { Check, Globe, Instagram, Share2, Users, Zap } from 'lucide-react';

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
  <span className={`relative h-7 w-12 rounded-full transition-colors ${active ? 'bg-black' : 'bg-neutral-200'}`}>
    <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-5' : 'translate-x-0'}`} />
  </span>
);

const SocialPlatformRow = ({ disabled, onSettingChange, platform, platformEnabled, settings, socialPlatforms }) => {
  const Icon = platform.icon;
  const value = settings.socials?.[platform.key] || '';
  return (
    <div className={`grid gap-3 rounded-lg bg-white p-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-opacity md:grid-cols-[minmax(0,1fr)_13.5rem] md:items-center ${disabled ? 'opacity-55' : ''}`}>
      <label className="native-control-pill flex min-w-0 items-center gap-3 rounded-lg border border-neutral-100 bg-white px-3 py-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-black">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 block text-[9px] font-black uppercase text-neutral-400">{platform.label}</span>
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={event => onSettingChange('socials', { ...settings.socials, [platform.key]: event.target.value })}
            placeholder={disabled ? 'Hidden on booking page' : platform.placeholder}
            className="native-control-input w-full bg-transparent text-sm font-bold text-black outline-none placeholder:text-neutral-300 disabled:cursor-not-allowed"
          />
        </span>
      </label>
      <button
        type="button"
        onClick={() => onSettingChange('socialPlatforms', { ...platformDefaults, ...(socialPlatforms || {}), [platform.key]: !platformEnabled })}
      className="flex h-10 items-center justify-between gap-3 rounded-full bg-neutral-50 px-3 text-[10px] font-black uppercase text-black shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
      >
        {platformEnabled ? 'Shown' : 'Hidden'}
        <Toggle active={platformEnabled} />
      </button>
    </div>
  );
};

export const ProfileBusinessSocialSection = ({
  onCopyReferral,
  onSaveProfile,
  onSettingChange,
  referralUrl,
  settings
}) => {
  const socialPlatforms = settings.socialPlatforms || platformDefaults;
  const masterEnabled = Boolean(settings.features?.socialLinks);

  return (
    <section className="rounded-lg bg-neutral-50/80 p-4 sm:p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase text-neutral-400">Public links</p>
          <h4 className="mt-1 text-xl font-black text-black">Socials and referral</h4>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-neutral-500">Choose exactly which filled links appear on the booking page.</p>
        </div>
        <button
          type="button"
          onClick={() => onSettingChange('features', { ...settings.features, socialLinks: !masterEnabled })}
          className="flex h-11 items-center justify-between gap-3 rounded-full bg-white px-4 text-[10px] font-black uppercase text-black shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
        >
          {masterEnabled ? 'Links on' : 'Links off'}
          <Toggle active={masterEnabled} />
        </button>
      </div>

      <div className="grid gap-3">
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

      <div className="mt-4 grid gap-4 rounded-lg bg-black p-4 text-white md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#39FF14] text-black">
            <Share2 size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase text-white/45">Affiliate link</span>
            <span className="block truncate text-sm font-bold text-white">{referralUrl}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onCopyReferral(referralUrl, 'Affiliate link')}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[10px] font-black uppercase text-black transition-colors hover:bg-neutral-100"
        >
          <Share2 size={14} />
          Copy link
        </button>
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={onSaveProfile} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#39FF14] px-6 text-[10px] font-black uppercase text-black transition-transform hover:scale-[1.02]">
          <Check size={14} />
          Save profile
        </button>
      </div>
    </section>
  );
};
