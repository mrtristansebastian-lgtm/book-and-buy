import { Layers } from 'lucide-react';
import { MAX_MEDIA } from '../../utils/mediaIntake';
import { formatDurationLabel, POST_CLIP_MAX_SECONDS } from '../../utils/socialPostType';
import { VideoClipTrimmer } from '../VideoClipTrimmer';
import { MediaPreview } from './MediaPreview';
import { ComposerSlideStrip } from './ComposerSlideStrip';

export function ComposerDetailsStep({ c }) {
  return (
    <div className="bb-composer-arrange">
      <div className="bb-composer-arrange-workspace">
        <div className="bb-composer-arrange-stage">
          <MediaPreview
            item={c.activeItem}
            trimStart={c.liveTrim?.start}
            trimEnd={c.liveTrim?.end}
            seekRequest={c.seekRequest}
            onTime={c.setPlaybackTime}
            onSeekHandled={(id) => c.setSeekRequest((prev) => (prev?.id === id ? null : prev))}
            onAspect={(aspect) => c.setItemAspect(c.activeItem?.id, aspect)}
          />
          {c.activeItem?.kind === 'video' && c.activeItem.durationLabel ? (
            <span className="bb-composer-media-badge">
              {c.liveTrim
                ? formatDurationLabel(Math.max(0, (c.liveTrim.end || 0) - (c.liveTrim.start || 0)))
                : c.activeItem.durationLabel}
            </span>
          ) : null}
        </div>

        {c.activeItem?.kind === 'video' ? (
          <VideoClipTrimmer
            source={c.activeItem.file || c.activeItem.url}
            durationSeconds={
              c.activeItem.sourceDurationSeconds || c.activeItem.durationSeconds || 0
            }
            trimStart={c.activeItem.trimStart || 0}
            trimEnd={
              c.activeItem.trimEnd ||
              c.activeItem.sourceDurationSeconds ||
              c.activeItem.durationSeconds ||
              0
            }
            maxClipSeconds={POST_CLIP_MAX_SECONDS}
            busy={c.busy}
            currentTime={c.playbackTime}
            onPreview={c.setLiveTrim}
            onSeek={c.requestSeek}
            onSave={(range) => c.saveClipTrim(c.activeItem, range)}
          />
        ) : (
          <p className="bb-composer-arrange-note">
            Drag the strip to reorder · crop photos from the thumbnail
          </p>
        )}
      </div>

      <div className="bb-composer-arrange-rail">
        <div className="bb-composer-strip-head">
          <span className="bb-composer-slide-count">
            {c.items.length} / {MAX_MEDIA} slides
          </span>
          {c.items.length > 1 ? (
            <button
              type="button"
              className={`bb-composer-toggle${c.matchAll ? ' is-on' : ''}`}
              aria-pressed={c.matchAll}
              onClick={() => c.setMatchAll((value) => !value)}
            >
              <Layers size={13} strokeWidth={2.3} />
              Match all to first
            </button>
          ) : null}
        </div>

        <ComposerSlideStrip
          items={c.items}
          activeId={c.activeId}
          uploads={c.uploads}
          canAdd={c.items.length < MAX_MEDIA}
          onAdd={() => c.mediaRef.current?.click()}
          onSelect={c.setActiveId}
          onGripPointerDown={c.onGripPointerDown}
          onGripPointerMove={c.onGripPointerMove}
          onGripPointerUp={c.onGripPointerUp}
          onRetry={c.retry}
          onCancel={c.cancel}
          onCrop={c.cropItem}
          onRemove={c.removeItem}
        />

        <p className="bb-composer-hint">
          {c.activeItem?.kind === 'video'
            ? 'Drag the yellow handles to trim · Save when the range changes'
            : c.matchAll
              ? 'Every slide is framed like the first · drag the handle to reorder'
              : 'Each slide keeps its own shape · drag the handle to reorder · crop to adjust'}
        </p>
      </div>
    </div>
  );
}
