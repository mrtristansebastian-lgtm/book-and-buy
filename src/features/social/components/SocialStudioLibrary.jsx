import { useMemo } from 'react';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialProfileTabs } from './SocialProfileTabs';
import { SocialStudioArticleTiles } from './SocialStudioArticleTiles';
import { SocialStudioPostTiles } from './SocialStudioPostTiles';
import { SocialStudioVideoTiles } from './SocialStudioVideoTiles';

/**
 * Studio library — live content with rich tiles and shared composer edit.
 */
export function SocialStudioLibrary({
  tab,
  onTabChange,
  posts,
  onEditPost,
  onCreate
}) {
  const kind = tab === 'videos' ? 'video' : tab === 'text' ? 'text' : 'image';

  const items = useMemo(
    () =>
      posts.filter(
        (post) => getSocialPostKind(post) === kind && post.published !== false
      ),
    [posts, kind]
  );

  const label =
    tab === 'videos' ? 'Videos' : tab === 'text' ? 'Text updates' : 'Posts';

  const emptyCopy =
    tab === 'videos'
      ? 'Nothing live yet — publish a video above.'
      : tab === 'text'
        ? 'Nothing live yet — publish a text update above.'
        : 'Nothing live yet — publish a photo above.';

  const createLabel =
    tab === 'videos'
      ? 'New video'
      : tab === 'text'
        ? 'New text update'
        : 'New post';

  return (
    <section className={`bb-social-library${items.length ? '' : ' is-empty'}`}>
      <header className="bb-social-library-head">
        <div className="bb-social-library-head-copy">
          <p className="bb-social-library-eyebrow">On your live Content page</p>
          <h2 className="bb-social-library-title">{label}</h2>
        </div>
        {items.length ? (
          <p className="bb-social-library-meta">{items.length} live</p>
        ) : null}
      </header>

      <div className="bb-social-library-tabs">
        <SocialProfileTabs value={tab} onChange={onTabChange} />
      </div>

      <div className="bb-social-library-surface">
        {!items.length ? (
          <div className="bb-social-library-empty">
            <p className="bb-social-library-empty-copy">{emptyCopy}</p>
            {onCreate ? (
              <button
                type="button"
                className="bb-primary-btn"
                onClick={() => onCreate(tab)}
              >
                {createLabel}
              </button>
            ) : null}
          </div>
        ) : kind === 'image' ? (
          <SocialStudioPostTiles posts={items} onEditPost={onEditPost} />
        ) : kind === 'video' ? (
          <SocialStudioVideoTiles posts={items} onEditPost={onEditPost} />
        ) : (
          <SocialStudioArticleTiles posts={items} onEditPost={onEditPost} />
        )}
      </div>
    </section>
  );
}
