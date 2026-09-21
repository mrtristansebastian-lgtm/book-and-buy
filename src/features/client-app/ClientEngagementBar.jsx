import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Heart,
  Link2,
  MessageCircle,
  Repeat2,
  Reply,
  Send,
  Share,
  Trash2,
  X
} from 'lucide-react';
import { publicItemPath } from '../../app/routing';
import { seedEngagementCount, socialPostKey } from './clientProfile';
import { useClientProfile } from './ClientProfileContext';
import {
  canUseCanonicalSocial,
  listSocialComments,
  socialMutations
} from '../social/socialApi';

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

async function copyPostLink({ slug, postId }) {
  try {
    await navigator.clipboard.writeText(shareUrl(slug, postId));
    return 'copied';
  } catch {
    return 'failed';
  }
}

function relativeCommentTime(value) {
  const delta = Math.max(0, Date.now() - Number(value || 0));
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function SharePanel({ open, onClose, url, onCopy }) {
  if (!open) return null;
  return (
    <div className="bb-client-share-sheet" role="dialog" aria-modal="true" aria-label="Share post">
      <button type="button" className="bb-client-share-backdrop" aria-label="Close share" onClick={onClose} />
      <section className="bb-client-share-panel">
        <header>
          <div>
            <span>Share</span>
            <strong>Send this post</strong>
          </div>
          <button type="button" className="bb-client-social-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <button type="button" className="bb-client-share-option" onClick={onCopy}>
          <span><Copy size={19} /></span>
          <span><strong>Copy link</strong><small>{url}</small></span>
          <Link2 size={18} />
        </button>
      </section>
    </div>
  );
}

function CommentsSheet({
  open,
  onClose,
  comments,
  profile,
  draft,
  setDraft,
  onSubmit,
  onToggleLike,
  onDelete,
  onLoadReplies,
  loading,
  loadingMore,
  hasMore,
  onLoadMore
}) {
  const [replyTo, setReplyTo] = useState(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setReplyTo(null);
      return undefined;
    }
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  const startReply = (comment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const submitted = await onSubmit?.(draft, replyTo?.id || '');
    if (submitted !== false) setReplyTo(null);
  };

  if (!open) return null;
  return (
    <div className="bb-client-comment-sheet" role="dialog" aria-modal="true" aria-label="Comments">
      <button
        type="button"
        className="bb-client-comment-backdrop"
        aria-label="Close comments"
        onClick={onClose}
      />
      <div className="bb-client-comment-panel" ref={panelRef}>
        <header className="bb-client-comment-head">
          <span>
            <small>Conversation</small>
            <strong>Comments</strong>
          </span>
          <button type="button" className="bb-client-social-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="bb-client-comment-list">
          {loading ? (
            <div className="bb-client-comment-loading"><span /><span /><span /></div>
          ) : comments.length === 0 ? (
            <div className="bb-client-comment-empty">
              <MessageCircle size={25} strokeWidth={1.8} />
              <strong>Start the conversation</strong>
              <p>Share a thought or ask a question.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bb-client-comment-thread">
                <article className="bb-client-comment-row">
                  <span className="bb-client-comment-avatar" aria-hidden="true">
                    {comment.authorPhotoURL ? <img src={comment.authorPhotoURL} alt="" /> : String(comment.authorName || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="bb-client-comment-body">
                    <p><strong>{comment.authorName || profile?.displayName || 'You'}</strong> {comment.body}</p>
                    <div className="bb-client-comment-meta">
                      <time>{relativeCommentTime(comment.createdAtMs || comment.at)}</time>
                      <button type="button" onClick={() => startReply(comment)}>Reply</button>
                      {comment.authorUid === profile?.uid ? (
                        <button type="button" aria-label="Delete comment" onClick={() => onDelete?.(comment)}>
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                    {comment.replyCount > 0 && !comment.replies?.length ? (
                      <button type="button" className="bb-client-comment-view-replies" onClick={() => onLoadReplies?.(comment)}>
                        <Reply size={13} /> View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`bb-client-comment-like${comment.viewerLiked ? ' is-on' : ''}`}
                    aria-label={comment.viewerLiked ? 'Unlike comment' : 'Like comment'}
                    aria-pressed={Boolean(comment.viewerLiked)}
                    onClick={() => onToggleLike?.(comment)}
                  >
                    <Heart size={15} fill={comment.viewerLiked ? 'currentColor' : 'none'} />
                    {comment.likeCount ? <span>{comment.likeCount}</span> : null}
                  </button>
                </article>
                {comment.replies?.map((reply) => (
                  <article key={reply.id} className="bb-client-comment-row is-reply">
                    <span className="bb-client-comment-avatar" aria-hidden="true">
                      {reply.authorPhotoURL ? <img src={reply.authorPhotoURL} alt="" /> : String(reply.authorName || 'U').charAt(0).toUpperCase()}
                    </span>
                    <div className="bb-client-comment-body">
                      <p><strong>{reply.authorName || 'Someone'}</strong> {reply.body}</p>
                      <div className="bb-client-comment-meta"><time>{relativeCommentTime(reply.createdAtMs)}</time></div>
                    </div>
                  </article>
                ))}
              </div>
            ))
          )}
          {hasMore ? (
            <button type="button" className="bb-client-comment-load-more" disabled={loadingMore} onClick={onLoadMore}>
              {loadingMore ? 'Loading…' : 'View more comments'}
            </button>
          ) : null}
        </div>
        <form className="bb-client-comment-composer" onSubmit={submit}>
          {replyTo ? (
            <div className="bb-client-comment-replying">
              <span>Replying to <strong>{replyTo.authorName}</strong></span>
              <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={14} /></button>
            </div>
          ) : null}
          <span className="bb-client-comment-composer-avatar" aria-hidden="true">
            {String(profile?.displayName || 'Y').charAt(0).toUpperCase()}
          </span>
          <input
            ref={inputRef}
            placeholder={replyTo ? `Reply to ${replyTo.authorName}…` : 'Add a comment…'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2200}
          />
          <button type="submit" className="bb-client-comment-send" disabled={!draft.trim()} aria-label="Post comment">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Instagram-style heart — outline idle; native animated gradient when liked. */
function LikeGlyph({ size = 28, liked = false, className = '', burst = false }) {
  return (
    <Heart
      className={`bb-client-like-heart${liked || burst ? ' is-on' : ''}${burst ? ' is-burst' : ''} ${className}`.trim()}
      size={size}
      strokeWidth={2}
      absoluteStrokeWidth
      fill={liked || burst ? 'currentColor' : 'none'}
      aria-hidden="true"
    />
  );
}

function LikeButton({
  className = '',
  liked = false,
  likeCount = 0,
  showCount = false,
  showLabel = false,
  heartSize = 28,
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
          <LikeGlyph size={heartSize} liked={liked} />
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
          <LikeGlyph size={108} burst />
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
  variant = 'instagram',
  children = null
}) {
  const { profile, isLiked, isSaved, getComments, toggleLike, toggleSave, addComment } =
    useClientProfile();
  const postId = post?.id || '';
  const postSlug = slug || post?._slug || '';
  const key = socialPostKey(postSlug, postId);
  const liked = isLiked(postSlug, postId);
  const saved = isSaved(postSlug, postId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [shareHint, setShareHint] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [remoteComments, setRemoteComments] = useState(null);
  const [commentsCursor, setCommentsCursor] = useState(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const canonicalEnabled = canUseCanonicalSocial(profile?.uid);
  const legacyComments = getComments(postSlug, postId);
  const comments = remoteComments || legacyComments;

  const likeCount = useMemo(() => {
    const canonicalCount = Number(post?.counts?.likes);
    if (Number.isFinite(canonicalCount)) return canonicalCount + (liked ? 1 : 0);
    const base = seedEngagementCount(post, 'likeCount', key);
    return liked ? base + 1 : base;
  }, [post, key, liked]);

  const commentCount = useMemo(() => {
    const canonicalCount = Number(post?.counts?.comments);
    if (Number.isFinite(canonicalCount)) return Math.max(canonicalCount, comments.length);
    const base = seedEngagementCount(post, 'commentCount', key);
    return base + legacyComments.length;
  }, [post, key, comments.length, legacyComments.length]);

  useEffect(() => {
    setRemoteComments(null);
    setCommentsCursor(null);
    setCommentsHasMore(false);
  }, [postSlug, postId]);

  useEffect(() => {
    if (!sheetOpen || !canonicalEnabled || remoteComments !== null) return undefined;
    let cancelled = false;
    setCommentsLoading(true);
    listSocialComments({ slug: postSlug, postId })
      .then((result) => {
        if (cancelled) return;
        setRemoteComments(result.items);
        setCommentsCursor(result.nextCursor);
        setCommentsHasMore(result.hasMore);
      })
      .catch(() => {
        if (!cancelled) setRemoteComments(legacyComments);
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, canonicalEnabled, remoteComments, postSlug, postId]);

  const onShare = async () => {
    const isMobile = window.matchMedia?.('(max-width: 720px)')?.matches;
    if (!isMobile) {
      setShareOpen(true);
      return;
    }
    const result = await sharePost({
      slug: postSlug,
      postId,
      title: post?.title || brandName || 'Post'
    });
    setShareHint(result === 'copied' ? 'Link copied' : result === 'shared' ? 'Shared' : '');
    if (result === 'copied' || result === 'shared') {
      if (canonicalEnabled) socialMutations.recordShare({ slug: postSlug, postId }).catch(() => {});
    }
    window.setTimeout(() => setShareHint(''), 1600);
  };

  const copyShareLink = async () => {
    const result = await copyPostLink({ slug: postSlug, postId });
    if (result === 'copied') {
      setShareHint('Link copied');
      setShareOpen(false);
      if (canonicalEnabled) socialMutations.recordShare({ slug: postSlug, postId }).catch(() => {});
      window.setTimeout(() => setShareHint(''), 1600);
    } else {
      setShareHint('Could not copy. Try again.');
    }
  };

  const submitComment = async (body, parentId = '') => {
    const text = String(body || draft).trim();
    if (!text) return false;
    if (canonicalEnabled) {
      try {
        const result = await socialMutations.createComment({ slug: postSlug, postId, body: text, parentId });
        const created = result?.comment;
        if (created) {
          setRemoteComments((prev) => {
            const list = prev || [];
            if (!parentId) return [created, ...list];
            return list.map((comment) =>
              comment.id === parentId
                ? {
                    ...comment,
                    replyCount: Number(comment.replyCount || 0) + 1,
                    replies: [...(comment.replies || []), created]
                  }
                : comment
            );
          });
        }
      } catch {
        setShareHint('Could not post. Try again.');
        return false;
      }
    } else {
      const created = await addComment(postSlug, postId, text);
      if (parentId && created) {
        setRemoteComments((prev) =>
          (prev || legacyComments).map((comment) =>
            comment.id === parentId
              ? { ...comment, replyCount: Number(comment.replyCount || 0) + 1, replies: [...(comment.replies || []), created] }
              : comment
          )
        );
      }
    }
    setDraft('');
    return true;
  };

  const loadMoreComments = async () => {
    if (!commentsCursor || commentsLoadingMore) return;
    setCommentsLoadingMore(true);
    try {
      const result = await listSocialComments({ slug: postSlug, postId, cursor: commentsCursor });
      setRemoteComments((prev) => [...(prev || []), ...result.items]);
      setCommentsCursor(result.nextCursor);
      setCommentsHasMore(result.hasMore);
    } finally {
      setCommentsLoadingMore(false);
    }
  };

  const loadReplies = async (comment) => {
    if (!canonicalEnabled) return;
    try {
      const result = await listSocialComments({ slug: postSlug, postId, parentId: comment.id });
      setRemoteComments((prev) =>
        (prev || []).map((item) => (item.id === comment.id ? { ...item, replies: result.items } : item))
      );
    } catch {
      /* keep the thread compact when replies cannot be loaded */
    }
  };

  const toggleCommentLike = async (comment) => {
    const nextLiked = !comment.viewerLiked;
    setRemoteComments((prev) =>
      (prev || legacyComments).map((item) =>
        item.id === comment.id
          ? { ...item, viewerLiked: nextLiked, likeCount: Math.max(0, Number(item.likeCount || 0) + (nextLiked ? 1 : -1)) }
          : item
      )
    );
    if (canonicalEnabled) {
      socialMutations
        .toggleCommentLike({ slug: postSlug, postId, commentId: comment.id, active: nextLiked })
        .catch(() => {
          setRemoteComments((prev) =>
            (prev || legacyComments).map((item) => (item.id === comment.id ? comment : item))
          );
        });
    }
  };

  const deleteComment = async (comment) => {
    setRemoteComments((prev) => (prev || legacyComments).filter((item) => item.id !== comment.id));
    if (canonicalEnabled) {
      socialMutations.deleteComment({ slug: postSlug, postId, commentId: comment.id }).catch(() => {});
    }
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
      onToggleLike={toggleCommentLike}
      onDelete={deleteComment}
      onLoadReplies={loadReplies}
      loading={commentsLoading}
      loadingMore={commentsLoadingMore}
      hasMore={commentsHasMore}
      onLoadMore={loadMoreComments}
    />
  );
  const sharePanel = (
    <SharePanel
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      url={shareUrl(postSlug, postId)}
      onCopy={copyShareLink}
    />
  );

  if (variant === 'tiktok') {
    return (
      <>
        <div className="bb-client-tiktok-rail" aria-label="Actions">
          <LikeButton
            className="bb-client-reaction-wrap--rail bb-client-tiktok-btn"
            liked={liked}
            heartSize={34}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={34} liked={liked} />
            <span>{likeCount}</span>
          </LikeButton>
          <button
            type="button"
            className="bb-client-tiktok-btn"
            aria-label="Comment"
            onClick={() => setSheetOpen(true)}
          >
            <MessageCircle size={32} strokeWidth={2} absoluteStrokeWidth />
            <span>{commentCount}</span>
          </button>
          <button type="button" className="bb-client-tiktok-btn" aria-label="Share" onClick={onShare}>
            <Share size={30} strokeWidth={2} absoluteStrokeWidth />
            <span>Share</span>
          </button>
          <button
            type="button"
            className={`bb-client-tiktok-btn${saved ? ' is-on' : ''}`}
            aria-label={saved ? 'Unsave' : 'Save'}
            aria-pressed={saved}
            onClick={() => toggleSave(postSlug, postId)}
          >
            <Bookmark
              size={30}
              strokeWidth={saved ? 0 : 2}
              absoluteStrokeWidth
              fill={saved ? 'currentColor' : 'none'}
            />
            <span>Save</span>
          </button>
          {shareHint ? <span className="bb-client-tiktok-hint">{shareHint}</span> : null}
        </div>
        {sheet}
        {sharePanel}
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
            heartSize={18}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={18} liked={liked} />
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
        {sharePanel}
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
              heartSize={22}
              onToggle={onToggleLike}
            />
            <span className="bb-client-pulse-sep" aria-hidden="true" />
            <button type="button" className="bb-client-pulse-stat" onClick={() => setSheetOpen(true)}>
              <MessageCircle size={20} strokeWidth={2} absoluteStrokeWidth />
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
        {sharePanel}
      </>
    );
  }

  if (variant === 'youtube') {
    const viewerName = String(profile?.displayName || 'You').trim() || 'You';
    const viewerInitial = viewerName.charAt(0).toUpperCase();

    return (
      <>
        <div className="bb-client-youtube-engagement">
          <div className="bb-client-youtube-action-row" role="group" aria-label="Film actions">
            <LikeButton
              className="bb-client-youtube-action"
              liked={liked}
              heartSize={18}
              onToggle={onToggleLike}
            >
              <LikeGlyph size={18} liked={liked} />
              <span>{likeCount.toLocaleString()}</span>
            </LikeButton>
            <button
              type="button"
              className="bb-client-youtube-action"
              aria-label="Share"
              onClick={onShare}
            >
              <Send size={17} strokeWidth={2} />
              <span>Share</span>
            </button>
            <button
              type="button"
              className={`bb-client-youtube-action${saved ? ' is-on' : ''}`}
              aria-label={saved ? 'Unsave' : 'Save'}
              aria-pressed={saved}
              onClick={() => toggleSave(postSlug, postId)}
            >
              <Bookmark
                size={17}
                strokeWidth={saved ? 0 : 2}
                fill={saved ? 'currentColor' : 'none'}
              />
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>
          </div>

          {shareHint ? <p className="bb-client-engage-hint">{shareHint}</p> : null}

          {children}

          <section className="bb-client-youtube-comments" aria-label="Comments">
            <button
              type="button"
              className="bb-client-youtube-comments-head"
              onClick={() => setSheetOpen(true)}
            >
              <span>
                <strong>{commentCount.toLocaleString()}</strong>{' '}
                {commentCount === 1 ? 'Comment' : 'Comments'}
              </span>
              <MessageCircle size={18} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="bb-client-youtube-comment-prompt"
              onClick={() => setSheetOpen(true)}
            >
              <span className="bb-client-youtube-comment-avatar" aria-hidden="true">
                {viewerInitial}
              </span>
              <span>Add a comment…</span>
            </button>

            {comments.length ? (
              <div className="bb-client-youtube-comment-preview">
                {comments.slice(0, 2).map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    className="bb-client-youtube-comment-row"
                    onClick={() => setSheetOpen(true)}
                  >
                    <span className="bb-client-youtube-comment-avatar" aria-hidden="true">
                      {String(comment.authorName || viewerName).charAt(0).toUpperCase()}
                    </span>
                    <span className="bb-client-youtube-comment-copy">
                      <strong>{comment.authorName || viewerName}</strong>
                      <span>{comment.body}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {commentCount > 0 ? (
              <button
                type="button"
                className="bb-client-youtube-view-comments"
                onClick={() => setSheetOpen(true)}
              >
                View all comments
              </button>
            ) : null}
          </section>
        </div>
        {sheet}
        {sharePanel}
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
            heartSize={compact ? 28 : 30}
            onToggle={onToggleLike}
          >
            <LikeGlyph size={compact ? 28 : 30} liked={liked} />
          </LikeButton>
          <button
            type="button"
            className="bb-client-engage-btn"
            aria-label="Comment"
            onClick={() => setSheetOpen(true)}
          >
            <MessageCircle size={compact ? 28 : 30} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button type="button" className="bb-client-engage-btn" aria-label="Share" onClick={onShare}>
            <Send size={compact ? 26 : 28} strokeWidth={2} absoluteStrokeWidth />
          </button>
          <button
            type="button"
            className={`bb-client-engage-btn is-end${saved ? ' is-on' : ''}`}
            aria-label={saved ? 'Unsave' : 'Save'}
            aria-pressed={saved}
            onClick={() => toggleSave(postSlug, postId)}
          >
            <Bookmark
              size={compact ? 28 : 30}
              strokeWidth={saved ? 0 : 2}
              absoluteStrokeWidth
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
      {sharePanel}
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
