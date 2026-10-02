export function fitViewport(width, height, zoom = 1, center = { x: width / 2, y: height / 2 }) {
  const w = width / zoom; const h = height / zoom;
  return { x: Math.max(w / 2, Math.min(width - w / 2, center.x)), y: Math.max(h / 2, Math.min(height - h / 2, center.y)), zoom, width: w, height: h };
}

export function screenToMap(point, rect, view) {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  return { x: view.x + (point.x - rect.left - rect.width / 2) / scale, y: view.y + (point.y - rect.top - rect.height / 2) / scale };
}

export function mapToScreen(point, rect, view) {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  return { x: rect.width / 2 + (point.x - view.x) * scale, y: rect.height / 2 + (point.y - view.y) * scale };
}
