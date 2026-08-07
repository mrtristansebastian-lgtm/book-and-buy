import { EditableText } from '../../website/components/editable';

/**
 * Photo posts: media-first gallery cards (Buy trading-card rhythm).
 */
export function SocialPostsGrid({
  posts,
  editMode = false,
  onUpdateSocialPost,
  onOpenPost,
  emptyLabel
}) {
  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {emptyLabel ||
          (editMode ? 'Add a photo post to fill the gallery.' : 'No posts published yet.')}
      </div>
    );
  }

  return (
    <div className="bb-social-post-cards" role="list">
      {posts.map((post) => {
        const src = post.mediaUrl || '';

        return (
          <article key={post.id} className="bb-social-post-card" role="listitem">
            {editMode && post.published === false ? (
              <div className="bb-social-post-card-meta">
                <span className="bb-edit-section-badge">Draft</span>
              </div>
            ) : null}

            <div className="bb-social-post-card-surface">
              <button
                type="button"
                className="bb-social-post-card-media"
                onClick={() => onOpenPost?.(post.id)}
                aria-label={`View ${post.title || 'post'}`}
              >
                {src ? (
                  <img src={src} alt="" className="bb-social-post-card-img" />
                ) : (
                  <div className="bb-social-post-card-empty">
                    {editMode ? 'Add photo in studio' : 'No image'}
                  </div>
                )}
              </button>

              <div className="bb-social-post-card-body">
                <header className="bb-social-post-card-head">
                  <EditableText
                    as="h2"
                    className="bb-social-post-card-title"
                    editMode={editMode}
                    value={post.title || ''}
                    placeholder="Post title"
                    onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
                  />
                  <span
                    className="bb-social-post-card-underline bb-public-native-fill"
                    aria-hidden="true"
                  />
                </header>

                <EditableText
                  as="p"
                  className="bb-social-post-card-caption"
                  editMode={editMode}
                  multiline
                  value={post.caption || ''}
                  placeholder="Caption"
                  onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
                />
              </div>
            </div>

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
          </article>
        );
      })}
    </div>
  );
}
