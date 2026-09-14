import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  clampImagePan,
  createPreviewUrl,
  exportFramedImage,
  getCoverSize,
  readImageFrame
} from './cropImage';
import { resolveImagePreset } from './imagePresets';

const MAX_ZOOM = 3;
const MAX_FRAME_WIDTH = 320;

function formatAspectLabel(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return '—';
  if (Math.abs(aspect - 1) < 0.03) return '1:1';
  if (Math.abs(aspect - 4 / 5) < 0.03) return '4:5';
  if (Math.abs(aspect - 5 / 4) < 0.03) return '5:4';
  if (Math.abs(aspect - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(aspect - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(aspect - 3 / 2) < 0.03) return '3:2';
  if (Math.abs(aspect - 2 / 3) < 0.03) return '2:3';
  if (Math.abs(aspect - 1.91) < 0.05) return '1.91:1';
  return `${aspect.toFixed(2)}:1`;
}

/**
 * The frame auto-sizes to the uploaded photo's own shape, so any aspect ratio
 * posts as-is — cropped only when the user zooms, never padded with bars.
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
  const previewRef = useRef({ url: '', revoke: () => {} });
  const stageRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const loadGenRef = useRef(0);
  const framedRef = useRef(null);
  const applyZoomRef = useRef(() => {});

  const [previewUrl, setPreviewUrl] = useState('');
  const [frame, setFrame] = useState(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !source) {
      loadGenRef.current += 1;
      previewRef.current.revoke?.();
      previewRef.current = { url: '', revoke: () => {} };
      setPreviewUrl('');
      setFrame(null);
      setLoading(false);
      return undefined;
    }

    const gen = ++loadGenRef.current;
    const preview = createPreviewUrl(source);
    previewRef.current = preview;
    setPreviewUrl(preview.url);
    setFrame(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setError('');
    setBusy(false);
    setLoading(true);

    readImageFrame(preview.url, preset)
      .then((next) => {
        if (gen !== loadGenRef.current) return;
        setFrame(next);
        setLoading(false);
      })
      .catch((err) => {
        if (gen !== loadGenRef.current) return;
        setError(err?.message || 'Could not load image');
        setLoading(false);
      });

    return () => {
      loadGenRef.current += 1;
      preview.revoke?.();
      previewRef.current = { url: '', revoke: () => {} };
    };
  }, [open, source, preset]);

  // Measure the stage, then size the frame ourselves so its box always
  // matches the post shape exactly (CSS aspect-ratio can lose to max-height).
  useEffect(() => {
    const node = stageRef.current;
    if (!open || !node) return undefined;
    const measure = () => {
      const box = node.getBoundingClientRect();
      setStage({ width: box.width, height: box.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  const frameAspect = frame?.frameAspect || preset.aspect;

  const viewport = useMemo(() => {
    if (!stage.width || !stage.height) return { width: 0, height: 0 };
    let width = Math.min(stage.width, MAX_FRAME_WIDTH);
    let height = width / frameAspect;
    if (height > stage.height) {
      height = stage.height;
      width = height * frameAspect;
    }
    return { width: Math.round(width), height: Math.round(height) };
  }, [stage, frameAspect]);

  const display = useMemo(() => {
    if (!frame || viewport.width <= 0 || viewport.height <= 0) return null;
    return getCoverSize({
      naturalAspect: frame.naturalAspect,
      viewportW: viewport.width,
      viewportH: viewport.height,
      zoom
    });
  }, [frame, viewport, zoom]);

  const centerPan = useCallback(
    (nextZoom = 1) => {
      if (!frame || viewport.width <= 0) return { x: 0, y: 0 };
      const size = getCoverSize({
        naturalAspect: frame.naturalAspect,
        viewportW: viewport.width,
        viewportH: viewport.height,
        zoom: nextZoom
      });
      return {
        x: (viewport.width - size.width) / 2,
        y: (viewport.height - size.height) / 2
      };
    },
    [frame, viewport]
  );

  // Center once per upload; later resizes keep the user's framing.
  useEffect(() => {
    if (!frame || viewport.width <= 0 || framedRef.current === frame) return;
    framedRef.current = frame;
    setZoom(1);
    setPan(centerPan(1));
  }, [frame, viewport.width, centerPan]);

  const applyZoom = (nextZoom) => {
    if (!frame || !display) return;
    const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
    const focalX = (viewport.width / 2 - pan.x) / display.width;
    const focalY = (viewport.height / 2 - pan.y) / display.height;
    const size = getCoverSize({
      naturalAspect: frame.naturalAspect,
      viewportW: viewport.width,
      viewportH: viewport.height,
      zoom: z
    });
    const next = {
      x: viewport.width / 2 - focalX * size.width,
      y: viewport.height / 2 - focalY * size.height
    };
    setZoom(z);
    setPan(clampImagePan(next, size.width, size.height, viewport.width, viewport.height));
  };

  applyZoomRef.current = applyZoom;

  // Trackpad / wheel zoom, like any standard media cropper.
  useEffect(() => {
    const node = viewportRef.current;
    if (!open || !node || !frame || busy) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      applyZoomRef.current(zoom * Math.exp(-event.deltaY * 0.0016));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [open, frame, busy, zoom]);

  const canDrag =
    !!display &&
    !busy &&
    (display.width - viewport.width > 1 || display.height - viewport.height > 1);

  const onPointerDown = (event) => {
    if (!canDrag) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...pan }
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !display) return;
    const next = {
      x: drag.origin.x + (event.clientX - drag.startX),
      y: drag.origin.y + (event.clientY - drag.startY)
    };
    setPan(clampImagePan(next, display.width, display.height, viewport.width, viewport.height));
  };

  const endDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const resetFit = () => {
    if (busy || !frame) return;
    setZoom(1);
    setPan(centerPan(1));
  };

  const confirm = async () => {
    if (!previewUrl || !frame || viewport.width <= 0) {
      setError('Wait for the photo to load.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const file = await exportFramedImage(
        previewUrl,
        { zoom, pan, viewportW: viewport.width, viewportH: viewport.height },
        preset
      );
      const named =
        fileNameHint && file instanceof File
          ? new File([file], `${fileNameHint.replace(/\.\w+$/, '')}-cropped.jpg`, {
              type: file.type
            })
          : file;
      await onConfirm?.(named);
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
            <h2 className="bb-image-crop-title">{formatAspectLabel(frameAspect)}</h2>
          </div>
          <button
            type="button"
            className="bb-image-crop-done"
            disabled={busy || loading || !frame}
            onClick={confirm}
          >
            {busy ? '…' : 'Done'}
          </button>
        </header>

        <div className="bb-image-crop-stage" ref={stageRef}>
          <div
            ref={viewportRef}
            className={`bb-image-crop-viewport${canDrag ? ' is-draggable' : ''}`}
            style={
              viewport.width
                ? { width: `${viewport.width}px`, height: `${viewport.height}px` }
                : { width: '100%', height: '100%' }
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={resetFit}
          >
            {previewUrl && display ? (
              <img
                className="bb-image-crop-photo"
                src={previewUrl}
                alt=""
                draggable={false}
                style={{
                  width: `${display.width}px`,
                  height: `${display.height}px`,
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`
                }}
              />
            ) : null}
            {loading ? <p className="bb-image-crop-loading">Loading…</p> : null}
          </div>
          <p className="bb-image-crop-hint">
            {canDrag
              ? 'Drag to reposition · double-click to reset'
              : 'Posts at its own size · zoom in to crop'}
          </p>
        </div>

        <div className="bb-image-crop-toolbar">
          <label className="bb-image-crop-zoom">
            <ZoomOut size={15} strokeWidth={2.2} aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={busy || !frame}
              onChange={(event) => applyZoom(Number(event.target.value))}
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
