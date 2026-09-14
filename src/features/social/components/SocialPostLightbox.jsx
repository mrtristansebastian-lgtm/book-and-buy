import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp, getPostMediaItems } from '../utils/socialPostType';

function handleFromSlug(slug = '', brandName = '') {
  const fromSlug = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '');
  if (fromSlug) return fromSlug;
  return String(brandName || 'business')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '')
    .slice(0, 24) || 'business';
}

/**
 * Full media lightbox — images + short clips in a carousel,
 * with an Instagram-style profile + caption footer.
 */
export function SocialPostLightbox({
  posts = [],
  activeId = '',
  editMode = false,
  brandName = '',
  logoUrl = '',
  slug = '',
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

  const displayName = String(brandName || '').trim() || 'Business';
  const handle = handleFromSlug(slug, displayName);
  const initial = displayName.charAt(0).toUpperCase() || 'B';

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
                key={`${post.id}-${mediaIndex}-${active.trimStart || 0}-${active.trimEnd || 0}`}
                className="bb-social-lightbox-video"
                src={active.url}
                poster={active.posterUrl || undefined}
                controls
                playsInline
                style={
                  Number(active.aspectRatio) > 0
                    ? { aspectRatio: String(active.aspectRatio) }
                    : undefined
                }
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  if (
                    !(Number(active.aspectRatio) > 0) &&
                    video.videoWidth > 0 &&
                    video.videoHeight > 0
                  ) {
                    video.style.aspectRatio = String(video.videoWidth / video.videoHeight);
                  }
                  const start = Number(active.trimStart) || 0;
                  if (start > 0.05) video.currentTime = start;
                }}
                onTimeUpdate={(event) => {
                  const video = event.currentTarget;
                  const start = Number(active.trimStart) || 0;
                  const end =
                    Number(active.trimEnd) > 0
                      ? Number(active.trimEnd)
                      : Number(active.sourceDurationSeconds) || 0;
                  if (end > start && video.currentTime >= end - 0.05) {
                    video.pause();
                    video.currentTime = start;
                  }
                }}
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
          <header className="bb-social-lightbox-author">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="bb-social-lightbox-avatar" />
            ) : (
              <span className="bb-social-lightbox-avatar bb-social-lightbox-avatar--fallback" aria-hidden="true">
                {initial}
              </span>
            )}
            <div className="bb-social-lightbox-author-copy">
              <p className="bb-social-lightbox-brand">{displayName}</p>
              <p className="bb-social-lightbox-handle-row">
                <span className="bb-social-lightbox-handle">@{handle}</span>
                {stamp ? (
                  <>
                    <span className="bb-social-lightbox-dot-sep" aria-hidden="true">
                      ·
                    </span>
                    <time
                      className="bb-social-lightbox-stamp"
                      dateTime={new Date(post.createdAt).toISOString()}
                    >
                      {stamp}
                    </time>
                  </>
                ) : null}
              </p>
            </div>
            {multi ? (
              <p className="bb-social-lightbox-count">
                {mediaIndex + 1} / {mediaItems.length}
              </p>
            ) : (
              <p className="bb-social-lightbox-count">
                {index + 1} / {posts.length}
              </p>
            )}
          </header>

          {(post.title || editMode) ? (
            <EditableText
              as="h2"
              className="bb-social-lightbox-title"
              editMode={editMode}
              value={post.title || ''}
              placeholder="Add a title"
              onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
            />
          ) : null}

          <div className="bb-social-lightbox-caption-block">
            <EditableText
              as="span"
              className="bb-social-lightbox-caption"
              editMode={editMode}
              multiline
              value={post.caption || ''}
              placeholder="Write a caption…"
              onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
