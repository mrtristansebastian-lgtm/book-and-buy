import { useMemo } from 'react';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialStudioPostTiles } from './SocialStudioPostTiles';
import { SocialStudioVideoTiles } from './SocialStudioVideoTiles';
import { SocialTextTimeline } from './SocialTextTimeline';

/**
 * Studio library — compact tiles for management (live content only).
 */
export function SocialStudioLibrary({
  tab,
  posts,
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  const kind = tab === 'videos' ? 'video' : tab === 'text' ? 'text' : 'image';

  const items = useMemo(
    () =>
      posts.filter(
        (post) => getSocialPostKind(post) === kind && post.published !== false
      ),
    [posts, kind]
  );

  const label = tab === 'videos' ? 'Videos' : tab === 'text' ? 'Articles' : 'Posts';

  return (
    <section className={`bb-social-library${items.length ? '' : ' is-empty'}`}>
      <header className="bb-social-library-head">
        <div className="bb-social-library-head-copy">
          <p className="bb-social-library-eyebrow">On your live blog</p>
          <h2 className="bb-social-library-title">{label}</h2>
        </div>
        {items.length ? (
          <p className="bb-social-library-meta">{items.length} live</p>
        ) : null}
      </header>

      <div className="bb-social-library-surface">
        {kind === 'image' ? (
          <SocialStudioPostTiles
            posts={items}
            onUpdateSocialPost={onUpdateSocialPost}
            onRemoveSocialPost={onRemoveSocialPost}
          />
        ) : null}

        {kind === 'video' ? (
          <SocialStudioVideoTiles
            posts={items}
            onUpdateSocialPost={onUpdateSocialPost}
            onRemoveSocialPost={onRemoveSocialPost}
          />
        ) : null}

        {kind === 'text' ? (
          <SocialTextTimeline
            posts={items}
            editMode
            showPublishToggle={false}
            onUpdateSocialPost={onUpdateSocialPost}
            onRemoveSocialPost={onRemoveSocialPost}
          />
        ) : null}
      </div>
    </section>
  );
}
