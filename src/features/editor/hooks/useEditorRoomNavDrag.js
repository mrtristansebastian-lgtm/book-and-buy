import { useEffect, useRef, useState } from 'react';

const clampDragOffset = (value, min, max) => Math.max(min, Math.min(max, value));

export function useEditorRoomNavDrag() {
  const [roomNavOffset, setRoomNavOffset] = useState({ x: 0, y: 0 });
  const roomNavDragRef = useRef(null);

  useEffect(() => () => roomNavDragRef.current?.cleanup?.(), []);

  const applyDragOffset = (drag, event) => {
    const nextX = drag.originX + event.clientX - drag.startX;
    const nextY = drag.originY + event.clientY - drag.startY;
    setRoomNavOffset({
      x: clampDragOffset(nextX, -260, 260),
      y: clampDragOffset(nextY, -280, 280)
    });
  };

  const startRoomNavDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    roomNavDragRef.current?.cleanup?.();
    const drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: roomNavOffset.x,
      originY: roomNavOffset.y
    };
    const moveDrag = (moveEvent) => {
      if (moveEvent.pointerId !== drag.pointerId) return;
      moveEvent.preventDefault();
      applyDragOffset(drag, moveEvent);
    };
    const endDrag = (endEvent) => {
      if (endEvent?.pointerId !== undefined && endEvent.pointerId !== drag.pointerId) return;
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      roomNavDragRef.current = null;
    };
    drag.cleanup = endDrag;
    roomNavDragRef.current = drag;
    window.addEventListener('pointermove', moveDrag, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveRoomNavDrag = (event) => {
    const drag = roomNavDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    applyDragOffset(drag, event);
  };

  const endRoomNavDrag = (event) => {
    const drag = roomNavDragRef.current;
    if (drag?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      drag.cleanup?.(event);
    }
  };

  return {
    endRoomNavDrag,
    moveRoomNavDrag,
    roomNavOffset,
    setRoomNavOffset,
    startRoomNavDrag
  };
}
