import { Pencil } from 'lucide-react';
import { getPostMediaUrls } from '../utils/socialPostType';

/**
 * Photo posts: Instagram-style flush 3-column image grid.
 * Click opens lightbox detail. Optional onEditPost adds manage chrome.
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
        const urls = getPostMediaUrls(post);
        const src = urls[0] || '';
        const multi = urls.length > 1;
        const title = String(post.title || '').trim() || 'Untitled post';

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
                {src ? (
                  <img src={src} alt="" className="bb-social-square-tile-img" />
                ) : (
                  <span className="bb-social-square-tile-empty">
                    {editMode ? 'Add photo' : 'No image'}
                  </span>
                )}
                {multi ? (
                  <span className="bb-social-ig-carousel-badge" aria-label={`${urls.length} photos`}>
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
