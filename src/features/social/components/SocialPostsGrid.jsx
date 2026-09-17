import { ImagePlus, Play } from 'lucide-react';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { BlankMedia } from '../../../shared/ui/BlankMedia';
import { getPostMediaItems } from '../utils/socialPostType';

/**
 * Photo posts: Instagram-style flush image grid.
 * Manage actions live in the opened feed — not on grid tiles.
 */
export function SocialPostsGrid({
  posts,
  editMode = false,
  showPublishToggle = true,
  onOpenPost,
  emptyLabel
}) {
  if (!posts.length) {
    return (
      <EmptyState
        compact
        icon={ImagePlus}
        title={editMode ? 'Add your first post' : 'No posts yet'}
        description={
          emptyLabel ||
          (editMode ? 'Publish a photo to fill this gallery.' : 'No posts published yet.')
        }
      />
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
          first?.kind === 'video'
            ? first.posterUrl || post.posterUrl || first.url || ''
            : first?.url || '';

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
                  <BlankMedia variant="square" className="bb-social-square-tile-img" />
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
          </article>
        );
      })}
    </div>
  );
}
