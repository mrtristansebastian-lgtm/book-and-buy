import { Image as ImageIcon, User } from 'lucide-react';

/**
 * Industry-standard empty media surface — soft grey field with a muted glyph.
 * Use everywhere an image/avatar/banner/gallery slot has no asset yet.
 */
export function BlankMedia({
  variant = 'image',
  className = '',
  label = '',
  icon: IconProp
}) {
  const Icon =
    IconProp ||
    (variant === 'avatar' ? User : ImageIcon);
  const iconSize = variant === 'avatar' ? 22 : variant === 'banner' ? 28 : 26;

  return (
    <div
      className={`bb-blank-media bb-blank-media--${variant}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label || 'No image'}
    >
      <span className="bb-blank-media-glyph" aria-hidden="true">
        <Icon size={iconSize} strokeWidth={1.6} />
      </span>
    </div>
  );
}
