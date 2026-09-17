import { Clapperboard, Grid3X3, PenLine, RectangleVertical, ShoppingBag, Sparkles } from 'lucide-react';

export const SOCIAL_PROFILE_TABS = [
  { id: 'posts', label: 'Posts', kind: 'image', Icon: Grid3X3 },
  { id: 'films', label: 'Films', kind: 'video', Icon: Clapperboard },
  { id: 'verticals', label: 'Verticals', kind: 'vertical', Icon: RectangleVertical },
  { id: 'text', label: 'Notes', kind: 'text', Icon: PenLine }
];

export const EXPLORE_CONTENT_TABS = [
  ...SOCIAL_PROFILE_TABS,
  { id: 'book', label: 'Book', kind: 'book', Icon: Sparkles },
  { id: 'buy', label: 'Buy', kind: 'buy', Icon: ShoppingBag }
];

export function SocialProfileTabs({ value = 'posts', onChange, tabs = SOCIAL_PROFILE_TABS }) {
  const activeId = value === 'videos' ? 'films' : value;
  const list = Array.isArray(tabs) && tabs.length ? tabs : SOCIAL_PROFILE_TABS;

  return (
    <div className="bb-social-profile-tabs" role="tablist" aria-label="Content type">
      {list.map(({ id, label, Icon }) => {
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
