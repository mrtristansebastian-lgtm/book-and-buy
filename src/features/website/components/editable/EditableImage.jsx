import { useEffect, useRef, useState } from 'react';
import { uploadPublicImage } from '../../../../shared/firebase/integrations';
import { ImageCropModal } from '../../../media/ImageCropModal';

/**
 * Image with crop-to-preset upload + URL popover in Edit mode.
 */
export function EditableImage({
  src = '',
  alt = '',
  onChange,
  editMode = false,
  className = '',
  imgClassName = '',
  placeholderLabel = 'Add image URL',
  storageFolder = 'website',
  preset = 'about'
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(src || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const popRef = useRef(null);
  const fileRef = useRef(null);

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

  const saveUrl = (url) => {
    onChange?.(url);
    setOpen(false);
    setError('');
  };

  const openCrop = (source, name = '') => {
    setCropSource(source);
    setFileNameHint(name);
    setCropOpen(true);
    setOpen(false);
  };

  const onPickFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    openCrop(file, file.name || '');
  };

  const onCropConfirm = async (file) => {
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, storageFolder);
      if (result.url) {
        onChange?.(result.url);
        setDraft(result.url);
      }
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  if (!editMode) {
    if (!src) return <div className={`bb-editable-image-empty ${className}`} aria-hidden="true" />;
    return (
      <div className={className}>
        <img src={src} alt={alt} className={imgClassName || 'w-full h-full object-cover'} />
      </div>
    );
  }

  return (
    <>
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
          aria-label="Edit image"
        >
          {busy ? 'Uploading…' : 'Edit image'}
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
                  if (event.key === 'Enter') saveUrl(draft.trim());
                }}
              />
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="bb-ghost-btn py-1.5 px-3 text-xs"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Upload &amp; crop
              </button>
              {src || draft.trim() ? (
                <button
                  type="button"
                  className="bb-ghost-btn py-1.5 px-3 text-xs"
                  disabled={busy}
                  onClick={() => openCrop(draft.trim() || src)}
                >
                  Adjust crop
                </button>
              ) : null}
              <button
                type="button"
                className="bb-ghost-btn py-1.5 px-3 text-xs"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bb-primary-btn py-1.5 px-3 text-xs"
                disabled={busy}
                onClick={() => saveUrl(draft.trim())}
              >
                Save URL
              </button>
            </div>
            {error ? <p className="m-0 text-xs text-red-600">{error}</p> : null}
            <p className="m-0 text-[0.68rem] text-black/40">
              Uploads are cropped to the surface size, then saved to Storage when signed in.
            </p>
          </div>
        ) : null}
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset={preset}
        fileNameHint={fileNameHint}
        onCancel={() => {
          if (busy) return;
          setCropOpen(false);
          setCropSource(null);
        }}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
