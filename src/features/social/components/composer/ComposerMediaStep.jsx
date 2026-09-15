import { Film, ImagePlus, Scissors, UploadCloud } from 'lucide-react';
import { MAX_MEDIA } from '../../utils/mediaIntake';
import {
  formatDurationLabel,
  POST_CLIP_MAX_SECONDS,
  VERTICAL_MAX_SECONDS
} from '../../utils/socialPostType';
import { aspectStyle } from '../../utils/videoMedia';
import { VideoClipTrimmer } from '../VideoClipTrimmer';
import { TrimmedVideoPreview } from './MediaPreview';

export function ComposerMediaStep({ c }) {
  if (c.type === 'image') {
    return (
      <div className="bb-composer-dropzone bb-composer-dropzone--hero">
        <span className="bb-composer-dropzone-icons" aria-hidden="true">
          <ImagePlus size={26} strokeWidth={2} />
          <Film size={22} strokeWidth={2} />
        </span>
        <strong>Select photos &amp; clips</strong>
        <span>
          Drag them in, paste from the clipboard, or browse · up to {MAX_MEDIA} slides ·
          clips to {formatDurationLabel(POST_CLIP_MAX_SECONDS)}
        </span>
        <button
          type="button"
          className="bb-primary-btn bb-composer-dropzone-upload"
          onClick={() => c.mediaRef.current?.click()}
          disabled={c.busy}
        >
          <UploadCloud size={16} strokeWidth={2.2} />
          Upload
        </button>
      </div>
    );
  }

  if (!c.isLongVideo) return null;

  return (
    <div className="bb-composer-fields bb-composer-video-source">
      {c.mediaUrl ? (
        <div className="bb-composer-arrange-workspace bb-composer-video-trim-workspace">
          <div
            className="bb-composer-video-stage"
            style={aspectStyle(c.videoAspect, c.videoFallbackAspect)}
          >
            <TrimmedVideoPreview
              url={c.mediaUrl}
              posterUrl={c.posterUrl}
              start={c.liveTrim?.start ?? c.videoTrimStart ?? 0}
              end={c.liveTrim?.end ?? c.videoTrimEnd ?? c.videoSourceDuration ?? c.durationSeconds}
              seekRequest={c.seekRequest}
              onTime={c.setPlaybackTime}
              onSeekHandled={(id) => c.setSeekRequest((prev) => (prev?.id === id ? null : prev))}
              onAspect={(w, h) => {
                if (!(c.videoAspect > 0) && w > 0 && h > 0) {
                  c.setVideoAspect(w / h);
                }
              }}
            />
            <span className="bb-composer-media-badge">
              {c.liveTrim
                ? formatDurationLabel(Math.max(0, (c.liveTrim.end || 0) - (c.liveTrim.start || 0)))
                : c.duration || formatDurationLabel(c.durationSeconds)}
            </span>
            <button
              type="button"
              className="bb-composer-cover-set"
              disabled={c.busy}
              onClick={() => c.setCoverPickerOpen(true)}
            >
              <Scissors size={14} strokeWidth={2.3} />
              Set cover
            </button>
          </div>

          <VideoClipTrimmer
            source={c.videoFile || c.mediaUrl}
            durationSeconds={c.videoSourceDuration || c.durationSeconds || 0}
            trimStart={c.videoTrimStart || 0}
            trimEnd={c.videoTrimEnd || c.videoSourceDuration || c.durationSeconds || 0}
            maxClipSeconds={c.videoMaxClipSeconds}
            busy={c.busy}
            currentTime={c.playbackTime}
            onPreview={c.setLiveTrim}
            onSeek={c.requestSeek}
            onSave={c.saveLongVideoTrim}
          />

          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => c.videoRef.current?.click()}
            disabled={c.busy}
          >
            Replace {c.videoNoun}
          </button>
        </div>
      ) : (
        <div className="bb-composer-dropzone bb-composer-dropzone--hero">
          <Film size={28} strokeWidth={2} />
          <strong>Upload {c.videoNoun}</strong>
          <span>
            {c.isVertical
              ? `Portrait · up to ${formatDurationLabel(VERTICAL_MAX_SECONDS)}`
              : 'Landscape · any length'}{' '}
            · trim after upload
          </span>
          <button
            type="button"
            className="bb-primary-btn bb-composer-dropzone-upload"
            onClick={() => c.videoRef.current?.click()}
            disabled={c.busy}
          >
            <UploadCloud size={16} strokeWidth={2.2} />
            Upload
          </button>
        </div>
      )}

      <input
        ref={c.videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={c.onVideoSectionFile}
      />
    </div>
  );
}
