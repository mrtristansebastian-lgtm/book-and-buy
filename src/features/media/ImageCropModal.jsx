import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Expand, X, ZoomIn, ZoomOut } from 'lucide-react';
import { createPreviewUrl, exportCroppedImage } from './cropImage';
import { resolveImagePreset } from './imagePresets';

function formatAspectLabel(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return '—';
  if (Math.abs(aspect - 1) < 0.03) return '1:1';
  if (Math.abs(aspect - 4 / 5) < 0.03) return '4:5';
  if (Math.abs(aspect - 5 / 4) < 0.03) return '5:4';
  if (Math.abs(aspect - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(aspect - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(aspect - 3 / 2) < 0.03) return '3:2';
  if (Math.abs(aspect - 2 / 3) < 0.03) return '2:3';
  const w = Math.round(aspect * 100);
  const h = 100;
  const g = (a, b) => (b ? g(b, a % b) : a);
  const d = g(w, h) || 1;
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

/**
 * Crop modal — Fit keeps the whole upload visible inside the preset frame (e.g. 4:5).
 * Chrome follows html[data-theme] (light by default, dark when theme is dark).
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ratioLabel = formatAspectLabel(preset.aspect);

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
    setCroppedAreaPixels(null);
    setError('');
    setBusy(false);

    return () => {
      next.revoke?.();
    };
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

  const resetFit = () => {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const confirm = async () => {
    if (!preview.url || !croppedAreaPixels) {
      setError('Adjust the crop frame first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const file = await exportCroppedImage(preview.url, croppedAreaPixels, preset);
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
    <div className="bb-image-crop" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="bb-image-crop-shell">
        <header className="bb-image-crop-head">
          <button
            type="button"
            className="bb-image-crop-icon-btn"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
          <div className="bb-image-crop-head-copy">
            <p className="bb-image-crop-eyebrow">Crop</p>
            <h2 className="bb-image-crop-title">{ratioLabel}</h2>
          </div>
          <button
            type="button"
            className="bb-image-crop-done"
            disabled={busy || !croppedAreaPixels}
            onClick={confirm}
          >
            {busy ? '…' : 'Done'}
          </button>
        </header>

        <div className="bb-image-crop-stage bb-image-crop-stage--fit">
          {preview.url ? (
            <Cropper
              image={preview.url}
              crop={crop}
              zoom={zoom}
              aspect={preset.aspect}
              objectFit="contain"
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
          <p className="bb-image-crop-guide">
            Fit keeps every corner of your upload visible inside {ratioLabel}
          </p>
        </div>

        <div className="bb-image-crop-toolbar">
          <div className="bb-image-crop-modes" role="group" aria-label="Fit mode">
            <button
              type="button"
              className="bb-image-crop-mode is-active"
              aria-pressed="true"
              disabled={busy}
              onClick={resetFit}
              title="Fit: show the whole uploaded image inside the frame"
            >
              <Expand size={16} strokeWidth={2.2} aria-hidden="true" />
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
      </div>
    </div>
  );
}
