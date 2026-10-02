import { useEffect, useRef, useState } from 'react';
import { fitViewport, mapToScreen, screenToMap } from '../utils/mapViewport';

export function useMapViewport({ width = 1000, height = 500, initialZoom = 1, maxZoom = 4, enabled = true, onGesture }) {
  const stageRef = useRef(null);
  const [view, setView] = useState(() => fitViewport(width, height, initialZoom));
  const viewRef = useRef(view); viewRef.current = view;
  const pointers = useRef(new Map()); const gesture = useRef(null); const suppressClick = useRef(false);
  const [size, setSize] = useState({ width, height });
  useEffect(() => {
    const stage = stageRef.current; if (!stage) return undefined;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage); return () => observer.disconnect();
  }, [enabled]);
  const update = (next) => { viewRef.current = next; setView(next); };
  const reset = () => { update(fitViewport(width, height, initialZoom)); onGesture?.(); };
  const setZoom = (value, anchor) => {
    const nextZoom = Math.max(1, Math.min(maxZoom, value));
    const current = viewRef.current; const rect = stageRef.current?.getBoundingClientRect();
    let center = current;
    if (anchor && rect) {
      const fixed = screenToMap(anchor, rect, current);
      const next = fitViewport(width, height, nextZoom, current);
      const shifted = screenToMap(anchor, rect, next);
      center = { x: current.x + fixed.x - shifted.x, y: current.y + fixed.y - shifted.y };
    }
    update(fitViewport(width, height, nextZoom, center)); onGesture?.();
  };
  const snapshot = () => {
    const points = [...pointers.current.values()];
    const midpoint = points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
    return { midpoint, distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0, view: viewRef.current };
  };
  const bind = {
    onPointerDown(event) {
      if (event.target.closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (!pointers.current.size) suppressClick.current = false;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); gesture.current = snapshot();
      if (pointers.current.size > 1) { suppressClick.current = true; onGesture?.(); }
    },
    onPointerMove(event) {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const start = gesture.current; const next = snapshot(); if (!start?.midpoint || !next.midpoint) return;
      const pinching = next.distance > 0 && start.distance > 0;
      if (!pinching && start.view.zoom <= 1) return;
      if (!suppressClick.current && Math.hypot(next.midpoint.x - start.midpoint.x, next.midpoint.y - start.midpoint.y) < 5) return;
      suppressClick.current = true; onGesture?.(); event.currentTarget.setPointerCapture?.(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      const zoom = pinching ? Math.max(1, Math.min(maxZoom, start.view.zoom * next.distance / start.distance)) : start.view.zoom;
      const fixed = screenToMap(start.midpoint, rect, start.view);
      const fitted = fitViewport(width, height, zoom, start.view);
      const destination = screenToMap(next.midpoint, rect, fitted);
      update(fitViewport(width, height, zoom, { x: fitted.x + fixed.x - destination.x, y: fitted.y + fixed.y - destination.y }));
    },
    onPointerUp(event) { pointers.current.delete(event.pointerId); gesture.current = pointers.current.size ? snapshot() : null; },
    onPointerCancel(event) { pointers.current.delete(event.pointerId); gesture.current = pointers.current.size ? snapshot() : null; }
  };
  return { stageRef, size, zoom: view.zoom, viewBox: `${view.x - view.width / 2} ${view.y - view.height / 2} ${view.width} ${view.height}`, setZoom, reset, bind, suppressClick, isGesturing: () => suppressClick.current && pointers.current.size > 0,
    pointFromEvent: (event) => screenToMap({ x: event.clientX, y: event.clientY }, stageRef.current.getBoundingClientRect(), viewRef.current),
    tooltip: (point) => { const result = mapToScreen(point, { width: size.width, height: size.height }, view); return { '--map-x': `${Math.max(95, Math.min(size.width - 95, result.x))}px`, '--map-y': `${Math.max(78, Math.min(size.height - 8, result.y))}px` }; }
  };
}
