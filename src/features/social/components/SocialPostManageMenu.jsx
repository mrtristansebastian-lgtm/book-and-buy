import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/**
 * Instagram-style owner menu. Social Studio intentionally keeps one action:
 * delete the published post.
 */
export function SocialPostManageMenu({
  post,
  onRemoveSocialPost,
  className = '',
  align = 'end'
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

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

  if (!onRemoveSocialPost) return null;

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
          <button
            type="button"
            role="menuitem"
            className="bb-social-post-menu-item is-danger"
            onClick={() => {
              setOpen(false);
              onRemoveSocialPost(post.id);
            }}
          >
            Delete post
          </button>
        </div>
      ) : null}
    </div>
  );
}
