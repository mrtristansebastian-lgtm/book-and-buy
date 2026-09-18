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
  const latestByBusiness = new Map();
  posts.forEach((post) => {
    const key = post._slug || post._brandName || post.id;
    if (!latestByBusiness.has(key)) latestByBusiness.set(key, post);
  });

  return (
    <div className={`bb-explore-content-list bb-explore-content-list--${kind}`}>
      {[...latestByBusiness.values()].map((post) => {
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
            <button type="button" className="bb-explore-content-preview" onClick={() => onOpen?.(post)}>
              {kind === 'notes' ? (
                <span className="bb-explore-content-note">{copyFor(post)}</span>
              ) : media ? (
                <img src={media} alt="" />
              ) : (
                <BlankMedia variant="square" />
              )}
              {isFilm ? <Play className="bb-explore-content-play" size={18} fill="currentColor" /> : null}
              {kind !== 'notes' ? <span className="bb-explore-content-title">{copyFor(post)}</span> : null}
            </button>
          </article>
        );
      })}
    </div>
  );
}
