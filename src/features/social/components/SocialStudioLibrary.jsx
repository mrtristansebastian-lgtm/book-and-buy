import { useMemo, useState } from 'react';
import { getSocialPostKind } from '../utils/socialPostType';
import { SocialPostsGrid } from './SocialPostsGrid';
import { SocialPostLightbox } from './SocialPostLightbox';
import { SocialVideosPanel } from './SocialVideosPanel';
import { SocialTextTimeline } from './SocialTextTimeline';

/**
 * Studio library — same visual surfaces as the live Business Blog.
 */
export function SocialStudioLibrary({
  tab,
  posts,
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  const kind = tab === 'videos' ? 'video' : tab === 'text' ? 'text' : 'image';
  const items = useMemo(
    () => posts.filter((post) => getSocialPostKind(post) === kind),
    [posts, kind]
  );
  const label = tab === 'videos' ? 'Videos' : tab === 'text' ? 'Articles' : 'Posts';
  const [lightboxId, setLightboxId] = useState('');

  const liveCount = items.filter((item) => item.published !== false).length;
  const draftCount = items.filter((item) => item.published === false).length;

  return (
    <section className="bb-social-library">
      <header className="bb-social-library-head">
        <div className="bb-social-library-head-copy">
          <p className="bb-social-library-eyebrow">Live preview</p>
          <h2 className="bb-social-library-title">Your {label.toLowerCase()}</h2>
        </div>
        {items.length ? (
          <p className="bb-social-library-meta">
            {liveCount} live · {draftCount} draft{draftCount === 1 ? '' : 's'}
          </p>
        ) : null}
      </header>

      <div className="bb-social-library-surface">
        {kind === 'image' ? (
          <>
            <SocialPostsGrid
              posts={items}
              editMode
              onUpdateSocialPost={onUpdateSocialPost}
              onRemoveSocialPost={onRemoveSocialPost}
              onOpenPost={setLightboxId}
              emptyLabel="Nothing here yet — publish a photo above."
            />
            {lightboxId ? (
              <SocialPostLightbox
                posts={items}
                activeId={lightboxId}
                editMode
                onClose={() => setLightboxId('')}
                onChangeActive={setLightboxId}
                onUpdateSocialPost={onUpdateSocialPost}
              />
            ) : null}
          </>
        ) : null}

        {kind === 'video' ? (
          <SocialVideosPanel
            posts={items}
            editMode
            onUpdateSocialPost={onUpdateSocialPost}
            onRemoveSocialPost={onRemoveSocialPost}
          />
        ) : null}

        {kind === 'text' ? (
          <SocialTextTimeline
            posts={items}
            editMode
            onUpdateSocialPost={onUpdateSocialPost}
            onRemoveSocialPost={onRemoveSocialPost}
          />
        ) : null}
      </div>
    </section>
  );
}
