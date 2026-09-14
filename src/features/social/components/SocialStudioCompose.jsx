import { Clapperboard, ImagePlus, Type } from 'lucide-react';

export const BLOG_CREATE_ACTIONS = [
  {
    id: 'posts',
    label: 'New post',
    hint: 'Photos + clips ≤1m',
    Icon: ImagePlus
  },
  {
    id: 'videos',
    label: 'New video',
    hint: 'Any length · YT flow',
    Icon: Clapperboard
  },
  {
    id: 'text',
    label: 'New text update',
    hint: 'Short note',
    Icon: Type
  }
];

/**
 * Create bar — opens the shared BlogComposerSheet via parent.
 */
export function SocialStudioCompose({ onOpenCreate }) {
  return (
    <section className="bb-social-studio-create" aria-label="Create">
      <div className="bb-social-studio-create-copy">
        <p className="bb-social-studio-create-eyebrow">Publish</p>
        <h2 className="bb-social-studio-create-title">Add to Content</h2>
        <p className="bb-social-studio-create-lede">
          Posts mix photos and clips up to 1 minute. Longer films go in Videos. Text feels like X.
        </p>
      </div>
      <div className="bb-social-studio-create-actions">
        {BLOG_CREATE_ACTIONS.map(({ id, label, hint, Icon }) => (
          <button
            key={id}
            type="button"
            className="bb-social-studio-create-btn"
            onClick={() => onOpenCreate?.(id)}
          >
            <span className="bb-social-studio-create-btn-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <span className="bb-social-studio-create-btn-copy">
              <strong>{label}</strong>
              <span>{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
