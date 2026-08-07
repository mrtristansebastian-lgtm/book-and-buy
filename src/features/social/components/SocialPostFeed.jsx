import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EditableImage, EditableText } from '../../website/components/editable';
import { getSocialPostKind } from '../utils/socialPostType';

function FeedMedia({ post, editMode, onUpdateSocialPost }) {
  const kind = getSocialPostKind(post);

  if (kind === 'text') {
    return (
      <div className="bb-social-feed-media bb-social-feed-media--text">
        {post.title ? (
          <EditableText
            as="p"
            className="bb-social-feed-text-title"
            editMode={editMode}
            value={post.title || ''}
            placeholder="Title (optional)"
            onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
          />
        ) : editMode ? (
          <EditableText
            as="p"
            className="bb-social-feed-text-title"
            editMode
            value=""
            placeholder="Title (optional)"
            onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
          />
        ) : null}
        <EditableText
          as="p"
          className="bb-social-feed-text-body"
          editMode={editMode}
          multiline
          value={post.caption || ''}
          placeholder="What’s happening?"
          onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
        />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="bb-social-feed-media bb-social-feed-media--video">
        {post.mediaUrl ? (
          <video
            className="bb-social-feed-video"
            src={post.mediaUrl}
            poster={post.posterUrl || undefined}
            controls
            playsInline
          />
        ) : post.posterUrl ? (
          <img src={post.posterUrl} alt="" className="bb-social-feed-media-img" />
        ) : (
          <div className="bb-social-feed-media-empty">No video</div>
        )}
        {editMode ? (
          <div className="bb-social-feed-video-edit">
            <EditableImage
              editMode
              src={post.posterUrl || ''}
              className="bb-social-feed-poster-edit"
              imgClassName="bb-social-feed-media-img"
              storageFolder="social"
              placeholderLabel="Poster"
              onChange={(url) =>
                onUpdateSocialPost?.(post.id, { posterUrl: url, type: 'video' })
              }
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (editMode) {
    return (
      <EditableImage
        editMode
        src={post.mediaUrl || ''}
        className="bb-social-feed-media"
        imgClassName="bb-social-feed-media-img"
        storageFolder="social"
        placeholderLabel="Add photo"
        onChange={(url) => onUpdateSocialPost?.(post.id, { mediaUrl: url, type: 'image' })}
      />
    );
  }

  return (
    <div className="bb-social-feed-media">
      {post.mediaUrl ? (
        <img src={post.mediaUrl} alt="" className="bb-social-feed-media-img" />
      ) : (
        <div className="bb-social-feed-media-empty">No photo</div>
      )}
    </div>
  );
}

export function SocialPostFeed({
  posts = [],
  initialPostId = '',
  brandName = '',
  slug = '',
  logoUrl = '',
  editMode = false,
  onBack,
  onUpdateSocialPost
}) {
  const username = String(slug || '')
    .trim()
    .replace(/^@/, '');
  const initial = String(brandName || username || 'B')
    .trim()
    .charAt(0)
    .toUpperCase();
  const targetRef = useRef(null);

  useEffect(() => {
    if (!initialPostId || !targetRef.current) return;
    targetRef.current.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [initialPostId, posts]);

  const feedKind = posts[0] ? getSocialPostKind(posts[0]) : 'image';
  const backLabel =
    feedKind === 'video' ? 'Videos' : feedKind === 'text' ? 'Text' : 'Posts';

  return (
    <div className="bb-social-feed">
      <div className="bb-social-feed-toolbar">
        <button type="button" className="bb-social-feed-back" onClick={onBack} aria-label="Back to profile">
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>{backLabel}</span>
        </button>
      </div>

      <div className="bb-social-feed-list">
        {posts.map((post) => {
          const isTarget = post.id === initialPostId;
          const kind = getSocialPostKind(post);
          const isText = kind === 'text';
          return (
            <article
              key={post.id}
              ref={isTarget ? targetRef : null}
              className={`bb-social-feed-post ${isText ? 'is-text' : ''}`}
              id={`social-post-${post.id}`}
            >
              <header className="bb-social-feed-post-head">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="bb-social-feed-avatar" />
                ) : (
                  <span className="bb-social-feed-avatar bb-social-feed-avatar--fallback" aria-hidden="true">
                    {initial}
                  </span>
                )}
                <span className="bb-social-feed-user">@{username || 'business'}</span>
                {editMode && post.published === false ? (
                  <span className="bb-edit-section-badge bb-social-draft-badge">Draft</span>
                ) : null}
              </header>

              <FeedMedia
                post={post}
                editMode={editMode}
                onUpdateSocialPost={onUpdateSocialPost}
              />

              {!isText ? (
                <div className="bb-social-feed-caption-row">
                  <div className="bb-social-feed-caption">
                    <strong>@{username || 'business'}</strong>{' '}
                    {editMode ? (
                      <EditableText
                        as="span"
                        className="bb-social-feed-caption-edit"
                        editMode
                        multiline
                        value={post.caption || ''}
                        placeholder="Write a caption…"
                        onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
                      />
                    ) : (
                      post.caption || ''
                    )}
                  </div>
                  {editMode ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, { published: post.published === false })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                </div>
              ) : editMode ? (
                <button
                  type="button"
                  className="bb-ghost-btn py-1 px-2.5 text-xs justify-self-start"
                  onClick={() =>
                    onUpdateSocialPost?.(post.id, { published: post.published === false })
                  }
                >
                  {post.published !== false ? 'Unpublish' : 'Publish'}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
