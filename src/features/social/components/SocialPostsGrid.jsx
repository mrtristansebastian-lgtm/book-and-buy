import { Play } from 'lucide-react';
import { getSocialPostKind } from '../utils/socialPostType';

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
          (editMode ? 'Add a photo or video to fill the grid.' : 'No posts published yet.')}
      </div>
    );
  }

  return (
    <div className="bb-social-posts-grid" role="list">
      {posts.map((post) => {
        const kind = getSocialPostKind(post);
        const isVideo = kind === 'video';
        const src = isVideo ? post.posterUrl || post.mediaUrl || '' : post.mediaUrl || '';

        return (
          <article key={post.id} className="bb-social-post-cell" role="listitem">
            {editMode && post.published === false ? (
              <div className="bb-edit-section-badge bb-social-draft-badge">Draft</div>
            ) : null}
            <button
              type="button"
              className="bb-social-post-hit"
              onClick={() => onOpenPost?.(post.id)}
              aria-label="Open post"
            >
              <div className="bb-social-post-media">
                {src ? (
                  <img src={src} alt="" className="bb-social-post-media-img" />
                ) : (
                  <div className="bb-social-post-media-empty" aria-hidden="true" />
                )}
                {isVideo ? (
                  <span className="bb-social-post-play" aria-hidden="true">
                    <Play size={14} fill="currentColor" strokeWidth={0} />
                  </span>
                ) : null}
              </div>
            </button>
            {editMode ? (
              <button
                type="button"
                className="bb-ghost-btn bb-social-post-publish py-1 px-2 text-xs"
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
