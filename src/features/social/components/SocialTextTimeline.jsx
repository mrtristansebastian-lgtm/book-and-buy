import { EditableText } from '../../website/components/editable';
import { formatSocialTime } from '../utils/socialPostType';

export function SocialTextTimeline({
  posts,
  brandName = 'Business',
  slug = '',
  logoUrl = '',
  editMode = false,
  onUpdateSocialPost
}) {
  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a text update to start the timeline.' : 'No text updates yet.'}
      </div>
    );
  }

  const username = String(slug || '')
    .trim()
    .replace(/^@/, '');
  const initial = String(brandName || username || 'B')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="bb-social-text-stream">
      {posts.map((post) => (
        <article key={post.id} className="bb-social-text-item">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="bb-social-text-avatar bb-social-text-avatar--img" />
          ) : (
            <div className="bb-social-text-avatar" aria-hidden="true">
              {initial}
            </div>
          )}
          <div className="bb-social-text-body">
            <header className="bb-social-text-head">
              <strong>{brandName}</strong>
              <span className="bb-social-text-handle">@{username || 'business'}</span>
              <span className="bb-social-text-dot" aria-hidden="true">
                ·
              </span>
              <span className="bb-social-text-time">{formatSocialTime(post.createdAt) || 'now'}</span>
              {editMode && post.published === false ? (
                <span className="bb-edit-section-badge">Draft</span>
              ) : null}
            </header>
            {editMode || post.title ? (
              <EditableText
                as="p"
                className="bb-social-text-kicker"
                editMode={editMode}
                value={post.title || ''}
                placeholder="Kicker (optional)"
                onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
              />
            ) : null}
            <EditableText
              as="p"
              className="bb-social-text-caption"
              editMode={editMode}
              multiline
              value={post.caption || ''}
              placeholder="What’s happening?"
              onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
            />
            {editMode ? (
              <button
                type="button"
                className="bb-ghost-btn py-1 px-2.5 text-xs justify-self-start"
                onClick={() =>
                  onUpdateSocialPost?.(post.id, { published: post.published === false })
                }
              >
                {post.published !== false ? 'Unpublish' : 'Publish'}
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
