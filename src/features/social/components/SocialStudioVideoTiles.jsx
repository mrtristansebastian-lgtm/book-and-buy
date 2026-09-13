import { Pencil } from 'lucide-react';
import { formatPostStamp, formatSocialTime } from '../utils/socialPostType';

/**
 * Studio video library — tiles that open the shared composer.
 */
export function SocialStudioVideoTiles({ posts, onEditPost }) {
  return (
    <div className="bb-social-video-tiles" role="list">
      {posts.map((post) => {
        const thumb = post.posterUrl || post.mediaUrl || '';
        return (
          <article
            key={post.id}
            className="bb-social-video-tile"
            role="listitem"
          >
            <button
              type="button"
              className="bb-social-video-tile-hit"
              onClick={() => onEditPost?.(post)}
              aria-label={`Edit ${post.title || 'video'}`}
            >
              <div className="bb-social-video-tile-thumb">
                {thumb ? (
                  <img src={thumb} alt="" />
                ) : (
                  <span className="bb-social-video-tile-empty">No thumb</span>
                )}
                {post.duration ? (
                  <span className="bb-social-video-tile-duration">
                    {post.duration}
                  </span>
                ) : null}
              </div>
              <div className="bb-social-video-tile-body">
                <div className="bb-social-video-tile-meta">
                  <span className="bb-blog-status-pill is-live">Live</span>
                  <span className="bb-social-video-tile-rel">
                    {formatSocialTime(post.createdAt)}
                  </span>
                </div>
                <h3 className="bb-social-video-tile-title">
                  {post.title || 'Untitled video'}
                </h3>
                {post.caption ? (
                  <p className="bb-social-video-tile-caption">{post.caption}</p>
                ) : null}
                <p className="bb-social-video-tile-date">
                  {formatPostStamp(post.createdAt)}
                </p>
              </div>
            </button>
            <button
              type="button"
              className="bb-ghost-btn bb-social-video-tile-edit"
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
