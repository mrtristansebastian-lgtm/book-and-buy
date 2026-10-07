import { reportArtworkUrl } from './reportArtwork';

export const SEARCH_ARTWORK_URL = reportArtworkUrl('search');

/** Shared magnifying glass artwork for search and discovery surfaces. */
export function SearchIcon({
  size = 24,
  width = size,
  height = size,
  className = '',
  alt = '',
  style,
  color: _color,
  strokeWidth: _strokeWidth,
  absoluteStrokeWidth: _absoluteStrokeWidth,
  children: _children,
  ...props
}) {
  const labelled = Boolean(alt || props['aria-label'] || props['aria-labelledby']);

  return (
    <img
      src={SEARCH_ARTWORK_URL}
      alt={alt}
      width={width}
      height={height}
      className={`bb-search-icon ${className}`.trim()}
      aria-hidden={labelled ? undefined : true}
      decoding="async"
      draggable="false"
      {...props}
      style={{ display: 'inline-block', objectFit: 'contain', flexShrink: 0, ...style, animation: 'none' }}
    />
  );
}
