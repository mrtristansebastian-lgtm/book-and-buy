import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Play } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp } from '../utils/socialPostType';
import { aspectStyle } from '../utils/videoMedia';
import { BbVideoPlayer } from './BbVideoPlayer';

function channelInitial(name = '') {
  const part = String(name || '').trim().charAt(0);
  return part ? part.toUpperCase() : 'B';
}

function formatViewCount(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n < 1000) return `${n}`;
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n < 1000000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

function viewsLabel(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  const formatted = formatViewCount(n);
  return `${formatted} view${n === 1 ? '' : 's'}`;
}

function VideoMetaLine({
  brandName,
  post,
  showOwnerStats = false
}) {
  const stamp = formatNoteStamp(post.createdAt);
  const parts = [brandName || 'Business'];
  if (showOwnerStats) parts.push(viewsLabel(post.viewCount));
  if (stamp) parts.push(stamp);
  return <span className="bb-yt-subline">{parts.join(' · ')}</span>;
}

function VideoWatchPage({
  post,
  posts = [],
  brandName = '',
  logoUrl = '',
  editMode = false,
  showOwnerStats = false,
  onClose,
  onChangeActive,
  onUpdateSocialPost
}) {
  const related = posts.filter((item) => item.id !== post?.id);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!post) return null;

  return (
    <div className="bb-yt-watch" role="dialog" aria-modal="true" aria-label="Video">
      <header className="bb-yt-watch-bar">
        <button type="button" className="bb-yt-watch-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>Back</span>
        </button>
      </header>

      <div
        className="bb-yt-watch-player"
        style={aspectStyle(post.aspectRatio, 16 / 9)}
      >
        {post.mediaUrl ? (
          <BbVideoPlayer
            key={post.id}
            className="bb-social-video-player bb-yt-watch-player-el"
            src={post.mediaUrl}
            poster={post.posterUrl || ''}
            title={post.title || 'Video'}
            aspectRatio={Number(post.aspectRatio) || 0}
            trimStart={Number(post.trimStart) || 0}
            trimEnd={Number(post.trimEnd) || 0}
          />
        ) : (
          <div className="bb-social-video-player bb-social-video-player--empty">
            Video unavailable
          </div>
        )}
      </div>

      <div className="bb-yt-watch-body">
        <div className="bb-yt-watch-primary">
          <div className="bb-yt-watch-head">
            <EditableText
              as="h1"
              className="bb-yt-watch-title"
              editMode={editMode}
              value={post.title || ''}
              placeholder="Title"
              onChange={(value) => onUpdateSocialPost?.(post.id, { title: value })}
            />
            <div className="bb-yt-watch-facts">
              {showOwnerStats ? (
                <span className="bb-yt-watch-stats">{viewsLabel(post.viewCount)}</span>
              ) : null}
              {post.duration ? (
                <span className="bb-yt-watch-chip">{post.duration}</span>
              ) : null}
              {formatNoteStamp(post.createdAt) ? (
                <span className="bb-yt-watch-chip">{formatNoteStamp(post.createdAt)}</span>
              ) : null}
            </div>
          </div>

          <div className="bb-yt-watch-channel">
            <span className="bb-yt-avatar bb-yt-avatar--watch" aria-hidden="true">
              {logoUrl ? <img src={logoUrl} alt="" /> : channelInitial(brandName)}
            </span>
            <div className="bb-yt-watch-channel-copy">
              <p className="bb-yt-channel-name">{brandName || 'Business'}</p>
              <p className="bb-yt-watch-meta">Channel</p>
            </div>
          </div>

          {editMode || String(post.caption || '').trim() ? (
            <div className="bb-yt-watch-desc">
              <p className="bb-yt-watch-desc-label">Description</p>
              <EditableText
                as="p"
                className="bb-yt-watch-caption"
                editMode={editMode}
                multiline
                value={post.caption || ''}
                placeholder="Description"
                onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
              />
            </div>
          ) : null}
        </div>

        {related.length ? (
          <aside className="bb-yt-related" aria-label="More videos">
            <div className="bb-yt-related-head">
              <h2 className="bb-yt-related-heading">More videos</h2>
              <span className="bb-yt-related-count">{related.length}</span>
            </div>
            <div className="bb-yt-related-list">
              {related.map((item) => {
                const title = String(item.title || '').trim() || 'Untitled video';
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="bb-yt-related-row"
                    onClick={() => onChangeActive?.(item.id)}
                  >
                    <span className="bb-yt-related-thumb">
                      {item.posterUrl ? (
                        <img src={item.posterUrl} alt="" />
                      ) : (
                        <span className="bb-social-video-tile-empty" />
                      )}
                      <span className="bb-yt-related-play" aria-hidden="true">
                        <Play size={14} fill="currentColor" strokeWidth={0} />
                      </span>
                      {item.duration ? (
                        <span className="bb-social-video-tile-duration">{item.duration}</span>
                      ) : null}
                    </span>
                    <span className="bb-yt-related-copy">
                      <strong>{title}</strong>
                      <VideoMetaLine
                        brandName={brandName}
                        post={item}
                        showOwnerStats={showOwnerStats}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Public videos: YouTube-style home feed + watch page.
 * View counts are owner/staff only (hidden on the live public site).
 */
export function SocialVideosPanel({
  posts,
  editMode = false,
  showPublishToggle = true,
  showOwnerStats = false,
  brandName = '',
  logoUrl = '',
  onUpdateSocialPost,
  onRemoveSocialPost,
  onEditPost,
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

  if (watching) {
    return (
      <VideoWatchPage
        post={watching}
        posts={posts}
        brandName={brandName}
        logoUrl={logoUrl}
        editMode={editMode}
        showOwnerStats={showOwnerStats}
        onClose={closeWatch}
        onChangeActive={openWatch}
        onUpdateSocialPost={onUpdateSocialPost}
      />
    );
  }

  return (
    <div className="bb-social-video-grid bb-yt-home" role="list">
      {posts.map((post) => {
        const title = String(post.title || '').trim() || 'Untitled video';
        const thumb = post.posterUrl || '';

        return (
          <article key={post.id} className="bb-social-video-tile-card bb-yt-card" role="listitem">
            {editMode && showPublishToggle && post.published === false ? (
              <div className="bb-social-post-card-meta bb-yt-draft">
                <span className="bb-edit-section-badge">Draft</span>
              </div>
            ) : null}

            <button
              type="button"
              className="bb-social-video-tile-hit bb-yt-hit"
              onClick={() => openWatch(post.id)}
              aria-label={`Play ${title}`}
            >
              <span
                className="bb-social-video-tile-media bb-yt-thumb"
                style={aspectStyle(post.aspectRatio, 16 / 9)}
              >
                {thumb ? <img src={thumb} alt="" /> : <span className="bb-social-video-tile-empty" />}
                <span className="bb-social-video-tile-play" aria-hidden="true">
                  <Play size={22} strokeWidth={2.4} fill="currentColor" />
                </span>
              </span>
            </button>

            {onEditPost ? (
              <button
                type="button"
                className="bb-social-manage-edit"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditPost(post);
                }}
              >
                <Pencil size={13} strokeWidth={2.2} />
                Edit
              </button>
            ) : null}

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
  );
}
