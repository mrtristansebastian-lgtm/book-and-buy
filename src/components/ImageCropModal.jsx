import { useRef, useState } from 'react';
import { Crop, MousePointerClick, X } from 'lucide-react';
import { IMAGE_CROP_RATIOS } from '../utils/imageCrop';

export const ImageCropModal = ({ crop, saving, onChange, onClose, onSave }) => {
  const dragStateRef = useRef(null);
  const cropUpdateFrameRef = useRef(0);
  const pendingCropPositionRef = useRef(null);
  const [cropDragging, setCropDragging] = useState(false);

  if (!crop) return null;

  const preset = IMAGE_CROP_RATIOS[crop.ratioKey || 'square'] || IMAGE_CROP_RATIOS.square;
  const clampPercent = (value) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
  const currentZoom = Math.max(1, Number(crop.zoom || 1));
  const currentPositionX = clampPercent(Number(crop.positionX ?? 50));
  const currentPositionY = clampPercent(Number(crop.positionY ?? 50));
  const handleDragStart = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      positionX: currentPositionX,
      positionY: currentPositionY,
      width: rect.width || 1,
      height: rect.height || 1,
      zoom: currentZoom
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setCropDragging(true);
    event.preventDefault();
  };
  const handleDragMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const dragSensitivity = 100 / Math.max(dragState.zoom, 1);
    const nextPositionX = clampPercent(dragState.positionX - ((event.clientX - dragState.startX) / dragState.width) * dragSensitivity);
    const nextPositionY = clampPercent(dragState.positionY - ((event.clientY - dragState.startY) / dragState.height) * dragSensitivity);
    pendingCropPositionRef.current = { positionX: nextPositionX, positionY: nextPositionY };
    if (!cropUpdateFrameRef.current) {
      cropUpdateFrameRef.current = requestAnimationFrame(() => {
        cropUpdateFrameRef.current = 0;
        if (pendingCropPositionRef.current) {
          onChange(pendingCropPositionRef.current);
        }
      });
    }
    event.preventDefault();
  };
  const handleDragEnd = (event) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
    if (cropUpdateFrameRef.current) {
      cancelAnimationFrame(cropUpdateFrameRef.current);
      cropUpdateFrameRef.current = 0;
    }
    if (pendingCropPositionRef.current) {
      onChange(pendingCropPositionRef.current);
      pendingCropPositionRef.current = null;
    }
    setCropDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className="image-crop-overlay" role="dialog" aria-modal="true">
      <div className="image-crop-sheet">
        <div className="image-crop-head">
          <div>
            <p>Image crop</p>
            <h3>{crop.title || 'Crop image'}</h3>
            <span>Position the image once, then save it cleanly across the app.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cropper">
            <X size={18} />
          </button>
        </div>
        <div className="image-crop-body">
          <div className="image-crop-preview">
            <div
              className={`image-crop-frame ${crop.shape === 'circle' ? 'is-circle' : ''} ${cropDragging ? 'is-dragging' : ''}`}
              style={{ aspectRatio: preset.ratio }}
              role="group"
              aria-label="Drag image to reposition crop"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <img
                src={crop.source}
                alt=""
                style={{
                  objectPosition: `${currentPositionX}% ${currentPositionY}%`,
                  transform: `scale(${currentZoom})`,
                  transformOrigin: `${currentPositionX}% ${currentPositionY}%`
                }}
              />
            </div>
          </div>
          <div className="image-crop-controls">
            <div className="image-crop-guidance">
              <MousePointerClick size={18} />
              <div>
                <strong>Drag to position</strong>
                <span>Move the image inside the frame, then zoom until it feels right.</span>
              </div>
            </div>
            <label className="image-crop-zoom-control">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={2.2}
                step={0.01}
                value={currentZoom}
                onChange={(event) => onChange({ zoom: Number(event.target.value) })}
              />
            </label>
            <div className="image-crop-actions">
              <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" onClick={onSave} disabled={saving}>
                <Crop size={15} /> {saving ? 'Saving...' : 'Save Crop'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
