import { useRef, useState } from 'react';
import { EditableColor } from './EditableColor';
import {
  STYLE_TOKEN_GRADIENT,
  isSolidColorToken,
  readStyleToken,
  styleTokenColor
} from './styleTokens';

/**
 * Clickable accent/surface target for color + optional gradient editing.
 */
export function EditableStyleTarget({
  editMode = false,
  website,
  patchWebsite,
  tokenId,
  title = 'Style',
  allowGradient = false,
  as: Tag = 'span',
  className = '',
  style,
  children,
  ariaHidden = false,
  applyAs = 'color'
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const token = readStyleToken(website, tokenId);
  const solid = styleTokenColor(token);
  const useGradient = allowGradient && (token == null || token === '' || token === STYLE_TOKEN_GRADIENT);

  const nextStyle = { ...style };
  if (!useGradient && isSolidColorToken(token)) {
    if (applyAs === 'background') nextStyle.background = solid;
    else if (applyAs === 'backgroundImage') {
      nextStyle.backgroundImage = 'none';
      nextStyle.backgroundColor = solid;
    } else if (applyAs === 'fill') nextStyle.fill = solid;
    else if (applyAs === 'borderColor') nextStyle.borderColor = solid;
    else nextStyle.color = solid;
  }

  if (!editMode) {
    return (
      <Tag className={className} style={nextStyle} aria-hidden={ariaHidden || undefined}>
        {children}
      </Tag>
    );
  }

  return (
    <>
      <Tag
        ref={ref}
        className={`bb-editable-style-target ${className}`.trim()}
        style={nextStyle}
        aria-hidden={ariaHidden || undefined}
        data-style-token={tokenId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </Tag>
      <EditableColor
        open={open}
        anchorRef={ref}
        website={website}
        patchWebsite={patchWebsite}
        tokenId={tokenId}
        title={title}
        allowGradient={allowGradient}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
