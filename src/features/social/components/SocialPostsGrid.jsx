/**
 * Photo posts: equal square tile grid — click opens lightbox detail.
 */
export function SocialPostsGrid({
  posts,
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost,
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
        const title = String(post.title || '').trim() || 'Untitled post';

        return (
          <article key={post.id} className="bb-social-post-card" role="listitem">
            {editMode && showPublishToggle && post.published === false ? (
              <div className="bb-social-post-card-meta">
                <span className="bb-edit-section-badge">Draft</span>
              </div>
            ) : null}

            <button
              type="button"
              className="bb-social-square-tile"
              onClick={() => onOpenPost?.(post.id)}
              aria-label={`View ${title}`}
            >
              <span className="bb-social-square-tile-media">
                {src ? (
                  <img src={src} alt="" className="bb-social-square-tile-img" />
                ) : (
                  <span className="bb-social-square-tile-empty">
                    {editMode ? 'Add photo' : 'No image'}
                  </span>
                )}
              </span>
              <span className="bb-social-square-tile-title">{title}</span>
            </button>

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
          </article>
        );
      })}
    </div>
  );
}
