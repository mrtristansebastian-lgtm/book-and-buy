import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 12;
const VIEW_PAD = 12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolvePosition(anchorRect, panelSize, placement) {
  const width = panelSize.width || 240;
  const height = panelSize.height || 200;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (placement === 'left-of-bezel') {
    const bezel = document.querySelector('.bb-device-bezel');
    const frame = bezel?.getBoundingClientRect();
    const leftEdge = frame?.left ?? anchorRect.left;
    let left = leftEdge - width - GAP;
    if (left < VIEW_PAD) {
      left = Math.min((frame?.right ?? anchorRect.right) + GAP, vw - width - VIEW_PAD);
    }
    const top = clamp(
      anchorRect.top + anchorRect.height / 2 - height / 2,
      VIEW_PAD,
      vh - height - VIEW_PAD
    );
    return { top, left };
  }

  let left = anchorRect.left;
  let top = anchorRect.bottom + GAP;
  if (left + width > vw - VIEW_PAD) left = vw - width - VIEW_PAD;
  if (left < VIEW_PAD) left = VIEW_PAD;
  if (top + height > vh - VIEW_PAD) {
    top = Math.max(VIEW_PAD, anchorRect.top - height - GAP);
  }
  return { top, left };
}

/**
 * Fixed portal popover that can escape the device bezel.
 */
export function StylePopover({
  open,
  anchorRef,
  placement = 'near-target',
  onClose,
  title,
  children,
  className = ''
}) {
  const panelRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef?.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const next = resolvePosition(
      anchor.getBoundingClientRect(),
      panel.getBoundingClientRect(),
      placement
    );
    setCoords(next);
  }, [anchorRef, placement]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onReposition) : null;
    if (panelRef.current && observer) observer.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      observer?.disconnect();
    };
  }, [open, updatePosition, children]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const onPointer = (event) => {
      const panel = panelRef.current;
      const anchor = anchorRef?.current;
      if (panel?.contains(event.target) || anchor?.contains(event.target)) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className={`bb-style-popover ${className}`.trim()}
      style={{ top: coords.top, left: coords.left }}
      role="dialog"
      aria-label={title || 'Style options'}
    >
      {title ? <p className="bb-style-popover-title">{title}</p> : null}
      {children}
    </div>,
    document.body
  );
}
