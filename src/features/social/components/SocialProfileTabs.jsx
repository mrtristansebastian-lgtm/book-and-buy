import { Clapperboard, Grid3X3, PenLine, RectangleVertical } from 'lucide-react';

const TABS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'films', label: 'Films', kind: 'video', Icon: Clapperboard },
  { id: 'verticals', label: 'Verticals', kind: 'vertical', Icon: RectangleVertical },
  { id: 'text', label: 'Notes', kind: 'text', Icon: PenLine }
];

export function SocialProfileTabs({ value = 'posts', onChange }) {
  const activeId = value === 'videos' ? 'films' : value;

  return (
    <div className="bb-social-profile-tabs" role="tablist" aria-label="Social">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeId === id;
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
