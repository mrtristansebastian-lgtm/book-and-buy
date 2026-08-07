import { EditableText } from '../../website/components/editable';
import { formatSocialTime } from '../utils/socialPostType';

export function SocialTextTimeline({
  posts,
  brandName = 'Business',
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

  const initial = String(brandName || 'B')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="bb-social-text-stream">
      {posts.map((post) => (
        <article key={post.id} className="bb-social-text-item">
          <div className="bb-social-text-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="bb-social-text-body">
            <header className="bb-social-text-head">
              <strong>{brandName}</strong>
              <span className="bb-social-text-time">{formatSocialTime(post.createdAt)}</span>
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
