import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * Instagram-style ⋯ post menu — Edit / Delete / Publish toggle.
 */
export function SocialPostManageMenu({
  post,
  onEditPost,
  onRemoveSocialPost,
  onUpdateSocialPost,
  showPublishToggle = true,
  className = '',
  align = 'end'
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const published = post?.published !== false;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!onEditPost && !onRemoveSocialPost && !onUpdateSocialPost) return null;

  return (
    <div
      ref={rootRef}
      className={`bb-social-post-menu${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="bb-social-post-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Post options"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={16} strokeWidth={2.3} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          className={`bb-social-post-menu-panel bb-social-post-menu-panel--${align}`}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {onEditPost ? (
            <button
              type="button"
              role="menuitem"
              className="bb-social-post-menu-item"
              onClick={() => {
                setOpen(false);
                onEditPost(post);
              }}
            >
              Edit
            </button>
          ) : null}
          {showPublishToggle && onUpdateSocialPost ? (
            <button
              type="button"
              role="menuitem"
              className="bb-social-post-menu-item"
              onClick={() => {
                setOpen(false);
                onUpdateSocialPost(post.id, { published: !published });
              }}
            >
              {published ? 'Unpublish' : 'Publish'}
            </button>
          ) : null}
          {onRemoveSocialPost ? (
            <button
              type="button"
              role="menuitem"
              className="bb-social-post-menu-item is-danger"
              onClick={() => {
                setOpen(false);
                onRemoveSocialPost(post.id);
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
