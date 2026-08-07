import { useEffect, useRef, useState } from 'react';

/**
 * Inline text editor for Pages studio Edit mode.
 * View/public mode renders plain text; Edit mode uses contentEditable with blur-to-save.
 */
export function EditableText({
  value = '',
  onChange,
  editMode = false,
  as: Tag = 'span',
  className = '',
  multiline = false,
  placeholder = 'Click to edit',
  ariaLabel
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!editMode || !ref.current || focused) return;
    if (ref.current.textContent !== (value || '')) {
      ref.current.textContent = value || '';
    }
  }, [value, editMode, focused]);

  if (!editMode) {
    if (!value) return null;
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={`bb-editable-text ${className} ${focused ? 'is-focused' : ''} ${
        !value ? 'is-empty' : ''
      }`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel || placeholder}
      data-placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => {
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
}
