import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { EditableText } from '../../website/components/editable';

/**
 * Full-image lightbox — dark gallery stage with slim copy band.
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

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft' && index > 0) onChangeActive?.(posts[index - 1].id);
      if (event.key === 'ArrowRight' && index < posts.length - 1) {
        onChangeActive?.(posts[index + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, posts, onClose, onChangeActive]);

  useEffect(() => {
    dialogRef.current?.focus?.();
  }, [activeId]);

  if (!post) return null;

  const hasPrev = index > 0;
  const hasNext = index < posts.length - 1;

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
          {hasPrev ? (
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
            {post.mediaUrl ? (
              <img src={post.mediaUrl} alt={post.title || post.caption || ''} />
            ) : (
              <div className="bb-social-lightbox-empty">No image</div>
            )}
          </div>

          {hasNext ? (
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
          <p className="bb-social-lightbox-count">
            {index + 1} / {posts.length}
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
            placeholder="Caption"
            onChange={(value) => onUpdateSocialPost?.(post.id, { caption: value })}
          />
        </div>
      </div>
    </div>
  );
}
