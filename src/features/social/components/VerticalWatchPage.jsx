import { useEffect, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { EditableText } from '../../website/components/editable';
import { formatNoteStamp } from '../utils/socialPostType';
import { BbVideoPlayer } from './BbVideoPlayer';

function channelInitial(name = '') {
  const part = String(name || '').trim().charAt(0);
  return part ? part.toUpperCase() : 'B';
}

export function VerticalWatchPage({
  post,
  posts = [],
  brandName = '',
  logoUrl = '',
  editMode = false,
  onClose,
  onChangeActive,
  onUpdateSocialPost
}) {
  const activeIndex = Math.max(
    0,
    posts.findIndex((item) => item.id === post?.id)
  );
  const count = posts.length;
  const stageRef = useRef(null);
  const silentScroll = useRef(true);

  const goTo = (nextIndex) => {
    const next = posts[Math.max(0, Math.min(count - 1, nextIndex))];
    if (next?.id && next.id !== post?.id) onChangeActive?.(next.id);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) {
          if (event.key !== 'Escape') return;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (count < 2) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, count, onClose, post?.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !post?.id) return undefined;
    const slide = stage.querySelector(`[data-post-id="${post.id}"]`);
    if (!(slide instanceof HTMLElement)) return undefined;
    const top = slide.offsetTop;
    if (Math.abs(stage.scrollTop - top) < 6) return undefined;
    silentScroll.current = true;
    stage.scrollTo({ top, behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      silentScroll.current = false;
    }, 480);
    return () => window.clearTimeout(timer);
  }, [post?.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const slides = [...stage.querySelectorAll('.bb-vertical-watch-slide')];
    if (!slides.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (silentScroll.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target instanceof HTMLElement ? visible.target.dataset.postId : '';
        if (id && id !== post?.id) onChangeActive?.(id);
      },
      { root: stage, threshold: 0.62 }
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [onChangeActive, post?.id, posts]);

  if (!post || !count) return null;

  return (
    <div className="bb-vertical-watch" role="dialog" aria-modal="true" aria-label="Verticals">
      <header className="bb-vertical-watch-bar">
        <button type="button" className="bb-vertical-watch-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
          <span>Back</span>
        </button>
        <p className="bb-vertical-watch-count">
          {activeIndex + 1} / {count}
        </p>
      </header>

      <div className="bb-vertical-watch-body">
        <div className="bb-vertical-watch-phone">
          <div ref={stageRef} className="bb-vertical-watch-stage">
            {posts.map((item) => {
              const active = item.id === post.id;
              const title = String(item.title || '').trim() || 'Untitled Vertical';
              return (
                <article
                  key={item.id}
                  data-post-id={item.id}
                  className={`bb-vertical-watch-slide${active ? ' is-active' : ''}`}
                  aria-hidden={!active}
                >
                  {active && item.mediaUrl ? (
                    <BbVideoPlayer
                      key={item.id}
                      className="bb-vertical-watch-player"
                      src={item.mediaUrl}
                      poster={item.posterUrl || ''}
                      title={title}
                      aspectRatio={9 / 16}
                      trimStart={Number(item.trimStart) || 0}
                      trimEnd={Number(item.trimEnd) || 0}
                      fill
                      autoPlay
                      loop
                      startMuted
                      variant="reel"
                    />
                  ) : item.posterUrl ? (
                    <img className="bb-vertical-watch-poster" src={item.posterUrl} alt="" />
                  ) : (
                    <div className="bb-vertical-watch-empty">Video unavailable</div>
                  )}

                  <div className="bb-vertical-watch-overlay">
                    <div className="bb-vertical-watch-identity">
                      <span className="bb-vertical-watch-avatar" aria-hidden="true">
                        {logoUrl ? <img src={logoUrl} alt="" /> : channelInitial(brandName)}
                      </span>
                      <div className="bb-vertical-watch-identity-copy">
                        <p className="bb-vertical-watch-brand">{brandName || 'Business'}</p>
                        {formatNoteStamp(item.createdAt) ? (
                          <p className="bb-vertical-watch-stamp">{formatNoteStamp(item.createdAt)}</p>
                        ) : null}
                      </div>
                    </div>

                    {editMode || String(item.title || '').trim() ? (
                      <EditableText
                        as="p"
                        className="bb-vertical-watch-title"
                        editMode={editMode && active}
                        value={item.title || ''}
                        placeholder="Title"
                        onChange={(value) => onUpdateSocialPost?.(item.id, { title: value })}
                      />
                    ) : null}

                    {editMode || String(item.caption || '').trim() ? (
                      <EditableText
                        as="p"
                        className="bb-vertical-watch-caption"
                        editMode={editMode && active}
                        multiline
                        value={item.caption || ''}
                        placeholder="Add a caption…"
                        onChange={(value) => onUpdateSocialPost?.(item.id, { caption: value })}
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {count > 1 ? (
          <div className="bb-vertical-watch-nav">
            <button
              type="button"
              className="bb-vertical-watch-nav-btn"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex <= 0}
              aria-label="Previous vertical"
            >
              <ChevronUp size={20} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="bb-vertical-watch-nav-btn"
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex >= count - 1}
              aria-label="Next vertical"
            >
              <ChevronDown size={20} strokeWidth={2.2} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
