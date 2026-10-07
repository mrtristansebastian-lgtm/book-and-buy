import { reportArtworkUrl } from './reportArtwork';

export const COMPASS_ARTWORK_URL = reportArtworkUrl('discovery');

/** Shared purple compass artwork with a gold pointer. */
export function CompassIcon({
  size = 24,
  width = size,
  height = size,
  className = '',
  alt = '',
  style,
  color: _color,
  strokeWidth: _strokeWidth,
  absoluteStrokeWidth: _absoluteStrokeWidth,
  focusable: _focusable,
  children: _children,
  ...props
}) {
  const labelled = Boolean(alt || props['aria-label'] || props['aria-labelledby']);

  return (
    <img
      src={COMPASS_ARTWORK_URL}
      alt={alt}
      width={width}
      height={height}
      className={`bb-compass-icon ${className}`.trim()}
      aria-hidden={labelled ? undefined : true}
      decoding="async"
      draggable="false"
      {...props}
      style={{ display: 'inline-block', objectFit: 'contain', flexShrink: 0, ...style, animation: 'none' }}
    />
  );
}
