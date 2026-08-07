import { useEffect, useRef, useState } from 'react';

/**
 * Image with compact URL popover in Edit mode.
 */
export function EditableImage({
  src = '',
  alt = '',
  onChange,
  editMode = false,
  className = '',
  imgClassName = '',
  placeholderLabel = 'Add image URL'
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(src || '');
  const popRef = useRef(null);

  useEffect(() => {
    setDraft(src || '');
  }, [src]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (popRef.current && !popRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!editMode) {
    if (!src) return <div className={`bb-editable-image-empty ${className}`} aria-hidden="true" />;
    return (
      <div className={className}>
        <img src={src} alt={alt} className={imgClassName || 'w-full h-full object-cover'} />
      </div>
    );
  }

  return (
    <div className={`bb-editable-image ${className}`} ref={popRef}>
      {src ? (
        <img src={src} alt={alt} className={imgClassName || 'w-full h-full object-cover'} />
      ) : (
        <div
          className={`bb-editable-image-empty grid place-items-center text-sm ${
            className.includes('absolute') ? 'absolute inset-0 text-white/80' : 'text-black/40'
          }`}
        >
          {placeholderLabel}
        </div>
      )}
      <button
        type="button"
        className="bb-editable-image-hit"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Edit image URL"
      >
        Edit image
      </button>
      {open ? (
        <div className="bb-editable-image-pop">
          <label className="grid gap-1 text-xs font-semibold">
            Image URL
            <input
              className="native-control-input px-3 py-2 text-sm"
              value={draft}
              placeholder="/example/... or https://"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onChange?.(draft.trim());
                  setOpen(false);
                }
              }}
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" className="bb-ghost-btn py-1.5 px-3 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn py-1.5 px-3 text-xs"
              onClick={() => {
                onChange?.(draft.trim());
                setOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
