import { useEffect, useRef, useState } from 'react';
import { Palette, PaintBucket, Underline } from 'lucide-react';
import { EditableColor } from './EditableColor';
import {
  isSolidColorToken,
  readStyleToken,
  styleTokenColor
} from './styleTokens';

/**
 * Inline text editor for Pages studio Edit mode.
 * Color tools appear only while this element is active (focused / style panel open).
 */
export function EditableText({
  value = '',
  onChange,
  editMode = false,
  as: Tag = 'span',
  className = '',
  multiline = false,
  placeholder = 'Click to edit',
  ariaLabel,
  website,
  patchWebsite,
  colorTokenId,
  accentTokenId,
  fillTokenId,
  fillAllowGradient = false,
  fillTitle = 'Fill',
  style
}) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const token = readStyleToken(website, colorTokenId);
  const accentToken = readStyleToken(website, accentTokenId);
  const fillToken = readStyleToken(website, fillTokenId);
  const color = styleTokenColor(token);
  const accentSolid = styleTokenColor(accentToken);
  const accentIsSolid = isSolidColorToken(accentToken);
  const fillSolid = styleTokenColor(fillToken);
  const fillIsSolid = isSolidColorToken(fillToken);
  const hasStyleTools = Boolean(colorTokenId || accentTokenId || fillTokenId);
  const styleActive = focused || colorOpen || accentOpen || fillOpen;
  const mergedStyle = {
    ...style,
    ...(color ? { color } : null),
    ...(accentTokenId && accentIsSolid
      ? { '--bb-underline-color': accentSolid }
      : null)
  };

  useEffect(() => {
    if (!editMode || !ref.current || focused) return;
    if (ref.current.textContent !== (value || '')) {
      ref.current.textContent = value || '';
    }
  }, [value, editMode, focused]);

  if (!editMode) {
    if (!value) return null;
    return (
      <Tag
        className={className}
        style={mergedStyle}
        data-underline-solid={accentIsSolid ? 'true' : undefined}
      >
        {value}
      </Tag>
    );
  }

  const textNode = (
    <Tag
      ref={ref}
      className={`bb-editable-text ${className} ${focused ? 'is-focused' : ''} ${
        !value ? 'is-empty' : ''
      }`}
      style={mergedStyle}
      data-underline-solid={accentIsSolid ? 'true' : undefined}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel || placeholder}
      data-placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (wrapRef.current?.contains(nextTarget)) return;
        setFocused(false);
        const next = (ref.current?.innerText || '').replace(/\u00a0/g, ' ').trim();
        if (next !== (value || '').trim()) onChange?.(next);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );

  if (!hasStyleTools || !patchWebsite) return textNode;

  const closePanels = (except) => {
    if (except !== 'color') setColorOpen(false);
    if (except !== 'accent') setAccentOpen(false);
    if (except !== 'fill') setFillOpen(false);
  };

  return (
    <span
      className={`bb-editable-text-shell${styleActive ? ' is-style-active' : ''}`}
      ref={wrapRef}
    >
      {textNode}
      {styleActive ? (
        <span className="bb-editable-text-tools">
          {colorTokenId ? (
            <button
              type="button"
              className="bb-editable-text-color"
              aria-label={`Edit color for ${placeholder}`}
              title="Text color"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closePanels('color');
                setColorOpen(true);
              }}
            >
              <Palette size={18} strokeWidth={2.1} aria-hidden="true" />
              <span
                className="bb-editable-text-color-swatch"
                style={{ background: color || 'currentColor' }}
                aria-hidden="true"
              />
            </button>
          ) : null}
          {accentTokenId ? (
            <button
              type="button"
              className="bb-editable-text-color"
              aria-label={`Edit underline for ${placeholder}`}
              title="Underline style"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closePanels('accent');
                setAccentOpen(true);
              }}
            >
              <Underline size={18} strokeWidth={2.1} aria-hidden="true" />
              <span
                className="bb-editable-text-color-swatch"
                style={{
                  background: accentIsSolid
                    ? accentSolid
                    : 'var(--native-accent-button-gradient)'
                }}
                aria-hidden="true"
              />
            </button>
          ) : null}
          {fillTokenId ? (
            <button
              type="button"
              className="bb-editable-text-color"
              aria-label={`Edit ${fillTitle.toLowerCase()}`}
              title={fillTitle}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closePanels('fill');
                setFillOpen(true);
              }}
            >
              <PaintBucket size={18} strokeWidth={2.1} aria-hidden="true" />
              <span
                className="bb-editable-text-color-swatch"
                style={{
                  background: fillIsSolid
                    ? fillSolid
                    : 'var(--native-accent-button-gradient)'
                }}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </span>
      ) : null}
      {colorTokenId ? (
        <EditableColor
          open={colorOpen}
          anchorRef={wrapRef}
          website={website}
          patchWebsite={patchWebsite}
          tokenId={colorTokenId}
          title="Text color"
          onClose={() => setColorOpen(false)}
        />
      ) : null}
      {accentTokenId ? (
        <EditableColor
          open={accentOpen}
          anchorRef={wrapRef}
          website={website}
          patchWebsite={patchWebsite}
          tokenId={accentTokenId}
          title="Underline"
          allowGradient
          onClose={() => setAccentOpen(false)}
        />
      ) : null}
      {fillTokenId ? (
        <EditableColor
          open={fillOpen}
          anchorRef={wrapRef}
          website={website}
          patchWebsite={patchWebsite}
          tokenId={fillTokenId}
          title={fillTitle}
          allowGradient={fillAllowGradient}
          onClose={() => setFillOpen(false)}
        />
      ) : null}
    </span>
  );
}
