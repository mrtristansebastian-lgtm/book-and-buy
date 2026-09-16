import { useMemo, useRef, useState } from 'react';
import { Bookmark, MessageCircle, Repeat2, Send, Share, X } from 'lucide-react';
import { publicItemPath } from '../../app/routing';
import { seedEngagementCount, socialPostKey } from './clientProfile';
import { useClientProfile } from './ClientProfileContext';
import { LIKE_REACTION } from './reactions';

function shareUrl(slug, postId) {
  const path = publicItemPath(slug, 'social', postId);
  const hash = path.startsWith('#') ? path : `#${path}`;
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

async function sharePost({ slug, postId, title }) {
  const url = shareUrl(slug, postId);
  try {
    if (navigator.share) {
      await navigator.share({ title: title || 'Check this out', url });
      return 'shared';
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function CommentsSheet({ open, onClose, comments, profile, draft, setDraft, onSubmit }) {
  if (!open) return null;
  return (
    <div className="bb-client-comment-sheet" role="dialog" aria-label="Comments">
      <button
        type="button"
        className="bb-client-comment-backdrop"
        aria-label="Close comments"
        onClick={onClose}
      />
      <div className="bb-client-comment-panel">
        <header className="bb-client-comment-head">
          <strong>Comments</strong>
          <button type="button" className="bb-client-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="bb-client-comment-list">
          {comments.length === 0 ? (
            <p className="bb-muted m-0 text-sm">No comments yet. Say something nice.</p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="bb-client-comment-row">
                <strong>{comment.authorName || profile?.displayName || 'You'}</strong>
                <p className="m-0">{comment.body}</p>
              </article>
            ))
          )}
        </div>
        <form className="bb-client-comment-composer" onSubmit={onSubmit}>
          <input
            className="native-control-input px-4"
            placeholder="Add a comment…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="bb-client-text-btn" disabled={!draft.trim()}>
            Post
          </button>
        </form>
      </div>
    </div>
  );
}

function LikeGlyph({ size = 18, className = '', muted = false }) {
  return (
    <img
      src={LIKE_REACTION.src}
      alt=""
      className={`bb-client-reaction-glyph${muted ? ' is-muted' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

function LikeButton({
  className = '',
  liked = false,
  likeCount = 0,
  showCount = false,
  showLabel = false,
  children,
  onToggle
}) {
  return (
    <button
      type="button"
      className={`bb-client-reaction-trigger${liked ? ' is-on' : ''} ${className}`.trim()}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      onClick={onToggle}
    >
      {children || (
        <>
          <LikeGlyph size={18} muted={!liked} />
          {showCount ? <span className="bb-client-pulse-num">{likeCount.toLocaleString()}</span> : null}
          {showLabel ? (
            <span className="bb-client-pulse-word">{likeCount === 1 ? 'Like' : 'Likes'}</span>
          ) : null}
        </>
      )}
    </button>
  );
}

/** Instagram-style double-tap on media → like + heart burst. */
export function ClientMediaReactionLayer({ post, slug = '', children, className = '' }) {
  const { isLiked, setReaction } = useClientProfile();
  const postId = post?.id || '';
  const postSlug = slug || post?._slug || '';
  const liked = isLiked(postSlug, postId);
  const [burst, setBurst] = useState(false);
  const lastTapAt = useRef(0);

  const likeFromMedia = () => {
    setBurst(true);
    if (!liked) setReaction(postSlug, postId, 'like');
    window.setTimeout(() => setBurst(false), 720);
  };

  const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'button, a, input, textarea, select, [contenteditable="true"], .bb-vertical-watch-rail, .bb-client-tiktok-rail'
      )
    );
  };

  return (
    <div
      className={`bb-client-media-react ${className}`.trim()}
      onPointerUp={(event) => {
        if (event.button != null && event.button !== 0) return;
        if (isInteractiveTarget(event.target)) return;
        const now = Date.now();
        if (now - lastTapAt.current < 320) {
          event.preventDefault();
          event.stopPropagation();
          likeFromMedia();
          lastTapAt.current = 0;
          return;
        }
        lastTapAt.current = now;
      }}
      onDoubleClick={(event) => {
        if (isInteractiveTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        likeFromMedia();
      }}
    >
      {children}
      {burst ? (
        <div className="bb-client-media-react-burst" aria-hidden="true">
          <LikeGlyph size={92} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Engagement UI variants:
 * - instagram / youtube: horizontal bar under media
 * - pulse: seamless Likes/Comments
 * - tiktok: vertical right-side rail on vertical watch
 * - twitter: compact tweet footer
 */
export function ClientEngagementBar({
  post,
  slug = '',
  brandName = '',
  compact = false,
  variant = 'instagram'
}) {
  const { profile, isLiked, isSaved, getComments, toggleLike, toggleSave, addComment } =
    useClientProfile();
  const postId = post?.id || '';
  const postSlug = slug || post?._slug || '';
  const key = socialPostKey(postSlug, postId);
  const liked = isLiked(postSlug, postId);
  const saved = isSaved(postSlug, postId);
  const comments = getComments(postSlug, postId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [shareHint, setShareHint] = useState('');

  const likeCount = useMemo(() => {
    const base = seedEngagementCount(post, 'likeCount', key);
    return liked ? base + 1 : base;
  }, [post, key, liked]);

  const commentCount = useMemo(() => {
    const base = seedEngagementCount(post, 'commentCount', key);
    return base + comments.length;
  }, [post, key, comments.length]);

  const onShare = async () => {
    const result = await sharePost({
      slug: postSlug,
      postId,
      title: post?.title || brandName || 'Post'
    });
    setShareHint(result === 'copied' ? 'Link copied' : result === 'shared' ? 'Shared' : '');
    window.setTimeout(() => setShareHint(''), 1600);
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    await addComment(postSlug, postId, draft);
    setDraft('');
  };

  const onToggleLike = () => toggleLike(postSlug, postId);

  const sheet = (
    <CommentsSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      comments={comments}
      profile={profile}
      draft={draft}
      setDraft={setDraft}
      onSubmit={submitComment}
    />
  );

  if (variant === 'tiktok') {
    return (
      <>
        <div className="bb-client-tiktok-rail" aria-label="Actions">
          <LikeButton
            className="bb-client-reaction-wrap--rail"
            liked={liked}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={30} muted={!liked} />
            <span>{likeCount}</span>
          </LikeButton>
          <button
            type="button"
            className="bb-client-tiktok-btn"
            aria-label="Comment"
            onClick={() => setSheetOpen(true)}
          >
            <MessageCircle size={28} strokeWidth={2.2} />
            <span>{commentCount}</span>
          </button>
          <button type="button" className="bb-client-tiktok-btn" aria-label="Share" onClick={onShare}>
            <Share size={26} strokeWidth={2.2} />
            <span>Share</span>
          </button>
          <button
            type="button"
            className={`bb-client-tiktok-btn${saved ? ' is-on' : ''}`}
            aria-label={saved ? 'Unsave' : 'Save'}
            aria-pressed={saved}
            onClick={() => toggleSave(postSlug, postId)}
          >
            <Bookmark size={26} strokeWidth={saved ? 0 : 2.2} fill={saved ? 'currentColor' : 'none'} />
            <span>Save</span>
          </button>
          {shareHint ? <span className="bb-client-tiktok-hint">{shareHint}</span> : null}
        </div>
        {sheet}
      </>
    );
  }

  if (variant === 'twitter') {
    return (
      <>
        <div className="bb-client-tweet-actions" role="group" aria-label="Post actions">
          <button
            type="button"
            className="bb-client-tweet-btn"
            aria-label="Reply"
            onClick={() => setSheetOpen(true)}
          >
            <MessageCircle size={16} strokeWidth={2} />
            <span>{commentCount || ''}</span>
          </button>
          <button type="button" className="bb-client-tweet-btn" aria-label="Repost" disabled>
            <Repeat2 size={16} strokeWidth={2} />
          </button>
          <LikeButton
            className="bb-client-reaction-wrap--inline"
            liked={liked}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={16} muted={!liked} />
            <span>{likeCount || ''}</span>
          </LikeButton>
          <button
            type="button"
            className={`bb-client-tweet-btn${saved ? ' is-on' : ''}`}
            aria-label={saved ? 'Unsave' : 'Save'}
            aria-pressed={saved}
            onClick={() => toggleSave(postSlug, postId)}
          >
            <Bookmark size={16} strokeWidth={saved ? 0 : 2} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="bb-client-tweet-btn" aria-label="Share" onClick={onShare}>
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
        {shareHint ? <p className="bb-client-engage-hint">{shareHint}</p> : null}
        {sheet}
      </>
    );
  }

  if (variant === 'pulse') {
    return (
      <>
        <div className="bb-client-pulse" role="group" aria-label="Likes and comments">
          <div className="bb-client-pulse-stats">
            <LikeButton
              className="bb-client-reaction-wrap--pulse"
              liked={liked}
              likeCount={likeCount}
              showCount
              showLabel
              onToggle={onToggleLike}
            />
            <span className="bb-client-pulse-sep" aria-hidden="true" />
            <button type="button" className="bb-client-pulse-stat" onClick={() => setSheetOpen(true)}>
              <MessageCircle size={16} strokeWidth={2} />
              <span className="bb-client-pulse-num">{commentCount.toLocaleString()}</span>
              <span className="bb-client-pulse-word">
                {commentCount === 1 ? 'Comment' : 'Comments'}
              </span>
            </button>
          </div>
          <div className="bb-client-pulse-tools">
            <button
              type="button"
              className={`bb-client-pulse-tool${saved ? ' is-on' : ''}`}
              aria-label={saved ? 'Unsave' : 'Save'}
              aria-pressed={saved}
              onClick={() => toggleSave(postSlug, postId)}
            >
              <Bookmark
                size={18}
                strokeWidth={saved ? 0 : 2}
                fill={saved ? 'currentColor' : 'none'}
              />
            </button>
            <button type="button" className="bb-client-pulse-tool" aria-label="Share" onClick={onShare}>
              <Send size={17} strokeWidth={2} />
            </button>
          </div>
        </div>
        {shareHint ? <p className="bb-client-engage-hint">{shareHint}</p> : null}
        {sheet}
      </>
    );
  }

  return (
    <>
      <div
        className={`bb-client-engage${compact ? ' is-compact' : ''}${
          variant === 'youtube' ? ' is-youtube' : ''
        }`}
      >
        <div className="bb-client-engage-actions">
          <LikeButton
            className="bb-client-reaction-wrap--bar"
            liked={liked}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={compact ? 22 : 26} muted={!liked} />
          </LikeButton>
          <button
            type="button"
            className="bb-client-engage-btn"
            aria-label="Comment"
            onClick={() => setSheetOpen(true)}
          >
            <MessageCircle size={compact ? 22 : 26} strokeWidth={2} />
          </button>
          <button type="button" className="bb-client-engage-btn" aria-label="Share" onClick={onShare}>
            <Send size={compact ? 21 : 24} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`bb-client-engage-btn is-end${saved ? ' is-on' : ''}`}
            aria-label={saved ? 'Unsave' : 'Save'}
            aria-pressed={saved}
            onClick={() => toggleSave(postSlug, postId)}
          >
            <Bookmark
              size={compact ? 22 : 26}
              strokeWidth={saved ? 0 : 2}
              fill={saved ? 'currentColor' : 'none'}
            />
          </button>
        </div>
        <p className="bb-client-engage-likes">
          {likeCount.toLocaleString()} like{likeCount === 1 ? '' : 's'}
        </p>
        {commentCount > 0 ? (
          <button
            type="button"
            className="bb-client-engage-view-comments"
            onClick={() => setSheetOpen(true)}
          >
            View all {commentCount} comment{commentCount === 1 ? '' : 's'}
          </button>
        ) : null}
        {shareHint ? <p className="bb-client-engage-hint">{shareHint}</p> : null}
      </div>
      {sheet}
    </>
  );
}

export { shareUrl, sharePost, LikeGlyph };

export function wrapClientMediaReaction(post, node) {
  return (
    <ClientMediaReactionLayer post={post} slug={post?._slug || ''}>
      {node}
    </ClientMediaReactionLayer>
  );
}
