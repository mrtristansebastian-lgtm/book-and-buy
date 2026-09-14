import { Pencil, Play } from 'lucide-react';
import { getPostMediaItems } from '../utils/socialPostType';

/**
 * Photo posts: Instagram-style flush 3-column image grid.
 * Supports mixed photo + short-clip carousels.
 */
export function SocialPostsGrid({
  posts,
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost,
  onOpenPost,
  onEditPost,
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
    <div className="bb-social-post-cards bb-social-ig-grid" role="list">
      {posts.map((post) => {
        const media = getPostMediaItems(post);
        const first = media[0];
        const multi = media.length > 1;
        const title = String(post.title || '').trim() || 'Untitled post';
        const thumb =
          first?.kind === 'video' ? first.posterUrl || first.url || '' : first?.url || '';

        return (
          <article key={post.id} className="bb-social-post-card bb-social-ig-cell" role="listitem">
            {editMode && showPublishToggle && post.published === false ? (
              <div className="bb-social-post-card-meta bb-social-ig-draft">
                <span className="bb-edit-section-badge">Draft</span>
              </div>
            ) : null}

            <button
              type="button"
              className="bb-social-square-tile bb-social-ig-tile"
              onClick={() => onOpenPost?.(post.id)}
              aria-label={`View ${title}`}
            >
              <span className="bb-social-square-tile-media bb-social-ig-media">
                {thumb ? (
                  <img src={thumb} alt="" className="bb-social-square-tile-img" />
                ) : first?.kind === 'video' && first.url ? (
                  <video
                    src={first.url}
                    muted
                    playsInline
                    className="bb-social-square-tile-img"
                  />
                ) : (
                  <span className="bb-social-square-tile-empty">
                    {editMode ? 'Add media' : 'No media'}
                  </span>
                )}
                {first?.kind === 'video' ? (
                  <span className="bb-social-ig-video-badge" aria-hidden="true">
                    <Play size={12} fill="currentColor" />
                  </span>
                ) : null}
                {multi ? (
                  <span className="bb-social-ig-carousel-badge" aria-label={`${media.length} items`}>
                    <span className="bb-social-ig-carousel-badge-icon" aria-hidden="true" />
                  </span>
                ) : null}
              </span>
            </button>

            {onEditPost ? (
              <button
                type="button"
                className="bb-social-manage-edit"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditPost(post);
                }}
              >
                <Pencil size={13} strokeWidth={2.2} />
                Edit
              </button>
            ) : null}

            {editMode ? (
              <div className="bb-social-edit-actions bb-social-ig-actions">
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
