import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Play } from 'lucide-react';
import { EditableImage, EditableText } from '../../website/components/editable';
import {
  formatNoteStamp,
  getPostMediaItems,
  getSocialPostKind
} from '../utils/socialPostType';
import { BbVideoPlayer } from './BbVideoPlayer';

function isProbablyImageUrl(url) {
  const value = String(url || '').toLowerCase();
  if (!value) return false;
  if (value.startsWith('data:image/')) return true;
  return /\.(avif|gif|heic|jpe?g|png|webp)(\?|#|$)/i.test(value);
}

function isProbablyVideoUrl(url) {
  const value = String(url || '').toLowerCase();
  if (!value) return false;
  if (value.startsWith('data:video/')) return true;
  return /\.(m4v|mov|mp4|ogv|webm)(\?|#|$)/i.test(value);
}

/** Prefer explicit kind, but never render an obvious image URL as <video>. */
function resolveSlideKind(item) {
  if (!item) return 'image';
  const url = String(item.url || '');
  if (item.kind === 'video') {
    if (isProbablyImageUrl(url) && !isProbablyVideoUrl(url)) return 'image';
    return 'video';
  }
  if (isProbablyVideoUrl(url) && !isProbablyImageUrl(url)) return 'video';
  return 'image';
}

function FeedCarousel({ items = [] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const active = items[index] || null;
  const multi = items.length > 1;
  const slideKind = resolveSlideKind(active);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [items]);

  useEffect(() => {
    setPlaying(false);
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [index]);

  if (!active?.url) {
    return <div className="bb-social-feed-media-empty">No media</div>;
  }

  const start = Number(active.trimStart) || 0;
  const end =
    Number(active.trimEnd) > 0
      ? Number(active.trimEnd)
      : Number(active.sourceDurationSeconds) || 0;
  const poster = String(active.posterUrl || '').trim();
  const stillUrl = poster || (slideKind === 'image' ? active.url : '');

  return (
    <div className="bb-social-feed-carousel">
      <div
        className="bb-social-feed-media"
        style={
          Number(active.aspectRatio) > 0
            ? { aspectRatio: String(active.aspectRatio) }
            : undefined
        }
      >
        {slideKind === 'video' ? (
          playing ? (
            <video
              key={`video-${index}-${active.url}`}
              ref={videoRef}
              className="bb-social-feed-media-img"
              src={active.url}
              poster={poster || undefined}
              controls
              playsInline
              muted
              autoPlay
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (start > 0.05) video.currentTime = start;
                if (!(Number(active.aspectRatio) > 0) && video.videoWidth && video.videoHeight) {
                  video.parentElement.style.aspectRatio = String(
                    video.videoWidth / video.videoHeight
                  );
                }
              }}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (end > start && video.currentTime >= end - 0.05) {
                  video.pause();
                  video.currentTime = start;
                  setPlaying(false);
                }
              }}
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <button
              type="button"
              key={`still-${index}-${active.url}`}
              className="bb-social-feed-video-still"
              onClick={() => setPlaying(true)}
              aria-label="Play clip"
            >
              {stillUrl ? (
                <img src={stillUrl} alt="" className="bb-social-feed-media-img" />
              ) : (
                <video
                  className="bb-social-feed-media-img"
                  src={active.url}
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              <span className="bb-social-feed-video-play" aria-hidden="true">
                <Play size={22} fill="currentColor" strokeWidth={0} />
              </span>
            </button>
          )
        ) : (
          <img
            key={`image-${index}-${active.url}`}
            src={active.url}
            alt=""
            className="bb-social-feed-media-img"
          />
        )}

        {multi ? (
          <>
            {index > 0 ? (
              <button
                type="button"
                className="bb-social-feed-carousel-nav bb-social-feed-carousel-nav--prev"
                aria-label="Previous"
                onClick={() => setIndex((value) => value - 1)}
              >
                <ChevronLeft size={18} strokeWidth={2.2} />
              </button>
            ) : null}
            {index < items.length - 1 ? (
              <button
                type="button"
                className="bb-social-feed-carousel-nav bb-social-feed-carousel-nav--next"
                aria-label="Next"
                onClick={() => setIndex((value) => value + 1)}
              >
                <ChevronRight size={18} strokeWidth={2.2} />
              </button>
            ) : null}
            <div className="bb-social-feed-carousel-dots" aria-hidden="true">
              {items.map((item, i) => (
                <span
                  key={`${item.url}-${i}`}
                  className={`bb-social-feed-carousel-dot${i === index ? ' is-active' : ''}`}
                />
              ))}
            </div>
            <span className="bb-social-feed-carousel-count">
              {index + 1} / {items.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FeedMedia({ post, editMode, onUpdateSocialPost }) {
  const kind = getSocialPostKind(post);

  if (kind === 'text') {
    return (
      <div className="bb-social-feed-media bb-social-feed-media--text">
        {post.title || editMode ? (
          <EditableText
            as="p"
            className="bb-social-feed-text-title"
            editMode={editMode}
            value={post.title || ''}
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
          <BbVideoPlayer
            src={post.mediaUrl}
            poster={post.posterUrl || ''}
            title={post.title || 'Video'}
            aspectRatio={Number(post.aspectRatio) || 0}
            className="bb-social-feed-video"
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
              preset="videoPoster"
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

  const media = getPostMediaItems(post);
  if (editMode && media.length <= 1) {
    return (
      <EditableImage
        editMode
        src={post.mediaUrl || media[0]?.url || ''}
        className="bb-social-feed-media"
        imgClassName="bb-social-feed-media-img"
        storageFolder="social"
        preset="socialPost"
        placeholderLabel="Add photo"
        onChange={(url) => onUpdateSocialPost?.(post.id, { mediaUrl: url, type: 'image' })}
      />
    );
  }

  return <FeedCarousel items={media} />;
}

/**
 * Instagram-style scrollable posts feed — used instead of a lightbox popup.
 */
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
  const handle = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '');
  const displayName = String(brandName || '').trim() || 'Business';
  const initial = displayName.charAt(0).toUpperCase() || 'B';
  const username = handle || 'business';
  const targetRef = useRef(null);

  useEffect(() => {
    if (!initialPostId || !targetRef.current) return;
    const timer = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [initialPostId, posts]);

  const feedKind = posts[0] ? getSocialPostKind(posts[0]) : 'image';
  const backLabel =
    feedKind === 'video' ? 'Videos' : feedKind === 'text' ? 'Notes' : 'Posts';

  return (
    <div className="bb-social-feed">
      <div className="bb-social-feed-toolbar">
        <button
          type="button"
          className="bb-social-feed-back"
          onClick={onBack}
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>{backLabel}</span>
        </button>
      </div>

      <div className="bb-social-feed-list">
        {posts.map((post) => {
          const isTarget = post.id === initialPostId;
          const kind = getSocialPostKind(post);
          const isText = kind === 'text';
          const stamp = formatNoteStamp(post.createdAt);

          return (
            <article
              key={post.id}
              ref={isTarget ? targetRef : null}
              className={`bb-social-feed-post${isText ? ' is-text' : ''}${
                isTarget ? ' is-focus' : ''
              }`}
              id={`social-post-${post.id}`}
            >
              <header className="bb-social-feed-post-head">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="bb-social-feed-avatar" />
                ) : (
                  <span
                    className="bb-social-feed-avatar bb-social-feed-avatar--fallback"
                    aria-hidden="true"
                  >
                    {initial}
                  </span>
                )}
                <div className="bb-social-feed-author">
                  <span className="bb-social-feed-brand">{displayName}</span>
                  <span className="bb-social-feed-user">@{username}</span>
                </div>
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
                  {post.title || editMode ? (
                    editMode ? (
                      <EditableText
                        as="p"
                        className="bb-social-feed-title"
                        editMode
                        value={post.title || ''}
                        placeholder="Add a title"
                        onChange={(value) =>
                          onUpdateSocialPost?.(post.id, { title: value })
                        }
                      />
                    ) : post.title ? (
                      <p className="bb-social-feed-title">{post.title}</p>
                    ) : null
                  ) : null}
                  {(post.caption || editMode) ? (
                    <div className="bb-social-feed-caption">
                      {editMode ? (
                        <EditableText
                          as="span"
                          className="bb-social-feed-caption-edit"
                          editMode
                          multiline
                          value={post.caption || ''}
                          placeholder="Write a caption…"
                          onChange={(value) =>
                            onUpdateSocialPost?.(post.id, { caption: value })
                          }
                        />
                      ) : (
                        post.caption
                      )}
                    </div>
                  ) : null}
                  {String(post.location || '').trim() ? (
                    <p className="bb-social-feed-location">
                      <MapPin size={12} strokeWidth={2.4} aria-hidden="true" />
                      <span>{String(post.location).trim()}</span>
                    </p>
                  ) : null}
                  {stamp ? (
                    <time
                      className="bb-social-feed-stamp"
                      dateTime={new Date(post.createdAt).toISOString()}
                    >
                      {stamp}
                    </time>
                  ) : null}
                  {editMode ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, {
                          published: post.published === false
                        })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="bb-social-feed-caption-row">
                  {stamp ? (
                    <time
                      className="bb-social-feed-stamp"
                      dateTime={new Date(post.createdAt).toISOString()}
                    >
                      {stamp}
                    </time>
                  ) : null}
                  {editMode ? (
                    <button
                      type="button"
                      className="bb-ghost-btn py-1 px-2.5 text-xs justify-self-start"
                      onClick={() =>
                        onUpdateSocialPost?.(post.id, {
                          published: post.published === false
                        })
                      }
                    >
                      {post.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
