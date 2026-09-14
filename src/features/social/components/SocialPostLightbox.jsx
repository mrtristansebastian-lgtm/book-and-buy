import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp, getPostMediaItems } from '../utils/socialPostType';

/**
 * Full media lightbox — images + short clips in a carousel.
 */
export function SocialPostLightbox({
  posts = [],
  activeId = '',
  editMode = false,
  onClose,
  onChangeActive,
  onUpdateSocialPost
}) {
  const index = Math.max(
    0,
    posts.findIndex((post) => post.id === activeId)
  );
  const post = posts[index] || null;
  const dialogRef = useRef(null);
  const stamp = post ? formatNoteStamp(post.createdAt) : '';
  const mediaItems = getPostMediaItems(post);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    setMediaIndex(0);
  }, [activeId]);

  useEffect(() => {
    if (mediaIndex >= mediaItems.length) {
      setMediaIndex(Math.max(0, mediaItems.length - 1));
    }
  }, [mediaItems.length, mediaIndex]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key === 'ArrowLeft') {
        if (mediaIndex > 0) {
          setMediaIndex((value) => value - 1);
          return;
        }
        if (index > 0) onChangeActive?.(posts[index - 1].id);
        return;
      }
      if (event.key === 'ArrowRight') {
        if (mediaIndex < mediaItems.length - 1) {
          setMediaIndex((value) => value + 1);
          return;
        }
        if (index < posts.length - 1) onChangeActive?.(posts[index + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, posts, onClose, onChangeActive, mediaIndex, mediaItems.length]);

  useEffect(() => {
    dialogRef.current?.focus?.();
  }, [activeId]);

  if (!post) return null;

  const hasPrevPost = index > 0;
  const hasNextPost = index < posts.length - 1;
  const hasPrevMedia = mediaIndex > 0;
  const hasNextMedia = mediaIndex < mediaItems.length - 1;
  const active = mediaItems[mediaIndex] || null;
  const multi = mediaItems.length > 1;

  return (
    <div
      className="bb-social-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Post viewer"
      ref={dialogRef}
      tabIndex={-1}
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

        <div className="bb-social-lightbox-stage">
          {hasPrevPost ? (
            <button
              type="button"
              className="bb-social-lightbox-nav bb-social-lightbox-nav--prev"
              onClick={() => onChangeActive?.(posts[index - 1].id)}
              aria-label="Previous post"
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
          ) : null}

          <div className="bb-social-lightbox-frame">
            {active?.kind === 'video' && active.url ? (
              <video
                key={`${post.id}-${mediaIndex}`}
                className="bb-social-lightbox-video"
                src={active.url}
                poster={active.posterUrl || undefined}
                controls
                playsInline
              />
            ) : active?.url ? (
              <img src={active.url} alt={post.title || post.caption || ''} />
            ) : (
              <div className="bb-social-lightbox-empty">No media</div>
            )}

            {multi ? (
              <>
                {hasPrevMedia ? (
                  <button
                    type="button"
                    className="bb-social-lightbox-media-nav bb-social-lightbox-media-nav--prev"
                    onClick={() => setMediaIndex((value) => value - 1)}
                    aria-label="Previous item"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>
                ) : null}
                {hasNextMedia ? (
                  <button
                    type="button"
                    className="bb-social-lightbox-media-nav bb-social-lightbox-media-nav--next"
                    onClick={() => setMediaIndex((value) => value + 1)}
                    aria-label="Next item"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                ) : null}
                <div className="bb-social-lightbox-dots" aria-hidden="true">
                  {mediaItems.map((item, i) => (
                    <span
                      key={`${item.url}-${i}`}
                      className={`bb-social-lightbox-dot${i === mediaIndex ? ' is-active' : ''}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {hasNextPost ? (
            <button
              type="button"
              className="bb-social-lightbox-nav bb-social-lightbox-nav--next"
              onClick={() => onChangeActive?.(posts[index + 1].id)}
              aria-label="Next post"
            >
              <ChevronRight size={22} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>

        <div className="bb-social-lightbox-copy">
          <div className="bb-social-lightbox-meta">
            {stamp ? (
              <time
                className="bb-social-lightbox-stamp"
                dateTime={new Date(post.createdAt).toISOString()}
              >
                {stamp}
              </time>
            ) : null}
            <p className="bb-social-lightbox-count">
              {multi
                ? `${mediaIndex + 1} / ${mediaItems.length} · Post ${index + 1} / ${posts.length}`
                : `${index + 1} / ${posts.length}`}
            </p>
          </div>
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
            placeholder="Caption"
            onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
          />
        </div>
      </div>
    </div>
  );
}
