import { Pencil, Type } from 'lucide-react';
import { formatPostStamp, formatSocialTime } from '../utils/socialPostType';

/**
 * Studio text-update library — tiles that open the shared composer.
 */
export function SocialStudioArticleTiles({ posts, onEditPost }) {
  return (
    <div className="bb-social-article-tiles" role="list">
      {posts.map((post) => (
        <article
          key={post.id}
          className="bb-social-article-tile"
          role="listitem"
        >
          <button
            type="button"
            className="bb-social-article-tile-hit"
            onClick={() => onEditPost?.(post)}
            aria-label={`Edit ${post.title || 'text update'}`}
          >
            <div className="bb-social-article-tile-thumb" aria-hidden="true">
              <Type size={16} strokeWidth={2.2} />
            </div>
            <div className="bb-social-article-tile-body">
              <div className="bb-social-article-tile-meta">
                <span className="bb-blog-status-pill is-live">Live</span>
                <span className="bb-social-article-tile-rel">
                  {formatSocialTime(post.createdAt)}
                </span>
              </div>
              <h3 className="bb-social-article-tile-title">
                {post.title || 'Untitled update'}
              </h3>
              {post.caption ? (
                <p className="bb-social-article-tile-caption">{post.caption}</p>
              ) : null}
              <p className="bb-social-article-tile-date">
                {formatPostStamp(post.createdAt)}
              </p>
            </div>
          </button>
          <button
            type="button"
            className="bb-ghost-btn bb-social-article-tile-edit"
            onClick={() => onEditPost?.(post)}
          >
            <Pencil size={14} />
            Edit
          </button>
        </article>
      ))}
    </div>
  );
}
