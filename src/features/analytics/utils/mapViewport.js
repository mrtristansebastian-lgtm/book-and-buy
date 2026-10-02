export function fitViewport(width, height, zoom = 1, center, origin = { x: 0, y: 0 }) {
  center ??= { x: origin.x + width / 2, y: origin.y + height / 2 };
  const w = width / zoom; const h = height / zoom;
  return { x: Math.max(origin.x + w / 2, Math.min(origin.x + width - w / 2, center.x)), y: Math.max(origin.y + h / 2, Math.min(origin.y + height - h / 2, center.y)), zoom, width: w, height: h };
}

export function screenToMap(point, rect, view) {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  return { x: view.x + (point.x - rect.left - rect.width / 2) / scale, y: view.y + (point.y - rect.top - rect.height / 2) / scale };
}

export function mapToScreen(point, rect, view) {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  return { x: rect.width / 2 + (point.x - view.x) * scale, y: rect.height / 2 + (point.y - view.y) * scale };
}

/** Same anchor-preserving transform for button zoom, mouse drag and touch pinch. */
export function navigateMapGesture({ width, height, view, rect, from, to = from, ratio = 1, maxZoom = 4, origin }) {
  const zoom = Math.max(1, Math.min(maxZoom, view.zoom * ratio));
  const fixed = screenToMap(from, rect, view);
  const fitted = fitViewport(width, height, zoom, view, origin);
  const destination = screenToMap(to, rect, fitted);
  return fitViewport(width, height, zoom, { x: fitted.x + fixed.x - destination.x, y: fitted.y + fixed.y - destination.y }, origin);
}
