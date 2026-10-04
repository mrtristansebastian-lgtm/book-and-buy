import { Button } from '../../../../shared/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { uploadPublicImage } from '../../../../shared/firebase/integrations';
import { ImageCropModal } from '../../../media/ImageCropModal';
import { BlankMedia } from '../../../../shared/ui/BlankMedia';

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
  placeholderLabel = 'Upload image',
  editLabel = 'Edit image',
  storageFolder = 'website',
  preset = 'about',
  compact = false
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
    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
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
      if (!result?.url) throw new Error('Upload failed.');
      if (result.localOnly) {
        /* Demo mode only — still apply so studio works offline */
        onChange?.(result.url);
        setDraft(result.url);
      } else {
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
    if (!src) {
      return (
        <div className={`bb-editable-image-empty ${className}`} aria-hidden="true">
          <BlankMedia variant={preset === 'logo' ? 'avatar' : preset === 'hero' ? 'hero' : preset === 'socialBanner' ? 'banner' : 'image'} />
        </div>
      );
    }
    return (
      <div className={className}>
        <img src={src} alt={alt} className={imgClassName || 'w-full h-full object-cover'} />
      </div>
    );
  }

  const isEmpty = !src;

  return (
    <>
      <div
        className={`bb-editable-image${isEmpty ? ' is-empty' : ''} ${className}`}
        ref={popRef}
      >
        {src ? (
          <img src={src} alt={alt} className={imgClassName || 'w-full h-full object-cover'} />
        ) : (
          <div className={`bb-editable-image-blank${compact ? ' is-compact' : ''}`}>
            <BlankMedia
              variant={
                preset === 'logo'
                  ? 'avatar'
                  : preset === 'hero'
                    ? 'hero'
                    : preset === 'socialBanner'
                      ? 'banner'
                      : 'image'
              }
              className="bb-editable-image-blank-media"
            />
            <div className="bb-editable-image-blank-frame" aria-hidden="true" />
            {compact ? <button type="button" className="bb-editable-image-compact" disabled={busy}
              aria-label={placeholderLabel || 'Add image'} onClick={() => setOpen(true)}>
              <ImagePlus size={22} strokeWidth={1.6} aria-hidden="true" />
            </button> : <><Button action="upload" variant="secondary"
              type="button"
              className="bb-editable-image-upload"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} strokeWidth={2.1} aria-hidden="true" />
              <span>{busy ? 'Uploading…' : placeholderLabel || 'Upload image'}</span>
            </Button>
            <Button action="link" variant="secondary"
              type="button"
              className="bb-editable-image-url-link"
              disabled={busy}
              onClick={() => setOpen(true)}
            >
              or paste URL
            </Button>
            </>}
            {error ? <p className="bb-editable-image-blank-error">{error}</p> : null}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />

        {!isEmpty ? (
          <div className="bb-editable-image-actions">
            {compact ? <button type="button" className="bb-editable-image-hit bb-editable-image-icon"
              disabled={busy} aria-label={busy ? 'Uploading image' : editLabel} aria-expanded={open}
              onClick={() => setOpen((prev) => !prev)}><Pencil size={16} strokeWidth={1.6} aria-hidden="true" /></button> : <Button action="edit" variant="secondary"
              type="button"
              className="bb-editable-image-hit"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={busy ? 'Uploading image' : editLabel}
              aria-expanded={open}
            >
              <ImagePlus size={14} strokeWidth={2.2} aria-hidden="true" />
              <span>{busy ? 'Uploading…' : 'Edit'}</span>
            </Button>}
            <button
              type="button"
              className="bb-editable-image-delete"
              disabled={busy}
              aria-label="Delete image"
              title="Delete image"
              onClick={() => {
                setOpen(false);
                setDraft('');
                setError('');
                onChange?.('');
              }}
            >
              <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        ) : null}

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
            <div className="flex flex-wrap gap-2 justify-end">
              <Button action="upload" variant="secondary"
                type="button"
                className="bb-ghost-btn py-1.5 px-3 text-xs"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Upload &amp; crop
              </Button>
              {src || draft.trim() ? (
                <Button action="crop" variant="secondary"
                  type="button"
                  className="bb-ghost-btn py-1.5 px-3 text-xs"
                  disabled={busy}
                  onClick={() => openCrop(draft.trim() || src)}
                >
                  Adjust crop
                </Button>
              ) : null}
              <Button action="cancel" variant="secondary"
                type="button"
                className="bb-ghost-btn py-1.5 px-3 text-xs"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button action="save" variant="primary"
                type="button"
                className="bb-primary-btn py-1.5 px-3 text-xs"
                disabled={busy}
                onClick={() => saveUrl(draft.trim())}
              >
                Save URL
              </Button>
            </div>
            {error ? <p className="m-0 text-xs text-red-600">{error}</p> : null}
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
          popRef.current?.querySelector('button[aria-expanded], .bb-editable-image-compact')?.focus();
        }}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
