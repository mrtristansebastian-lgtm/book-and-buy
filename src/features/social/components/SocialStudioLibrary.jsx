import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialPostsGrid } from './SocialPostsGrid';
import { SocialPostLightbox } from './SocialPostLightbox';
import { SocialProfileTabs } from './SocialProfileTabs';
import { SocialTextTimeline } from './SocialTextTimeline';
import { SocialVideosPanel } from './SocialVideosPanel';

/**
 * Studio library — mirrors the live public Content layouts with Edit on each item.
 */
export function SocialStudioLibrary({
  tab,
  onTabChange,
  posts,
  onEditPost,
  onCreate
}) {
  const { workspace } = useWorkspace();
  const website = workspace.website || {};
  const [lightboxId, setLightboxId] = useState('');

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

  const lightboxOpen =
    tab === 'posts' && Boolean(lightboxId) && items.some((post) => post.id === lightboxId);

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

      <div className="bb-social-library-surface bb-social-library-surface--live">
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
          <SocialPostsGrid
            posts={items}
            onOpenPost={setLightboxId}
            onEditPost={onEditPost}
            emptyLabel={emptyCopy}
          />
        ) : kind === 'video' ? (
          <SocialVideosPanel
            posts={items}
            showOwnerStats
            brandName={workspace.brandName || workspace.name || ''}
            logoUrl={website.logoUrl || ''}
            onEditPost={onEditPost}
          />
        ) : (
          <SocialTextTimeline posts={items} onEditPost={onEditPost} />
        )}
      </div>

      {lightboxOpen ? (
        <SocialPostLightbox
          posts={items}
          activeId={lightboxId}
          onClose={() => setLightboxId('')}
          onChangeActive={setLightboxId}
        />
      ) : null}
    </section>
  );
}
