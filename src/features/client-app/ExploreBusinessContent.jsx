import { Play } from 'lucide-react';
import { BlankMedia } from '../../shared/ui/BlankMedia';
import { getPostMediaItems, getSocialPostKind } from '../social/utils/socialPostType';

function imageFor(post) {
  const first = getPostMediaItems(post)[0];
  return first?.kind === 'video'
    ? first.posterUrl || post.posterUrl || first.url || post.mediaUrl || ''
    : first?.url || post.posterUrl || post.mediaUrl || '';
}

function copyFor(post) {
  return String(post.title || post.caption || '').trim() || 'New from this business';
}

/** One latest matching piece of content per business keeps Explore balanced. */
export function ExploreBusinessContent({ posts = [], kind = 'posts', onOpen }) {
  const byBusiness = new Map();
  posts.forEach((post) => {
    const key = post._slug || post._brandName || post.id;
    const group = byBusiness.get(key) || [];
    group.push(post);
    byBusiness.set(key, group);
  });

  return (
    <div className={`bb-explore-content-list bb-explore-content-list--${kind}`}>
      {[...byBusiness.values()].map((businessPosts) => {
        const post = businessPosts[0];
        const media = imageFor(post);
        const postKind = getSocialPostKind(post);
        const isFilm = postKind === 'video';
        return (
          <article key={post.id} className="bb-explore-content-card">
            <button type="button" className="bb-explore-content-business" onClick={() => onOpen?.(post)}>
              <span className="bb-client-avatar is-sm" aria-hidden="true">
                {post._logoUrl ? <img src={post._logoUrl} alt="" /> : <BlankMedia variant="avatar" />}
              </span>
              <span className="bb-explore-content-identity">
                <strong>{post._brandName || 'Business'}</strong>
                <span>{post._slug ? `@${post._slug}` : 'Latest post'}</span>
              </span>
            </button>
            {kind === 'posts' ? (
              <div className="bb-explore-content-media-rail" aria-label={`Latest from ${post._brandName || 'business'}`}>
                {businessPosts.slice(0, 3).map((item) => {
                  const itemMedia = imageFor(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="bb-explore-content-image-preview"
                      onClick={() => onOpen?.(item)}
                      aria-label={copyFor(item)}
                    >
                      {itemMedia ? <img src={itemMedia} alt="" /> : <BlankMedia variant="square" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button type="button" className="bb-explore-content-preview" onClick={() => onOpen?.(post)}>
              {kind === 'notes' ? (
                <span className="bb-explore-content-note">{copyFor(post)}</span>
              ) : media ? (
                <img src={media} alt="" />
              ) : (
                <BlankMedia variant="square" />
              )}
              {isFilm ? <Play className="bb-explore-content-play" size={18} fill="currentColor" /> : null}
              {kind === 'films' ? <span className="bb-explore-content-title">{copyFor(post)}</span> : null}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
