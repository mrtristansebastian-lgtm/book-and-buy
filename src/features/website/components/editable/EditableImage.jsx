import { Button } from '../../../../shared/ui/Button';
import { useRef, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { uploadPublicImage } from '../../../../shared/firebase/integrations';
import { ImageCropModal } from '../../../media/ImageCropModal';
import { BlankMedia } from '../../../../shared/ui/BlankMedia';
import { useWorkspace } from '../../../workspace/WorkspaceContext';

/**
 * Image with upload and crop controls directly on the page.
 */
export function EditableImage({
  src = '',
  alt = '',
  onChange,
  onRemove,
  editMode = false,
  className = '',
  imgClassName = '',
  placeholderLabel = 'Upload image',
  editLabel = 'Edit image',
  storageFolder = 'website',
  preset = 'about',
  compact = false
}) {
  const { workspace } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const popRef = useRef(null);
  const fileRef = useRef(null);

  const openCrop = (source, name = '') => {
    setError('');
    setCropSource(source);
    setFileNameHint(name);
    setCropOpen(true);
  };

  const onPickFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Choose a photo smaller than 20 MB.');
      return;
    }
    setError('');
    openCrop(file, file.name || '');
  };

  const onCropConfirm = async (file) => {
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, storageFolder, { demo: workspace?.isDemo === true });
      if (!result?.url) throw new Error('Upload failed.');
      onChange?.(result.url);
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
          <BlankMedia variant={preset === 'logo' ? 'avatar' : preset === 'hero' ? 'hero' : (preset === 'socialBanner' || preset === 'profileBanner') ? 'banner' : 'image'} />
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
                    : (preset === 'socialBanner' || preset === 'profileBanner')
                      ? 'banner'
                      : 'image'
              }
              className="bb-editable-image-blank-media"
            />
            <div className="bb-editable-image-blank-frame" aria-hidden="true" />
            {compact ? <button type="button" className="bb-editable-image-compact" disabled={busy}
              aria-label={placeholderLabel || 'Add image'} onClick={() => fileRef.current?.click()}>
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
              disabled={busy} aria-label={busy ? 'Uploading image' : editLabel} aria-haspopup="dialog"
              onClick={() => openCrop(src)}><Pencil size={16} strokeWidth={1.6} aria-hidden="true" /></button> : <Button action="edit" variant="secondary"
              type="button"
              className="bb-editable-image-hit"
              disabled={busy}
              onClick={() => openCrop(src)}
              aria-label={busy ? 'Uploading image' : editLabel}
              aria-haspopup="dialog"
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
                setError('');
                if (onRemove) onRemove(); else onChange?.('');
              }}
            >
              <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        ) : onRemove ? <div className="bb-editable-image-actions">
          <button type="button" className="bb-editable-image-delete" disabled={busy}
            aria-label="Delete image" title="Delete image" onClick={onRemove}>
            <Trash2 size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div> : null}

        {!isEmpty && error && !cropOpen ? <p className="bb-editable-image-blank-error" role="alert">{error}</p> : null}
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
          popRef.current?.querySelector('.bb-editable-image-hit, .bb-editable-image-compact, .bb-editable-image-upload')?.focus();
        }}
        onReplace={() => fileRef.current?.click()}
        externalError={error}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
