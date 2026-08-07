import { formatSocialTime, getSocialPostKind } from '../utils/socialPostType';

export function SocialStudioLibrary({
  tab,
  posts,
  brandName = 'Business',
  onUpdateSocialPost,
  onRemoveSocialPost
}) {
  const kind = tab === 'videos' ? 'video' : tab === 'text' ? 'text' : 'image';
  const items = posts.filter((post) => getSocialPostKind(post) === kind);
  const label = tab === 'videos' ? 'Videos' : tab === 'text' ? 'Text updates' : 'Posts';

  if (!items.length) {
    return (
      <section className="bb-social-library">
        <header className="bb-social-library-head">
          <h2 className="bb-page-title text-lg m-0">Your {label.toLowerCase()}</h2>
        </header>
        <div className="bb-public-empty">Nothing here yet — create one above.</div>
      </section>
    );
  }

  return (
    <section className="bb-social-library">
      <header className="bb-social-library-head">
        <h2 className="bb-page-title text-lg m-0">Your {label.toLowerCase()}</h2>
        <p className="bb-muted m-0 text-sm">
          {items.filter((item) => item.published !== false).length} live ·{' '}
          {items.filter((item) => item.published === false).length} drafts
        </p>
      </header>

      {kind === 'image' ? (
        <div className="bb-social-library-grid">
          {items.map((post) => (
            <article key={post.id} className="bb-social-library-cell">
              <div className="bb-social-library-media">
                {post.mediaUrl ? <img src={post.mediaUrl} alt="" /> : null}
                {post.published === false ? (
                  <span className="bb-edit-section-badge bb-social-library-badge">Draft</span>
                ) : null}
              </div>
              <p className="bb-social-library-caption">{post.caption || 'Untitled post'}</p>
              <LibraryActions
                post={post}
                onUpdateSocialPost={onUpdateSocialPost}
                onRemoveSocialPost={onRemoveSocialPost}
              />
            </article>
          ))}
        </div>
      ) : null}

      {kind === 'video' ? (
        <div className="bb-social-library-video-list">
          {items.map((post) => (
            <article key={post.id} className="bb-social-library-video-row">
              <div className="bb-social-video-thumb">
                {post.posterUrl || post.mediaUrl ? (
                  <img src={post.posterUrl || post.mediaUrl} alt="" />
                ) : null}
                {post.duration ? (
                  <span className="bb-social-video-duration">{post.duration}</span>
                ) : null}
              </div>
              <div className="bb-social-library-video-copy">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{post.title || 'Untitled video'}</strong>
                  {post.published === false ? (
                    <span className="bb-edit-section-badge">Draft</span>
                  ) : null}
                </div>
                <p className="bb-muted m-0 text-sm">{post.caption || ''}</p>
                <LibraryActions
                  post={post}
                  onUpdateSocialPost={onUpdateSocialPost}
                  onRemoveSocialPost={onRemoveSocialPost}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {kind === 'text' ? (
        <div className="bb-social-library-text-stream">
          {items.map((post) => (
            <article key={post.id} className="bb-social-text-item">
              <div className="bb-social-text-avatar" aria-hidden="true">
                {String(brandName || 'B')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="bb-social-text-body">
                <header className="bb-social-text-head">
                  <strong>{brandName}</strong>
                  <span className="bb-social-text-time">{formatSocialTime(post.createdAt)}</span>
                  {post.published === false ? (
                    <span className="bb-edit-section-badge">Draft</span>
                  ) : null}
                </header>
                {post.title ? <p className="bb-social-text-kicker">{post.title}</p> : null}
                <p className="bb-social-text-caption">{post.caption}</p>
                <LibraryActions
                  post={post}
                  onUpdateSocialPost={onUpdateSocialPost}
                  onRemoveSocialPost={onRemoveSocialPost}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LibraryActions({ post, onUpdateSocialPost, onRemoveSocialPost }) {
  return (
    <div className="bb-social-library-actions">
      <button
        type="button"
        className="bb-ghost-btn py-1 px-2.5 text-xs"
        onClick={() =>
          onUpdateSocialPost?.(post.id, { published: post.published === false })
        }
      >
        {post.published !== false ? 'Unpublish' : 'Publish'}
      </button>
      <button
        type="button"
        className="bb-ghost-btn py-1 px-2.5 text-xs"
        onClick={() => onRemoveSocialPost?.(post.id)}
      >
        Delete
      </button>
    </div>
  );
}
