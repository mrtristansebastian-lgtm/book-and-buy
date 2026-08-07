import { Clapperboard, Grid3X3, Type } from 'lucide-react';

const TABS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'videos', label: 'Videos', kind: 'video', Icon: Clapperboard },
  { id: 'text', label: 'Articles', kind: 'text', Icon: Type }
];

export function SocialProfileTabs({ value = 'posts', onChange }) {
  return (
    <div className="bb-social-profile-tabs" role="tablist" aria-label="Business Blog">
      {TABS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`bb-social-profile-tab ${active ? 'is-active' : ''}`}
            onClick={() => onChange?.(id)}
          >
            <Icon size={16} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const SOCIAL_PROFILE_TABS = TABS;
