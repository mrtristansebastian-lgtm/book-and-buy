import { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { BbVideoPlayer } from './BbVideoPlayer';

function VideoWatchLightbox({
  post,
  posts = [],
  editMode = false,
  onClose,
  onChangeActive,
  onUpdateSocialPost
}) {
  const index = Math.max(
    0,
    posts.findIndex((item) => item.id === post?.id)
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft' && index > 0) onChangeActive?.(posts[index - 1].id);
      if (event.key === 'ArrowRight' && index < posts.length - 1) {
        onChangeActive?.(posts[index + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, posts, onClose, onChangeActive]);

  if (!post) return null;

  return (
    <div
      className="bb-social-lightbox bb-social-lightbox--video"
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
      onClick={onClose}
    >
      <div className="bb-social-lightbox-shell" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="bb-social-lightbox-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.2} />
        </button>

        <div className="bb-social-lightbox-stage bb-social-lightbox-stage--video">
          <div className="bb-social-lightbox-video-frame">
            {post.mediaUrl ? (
              <BbVideoPlayer
                key={post.id}
                className="bb-social-video-player"
                src={post.mediaUrl}
                poster={post.posterUrl || ''}
                title={post.title || 'Video'}
              />
            ) : (
              <div className="bb-social-video-player bb-social-video-player--empty">
                Video unavailable
              </div>
            )}
          </div>
        </div>

        <div className="bb-social-lightbox-copy">
          <p className="bb-social-lightbox-count">
            {index + 1} / {posts.length}
            {post.duration ? ` · ${post.duration}` : ''}
          </p>
          <EditableText
            as="h2"
            className="bb-social-lightbox-title"
            editMode={editMode}
            value={post.title || ''}
            placeholder="Title"
            onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
          />
          <span className="bb-social-lightbox-mark bb-public-native-fill" aria-hidden="true" />
          <EditableText
            as="p"
            className="bb-social-lightbox-caption"
            editMode={editMode}
            multiline
            value={post.caption || ''}
            placeholder="Description"
            onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Public videos: equal 16:9 YouTube-style tile grid + watch lightbox.
 */
export function SocialVideosPanel({
  posts,
  editMode = false,
  showPublishToggle = true,
  onUpdateSocialPost,
  onRemoveSocialPost,
  initialActiveId = '',
  onOpenVideo,
  onCloseVideo
}) {
  const [watchId, setWatchId] = useState(initialActiveId || '');

  useEffect(() => {
    if (initialActiveId && posts.some((post) => post.id === initialActiveId)) {
      setWatchId(initialActiveId);
    }
  }, [initialActiveId, posts]);

  if (!posts.length) {
    return (
      <div className="bb-public-empty">
        {editMode ? 'Add a video to open the gallery.' : 'No videos published yet.'}
      </div>
    );
  }

  const watching = posts.find((post) => post.id === watchId) || null;

  const openWatch = (id) => {
    setWatchId(id);
    onOpenVideo?.(id);
  };

  const closeWatch = () => {
    setWatchId('');
    onCloseVideo?.();
  };

  return (
    <>
      <div className="bb-social-video-grid" role="list">
        {posts.map((post) => {
          const title = String(post.title || '').trim() || 'Untitled video';
          const thumb = post.posterUrl || '';

          return (
            <article key={post.id} className="bb-social-video-tile-card" role="listitem">
              {editMode && showPublishToggle && post.published === false ? (
                <div className="bb-social-post-card-meta">
                  <span className="bb-edit-section-badge">Draft</span>
                </div>
              ) : null}

              <button
                type="button"
                className="bb-social-video-tile-hit"
                onClick={() => openWatch(post.id)}
                aria-label={`Play ${title}`}
              >
                <span className="bb-social-video-tile-media">
                  {thumb ? <img src={thumb} alt="" /> : <span className="bb-social-video-tile-empty" />}
                  <span className="bb-social-video-tile-play" aria-hidden="true">
                    <Play size={22} strokeWidth={2.4} fill="currentColor" />
                  </span>
                  {post.duration ? (
                    <span className="bb-social-video-tile-duration">{post.duration}</span>
                  ) : null}
                </span>
                <span className="bb-social-video-tile-copy">
                  <strong className="bb-social-video-tile-title">{title}</strong>
                  {post.caption ? (
                    <span className="bb-social-video-tile-caption">{post.caption}</span>
                  ) : null}
                </span>
              </button>

              {editMode ? (
                <div className="bb-social-edit-actions">
                  {showPublishToggle ? (
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
                  {onRemoveSocialPost ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() => onRemoveSocialPost(post.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {watching ? (
        <VideoWatchLightbox
          post={watching}
          posts={posts}
          editMode={editMode}
          onClose={closeWatch}
          onChangeActive={openWatch}
          onUpdateSocialPost={onUpdateSocialPost}
        />
      ) : null}
    </>
  );
}
