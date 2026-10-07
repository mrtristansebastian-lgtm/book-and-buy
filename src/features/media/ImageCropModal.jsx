import { Button } from '../../shared/ui/Button';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDetailDialog } from '../../shared/ui/useDetailDialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  clampImagePan,
  createPreviewUrl,
  exportFramedImage,
  getCoverSize,
  readImageFrame,
  moveCropSelection,
  fitCropSelection,
  resizeCropSelection
} from './cropImage';
import { resolveImagePreset } from './imagePresets';

const MAX_ZOOM = 3;
const MAX_FRAME_WIDTH = 640;

function formatAspectLabel(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return '—';
  if (Math.abs(aspect - 1) < 0.03) return '1:1';
  if (Math.abs(aspect - 3) < 0.03) return '3:1';
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
 * Fixed slots crop to their display ratio. Flexible photos keep their original
 * shape or a selected ratio. Zoom and pan always keep the frame covered.
 */
export function ImageCropModal({
  open,
  source,
  preset: presetProp = 'socialPost',
  fileNameHint = '',
  onCancel,
  onReplace,
  externalError = '',
  onConfirm
}) {
  const preset = useMemo(() => resolveImagePreset(presetProp), [presetProp]);
  const previewRef = useRef({ url: '', revoke: () => {} });
  const stageRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const loadGenRef = useRef(0);
  const framedRef = useRef(null);
  const previousViewportRef = useRef(null);
  const applyZoomRef = useRef(() => {});

  const [previewUrl, setPreviewUrl] = useState('');
  const [frame, setFrame] = useState(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ratioId, setRatioId] = useState('original');
  const [showGrid, setShowGrid] = useState(true);
  const cancelRef = useRef({ busy, onCancel });
  cancelRef.current = { busy, onCancel };
  const cancel = useCallback(() => {
    if (!cancelRef.current.busy) cancelRef.current.onCancel?.();
  }, []);
  const dialogRef = useDetailDialog(open, cancel);

  const ratioOptions = preset.ratioOptions || null;

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
    framedRef.current = null;
    setSelection(null);
    previousViewportRef.current = null;
    pointersRef.current.clear();
    pinchRef.current = null;
    dragRef.current = null;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setError('');
    setBusy(false);
    setLoading(true);
    setRatioId('original');

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
      const styles = getComputedStyle(node);
      const hint = node.querySelector('.bb-image-crop-hint');
      setStage({
        width: box.width - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight) - 60,
        height: box.height - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
          - (hint?.getBoundingClientRect().height || 0) - (parseFloat(styles.rowGap) || 0)
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, frame]);

  const chosenRatio = ratioOptions?.find((option) => option.id === ratioId);
  const frameAspect =
    chosenRatio && chosenRatio.aspect > 0
      ? chosenRatio.aspect
      : frame?.frameAspect || preset.aspect;

  const viewport = useMemo(() => {
    if (!stage.width || !stage.height) return { width: 0, height: 0 };
    let width = Math.min(stage.width, stage.width <= 420 ? 320 : MAX_FRAME_WIDTH);
    const photoAspect = frame?.naturalAspect || frameAspect;
    let height = width / photoAspect;
    if (height > stage.height) {
      height = stage.height;
      width = height * photoAspect;
    }
    return { width: Math.round(width), height: Math.round(height) };
  }, [stage, frame, frameAspect]);

  const initialSelection = useCallback(() => {
    return fitCropSelection(viewport, frameAspect);
  }, [viewport, frameAspect]);

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

  // Re-center on a new upload or a ratio change; plain resizes keep the framing.
  const frameKey = frame ? `${frame.width}x${frame.height}@${frameAspect.toFixed(4)}` : '';
  useEffect(() => {
    if (!frame || viewport.width <= 0) return;
    const previous = previousViewportRef.current;
    if (framedRef.current !== frameKey) {
      framedRef.current = frameKey;
      setZoom(1);
      setPan(centerPan(1));
      setSelection(initialSelection());
    } else if (previous && (previous.width !== viewport.width || previous.height !== viewport.height)) {
      const size = getCoverSize({ naturalAspect: frame.naturalAspect,
        viewportW: viewport.width, viewportH: viewport.height, zoom });
      setPan(current => clampImagePan({ x: current.x * viewport.width / previous.width,
        y: current.y * viewport.height / previous.height }, size.width, size.height, viewport.width, viewport.height));
      setSelection(current => current ? { x: current.x * viewport.width / previous.width,
        y: current.y * viewport.height / previous.height, width: current.width * viewport.width / previous.width,
        height: current.height * viewport.height / previous.height } : null);
    }
    previousViewportRef.current = viewport;
  }, [frame, frameKey, viewport, centerPan, zoom, initialSelection]);

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
    if (busy || !frame || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      dragRef.current = null;
      return;
    }
    const cropTarget = event.target.closest('.bb-image-crop-grid');
    if (!canDrag && !cropTarget) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...pan }, selection: selection ? { ...selection } : null,
      mode: cropTarget ? event.target.closest('[data-corner]')?.dataset.corner || 'move' : 'photo'
    };
  };

  const onPointerMove = (event) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointersRef.current.size === 2 && pinchRef.current?.distance > 0) {
      const [a, b] = [...pointersRef.current.values()];
      applyZoom(pinchRef.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchRef.current.distance);
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !display) return;
    if (drag.mode !== 'photo' && drag.selection) {
      const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
      setSelection(drag.mode === 'move' ? moveCropSelection(drag.selection, dx, dy, viewport)
        : resizeCropSelection(drag.selection, drag.mode, dx, dy, viewport));
      return;
    }
    const next = {
      x: drag.origin.x + (event.clientX - drag.startX),
      y: drag.origin.y + (event.clientY - drag.startY)
    };
    setPan(clampImagePan(next, display.width, display.height, viewport.width, viewport.height));
  };

  const endDrag = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const fitImage = () => {
    if (busy || !frame) return;
    pointersRef.current.clear();
    dragRef.current = null;
    pinchRef.current = null;
    setZoom(1);
    setPan(centerPan(1));
    setSelection(initialSelection());
  };
  const resetFit = () => {
    if (busy || !frame) return;
    setRatioId('original');
    fitImage();
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
        { zoom, pan, selection, viewportW: viewport.width, viewportH: viewport.height, frameAspect },
        preset
      );
      const named =
        fileNameHint && file instanceof File
          ? new File([file], `${fileNameHint.replace(/\.\w+$/, '')}-cropped.${file.type === 'image/png' ? 'png' : 'jpg'}`, {
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

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={dialogRef} className="bb-image-crop" role="dialog" aria-modal="true" aria-label="Crop photo" aria-busy={busy || undefined}>
      <div className="bb-image-crop-shell">
        <header className="bb-image-crop-head">
          <button
            type="button"
            className="bb-image-crop-icon-btn"
            aria-label="Close"
            disabled={busy}
            onClick={cancel}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
          <div className="bb-image-crop-head-copy">
            <p className="bb-image-crop-eyebrow">Crop</p>
            <h2 className="bb-image-crop-title">{formatAspectLabel(frameAspect)}</h2>
          </div>
          <Button action="confirm" variant="secondary" busy={busy} busyLabel="Saving…"
            type="button"
            className="bb-image-crop-done"
            disabled={busy || loading || !frame}
            onClick={confirm}
          >
            Done
          </Button>
        </header>

        <div className="bb-image-crop-stage" ref={stageRef}
          style={{ '--bb-crop-aspect': frame?.naturalAspect || frameAspect }}>
          <div className="bb-image-crop-workspace">
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
            onLostPointerCapture={endDrag}
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
            {frame && selection ? <div className="bb-image-crop-grid" role="group" aria-label="Crop selection" tabIndex={0}
              style={{ left:selection.x, top:selection.y, width:selection.width, height:selection.height }}
              onKeyDown={event => {
                if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || busy) return;
                event.preventDefault(); const amount = event.shiftKey ? 10 : 2;
                setSelection(current => moveCropSelection(current, event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0,
                  event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0, viewport));
              }}>
              {showGrid ? <><span /><span /><span /><span /></> : null}
              {['top-left','top-right','bottom-left','bottom-right'].map(corner => <button key={corner}
                type="button" className={`bb-image-crop-handle is-${corner}`} data-corner={corner}
                aria-label={`Resize crop ${corner}`} disabled={busy}
                onKeyDown={event => {
                  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
                  event.preventDefault(); event.stopPropagation();
                  setSelection(current => resizeCropSelection(current, corner,
                    event.key === 'ArrowLeft' ? -4 : event.key === 'ArrowRight' ? 4 : 0,
                    event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : 0, viewport));
                }} />)}
            </div> : null}
            {loading ? <p className="bb-image-crop-loading">Loading…</p> : null}
          </div>
          <div className="bb-image-crop-zoom-side">
            <button type="button" className="bb-image-crop-zoom-step" aria-label="Zoom in"
              disabled={busy || !frame || zoom >= MAX_ZOOM} onClick={() => applyZoom(zoom + .1)}>
              <ZoomIn size={18} aria-hidden="true" />
            </button>
            <output className="bb-image-crop-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</output>
            <input type="range" min={1} max={MAX_ZOOM} step={.01} value={zoom}
              disabled={busy || !frame} aria-label="Zoom" aria-orientation="vertical"
              aria-valuetext={`${Math.round(zoom * 100)} percent`}
              style={{ height: `${Math.max(60, Math.min(260, viewport.height - 84))}px` }}
              onChange={event => applyZoom(Number(event.target.value))} />
            <button type="button" className="bb-image-crop-zoom-step" aria-label="Zoom out"
              disabled={busy || !frame || zoom <= 1} onClick={() => applyZoom(zoom - .1)}>
              <ZoomOut size={18} aria-hidden="true" />
            </button>
          </div>
          </div>
          <p className="bb-image-crop-hint">
            Drag the selection to crop · drag corners to resize
          </p>
        </div>

        <div className="bb-image-crop-toolbar">
          <div className="bb-image-crop-tools">
            {onReplace ? <Button action="upload" variant="secondary" disabled={busy}
              onClick={onReplace}>Change photo</Button> : null}
            <Button variant="secondary" disabled={busy || !frame} aria-pressed={showGrid}
              onClick={() => setShowGrid(value => !value)}>Grid</Button>
            <Button variant="secondary" disabled={busy || !frame}
              onClick={fitImage}>Fit</Button>
            <Button action="reset" variant="secondary" disabled={busy || !frame}
              onClick={resetFit}>Reset</Button>
          </div>
          {ratioOptions ? (
            <div className="bb-image-crop-ratios" role="group" aria-label="Aspect ratio">
              {ratioOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`bb-image-crop-ratio${ratioId === option.id ? ' is-active' : ''}`}
                  aria-pressed={ratioId === option.id}
                  disabled={busy || !frame}
                  onClick={() => setRatioId(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {error || externalError ? <p className="bb-image-crop-error" role="alert">{error || externalError}</p> : null}
      </div>
    </div>, document.body
  );
}
