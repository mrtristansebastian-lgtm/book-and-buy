import { Check, Crop, GripVertical, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { ProgressRing } from './ProgressRing';

export function ComposerSlide({
  item,
  index,
  active,
  uploadState = {},
  onSelect,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  onRetry,
  onCancel,
  onCrop,
  onRemove
}) {
  const uploading = uploadState.status === 'preparing' || uploadState.status === 'uploading';
  const failed = uploadState.status === 'error';
  const done = uploadState.status === 'done' || Boolean(item.remoteUrl);

  return (
    <div
      data-slide-index={index}
      className={`bb-composer-strip-item${active ? ' is-active' : ''}${failed ? ' is-failed' : ''}`}
      role="listitem"
      onClick={() => onSelect(item.id)}
    >
      <span
        className="bb-composer-strip-grip"
        aria-hidden="true"
        onPointerDown={(event) => onGripPointerDown(event, index)}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
      >
        <GripVertical size={12} />
      </span>

      {item.kind === 'video' ? (
        <>
          {item.posterUrl ? (
            <img src={item.posterUrl} alt="" />
          ) : (
            <video src={item.url} muted playsInline />
          )}
          <span className="bb-composer-strip-video" aria-hidden="true">
            <Play size={10} fill="currentColor" />
          </span>
        </>
      ) : (
        <img src={item.url} alt="" />
      )}

      {uploading ? (
        <span className="bb-composer-strip-status" aria-label="Uploading">
          <ProgressRing value={uploadState.progress || 0} size={28} />
        </span>
      ) : null}

      {done && !uploading ? (
        <span className="bb-composer-strip-check" aria-label="Ready">
          <Check size={11} strokeWidth={3} />
        </span>
      ) : null}

      <div className="bb-composer-strip-actions">
        {failed ? (
          <button
            type="button"
            className="bb-composer-strip-btn"
            aria-label="Retry upload"
            onClick={(event) => {
              event.stopPropagation();
              onRetry(item.id);
            }}
          >
            <RotateCcw size={12} />
          </button>
        ) : null}
        {uploading ? (
          <button
            type="button"
            className="bb-composer-strip-btn"
            aria-label="Cancel upload"
            onClick={(event) => {
              event.stopPropagation();
              onCancel(item.id);
            }}
          >
            <X size={12} />
          </button>
        ) : null}
        {item.kind === 'image' && !uploading ? (
          <button
            type="button"
            className="bb-composer-strip-btn"
            aria-label="Crop"
            onClick={(event) => {
              event.stopPropagation();
              onCrop(item);
            }}
          >
            <Crop size={12} />
          </button>
        ) : null}
        <button
          type="button"
          className="bb-composer-strip-btn"
          aria-label="Remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export function ComposerSlideStrip({
  items,
  activeId,
  uploads,
  canAdd,
  onAdd,
  onSelect,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  onRetry,
  onCancel,
  onCrop,
  onRemove
}) {
  return (
    <div className="bb-composer-strip" role="list">
      {items.map((item, index) => (
        <ComposerSlide
          key={item.id}
          item={item}
          index={index}
          active={activeId === item.id}
          uploadState={uploads[item.id]}
          onSelect={onSelect}
          onGripPointerDown={onGripPointerDown}
          onGripPointerMove={onGripPointerMove}
          onGripPointerUp={onGripPointerUp}
          onRetry={onRetry}
          onCancel={onCancel}
          onCrop={onCrop}
          onRemove={onRemove}
        />
      ))}
      {canAdd ? (
        <button type="button" className="bb-composer-strip-add" onClick={onAdd} aria-label="Add media">
          <Plus size={18} />
        </button>
      ) : null}
    </div>
  );
}
