import { Pencil } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp } from '../utils/socialPostType';

/**
 * Text updates — separate speech bubbles in a Posts-style 3-column grid.
 */
export function SocialTextTimeline({
  posts,
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost,
  onEditPost
}) {
  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a note to start the feed.' : 'No notes published yet.'}
      </div>
    );
  }

  return (
    <div className="bb-social-notes bb-social-notes--grid" role="list">
      {posts.map((post) => {
        const stamp = formatNoteStamp(post.createdAt);
        return (
          <article key={post.id} className="bb-social-note" role="listitem">
            <div className="bb-social-note-card bb-social-note-bubble">
              <header className="bb-social-note-meta">
                {stamp ? (
                  <time
                    className="bb-social-note-stamp"
                    dateTime={new Date(post.createdAt).toISOString()}
                  >
                    {stamp}
                  </time>
                ) : null}
                {editMode && showPublishToggle && post.published === false ? (
                  <span className="bb-edit-section-badge">Draft</span>
                ) : null}
              </header>

              {editMode || post.title ? (
                <EditableText
                  as="h2"
                  className="bb-social-note-title"
                  editMode={editMode}
                  value={post.title || ''}
                  placeholder="Title"
                  onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
                />
              ) : null}

              <EditableText
                as="p"
                className="bb-social-note-text"
                editMode={editMode}
                multiline
                value={post.caption || ''}
                placeholder="Write your update…"
                onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
              />

              {onEditPost ? (
                <button
                  type="button"
                  className="bb-social-manage-edit bb-social-manage-edit--note"
                  onClick={() => onEditPost(post)}
                >
                  <Pencil size={13} strokeWidth={2.2} />
                  Edit
                </button>
              ) : null}

              {editMode ? (
                <div className="bb-social-edit-actions">
                  {showPublishToggle ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, { published: post.published === false })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                  {onRemoveSocialPost ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() => onRemoveSocialPost(post.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
