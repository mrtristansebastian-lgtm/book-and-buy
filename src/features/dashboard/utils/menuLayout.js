/** Reserve the actual footer and navigation height, without shrinking touch targets. */
export function menuPageSize({ height, groupHeight, footerHeight = 0, toolbarHeight = 0, count, gap = 5 }) {
  const available = Math.max(0, height - footerHeight - toolbarHeight - gap * 3);
  const full = Math.floor(available / Math.max(1, groupHeight));
  if (full >= count) return count;
  return Math.max(1, Math.min(count, Math.floor((available - 52) / Math.max(1, groupHeight))));
}
