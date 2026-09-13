import { Pencil } from 'lucide-react';
import { formatPostStamp, formatSocialTime } from '../utils/socialPostType';

/**
 * Studio posts library — compact tiles that open the shared composer.
 */
export function SocialStudioPostTiles({ posts, onEditPost }) {
  return (
    <div className="bb-social-post-tiles" role="list">
      {posts.map((post) => {
        const src = post.mediaUrl || '';
        return (
          <article
            key={post.id}
            className="bb-social-post-tile"
            role="listitem"
          >
            <button
              type="button"
              className="bb-social-post-tile-hit"
              onClick={() => onEditPost?.(post)}
              aria-label={`Edit ${post.title || 'post'}`}
            >
              <div className="bb-social-post-tile-thumb">
                {src ? (
                  <img src={src} alt="" />
                ) : (
                  <span className="bb-social-post-tile-empty">No image</span>
                )}
              </div>
              <div className="bb-social-post-tile-body">
                <div className="bb-social-post-tile-meta">
                  <span className="bb-blog-status-pill is-live">Live</span>
                  <span className="bb-social-post-tile-rel">
                    {formatSocialTime(post.createdAt)}
                  </span>
                </div>
                <h3 className="bb-social-post-tile-title">
                  {post.title || 'Untitled post'}
                </h3>
                {post.caption ? (
                  <p className="bb-social-post-tile-caption">{post.caption}</p>
                ) : null}
                <p className="bb-social-post-tile-date">
                  {formatPostStamp(post.createdAt)}
                </p>
              </div>
            </button>
            <button
              type="button"
              className="bb-ghost-btn bb-social-post-tile-edit"
              onClick={() => onEditPost?.(post)}
            >
              <Pencil size={14} />
              Edit
            </button>
          </article>
        );
      })}
    </div>
  );
}
