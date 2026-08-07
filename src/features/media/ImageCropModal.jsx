import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Expand, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { createPreviewUrl, exportCroppedImage } from './cropImage';
import { resolveImagePreset } from './imagePresets';

/**
 * Shared crop / fill / fit modal. Exports a File at the preset pixel size.
 */
export function ImageCropModal({
  open,
  source,
  preset: presetProp = 'socialPost',
  fileNameHint = '',
  onCancel,
  onConfirm
}) {
  const preset = useMemo(() => resolveImagePreset(presetProp), [presetProp]);
  const [preview, setPreview] = useState({ url: '', revoke: () => {} });
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState('fill');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !source) {
      setPreview((prev) => {
        prev.revoke?.();
        return { url: '', revoke: () => {} };
      });
      return undefined;
    }
    const next = createPreviewUrl(source);
    setPreview(next);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setFitMode('fill');
    setCroppedAreaPixels(null);
    setError('');
    setBusy(false);
    return () => next.revoke?.();
  }, [open, source]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirm = async () => {
    if (!preview.url || !croppedAreaPixels) {
      setError('Adjust the crop frame first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const file = await exportCroppedImage(preview.url, croppedAreaPixels, preset, {
        fitMode
      });
      // Prefer original name stem when cropping a File
      if (fileNameHint && file instanceof File) {
        const named = new File([file], fileNameHint.replace(/\.\w+$/, '') + '-cropped.jpg', {
          type: file.type
        });
        await onConfirm?.(named);
      } else {
        await onConfirm?.(file);
      }
      setBusy(false);
    } catch (err) {
      setError(err?.message || 'Could not crop image');
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="bb-image-crop" role="dialog" aria-modal="true" aria-label="Crop image">
      <div className="bb-image-crop-shell">
        <header className="bb-image-crop-head">
          <div>
            <p className="bb-image-crop-eyebrow">Crop image</p>
            <h2 className="bb-image-crop-title">
              {preset.label} · {preset.width}×{preset.height}
            </h2>
          </div>
          <button
            type="button"
            className="bb-image-crop-icon-btn"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>

        <div className="bb-image-crop-stage">
          {preview.url ? (
            <Cropper
              image={preview.url}
              crop={crop}
              zoom={zoom}
              aspect={preset.aspect}
              objectFit={fitMode === 'fit' ? 'contain' : 'cover'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              classes={{
                containerClassName: 'bb-image-crop-container',
                mediaClassName: 'bb-image-crop-media',
                cropAreaClassName: 'bb-image-crop-area'
              }}
            />
          ) : null}
        </div>

        <div className="bb-image-crop-toolbar">
          <div className="bb-image-crop-modes" role="group" aria-label="Fit mode">
            <button
              type="button"
              className={`bb-image-crop-mode${fitMode === 'fill' ? ' is-active' : ''}`}
              aria-pressed={fitMode === 'fill'}
              disabled={busy}
              onClick={() => {
                setFitMode('fill');
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
            >
              <Maximize2 size={15} strokeWidth={2.2} aria-hidden="true" />
              Fill
            </button>
            <button
              type="button"
              className={`bb-image-crop-mode${fitMode === 'fit' ? ' is-active' : ''}`}
              aria-pressed={fitMode === 'fit'}
              disabled={busy}
              onClick={() => {
                setFitMode('fit');
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
            >
              <Expand size={15} strokeWidth={2.2} aria-hidden="true" />
              Fit
            </button>
          </div>

          <label className="bb-image-crop-zoom">
            <ZoomOut size={15} strokeWidth={2.2} aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              disabled={busy}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom"
            />
            <ZoomIn size={15} strokeWidth={2.2} aria-hidden="true" />
          </label>
        </div>

        {error ? <p className="bb-image-crop-error">{error}</p> : null}

        <footer className="bb-image-crop-foot">
          <button
            type="button"
            className="bb-ghost-btn py-2 px-4 text-sm"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bb-primary-btn py-2 px-4 text-sm"
            disabled={busy || !croppedAreaPixels}
            onClick={confirm}
          >
            {busy ? 'Saving…' : 'Use photo'}
          </button>
        </footer>
      </div>
    </div>
  );
}
