import { Scissors, UploadCloud } from 'lucide-react';
import { formatDurationLabel } from '../../utils/socialPostType';
import { aspectStyle } from '../../utils/videoMedia';
import { PlaceLocationField } from '../PlaceLocationField';
import { VideoClipTrimmer } from '../VideoClipTrimmer';
import { TrimmedVideoPreview } from './MediaPreview';

export function ComposerVideoEdit({ c }) {
  return (
    <div className="bb-composer-edit bb-composer-edit--video">
      <div className="bb-composer-edit-media">
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
                end={
                  c.liveTrim?.end ?? c.videoTrimEnd ?? c.videoSourceDuration ?? c.durationSeconds
                }
                seekRequest={c.seekRequest}
                onTime={c.setPlaybackTime}
                onSeekHandled={(id) =>
                  c.setSeekRequest((prev) => (prev?.id === id ? null : prev))
                }
                onAspect={(w, h) => {
                  if (!(c.videoAspect > 0) && w > 0 && h > 0) {
                    c.setVideoAspect(w / h);
                  }
                }}
              />
              <span className="bb-composer-media-badge">
                {c.liveTrim
                  ? formatDurationLabel(
                      Math.max(0, (c.liveTrim.end || 0) - (c.liveTrim.start || 0))
                    )
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
          </div>
        ) : null}
        <div className="bb-composer-edit-media-actions">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => c.videoRef.current?.click()}
            disabled={c.busy}
          >
            <UploadCloud size={15} strokeWidth={2.2} />
            Replace {c.videoNoun}
          </button>
          <span className="bb-composer-readout">
            Length <strong>{c.duration || formatDurationLabel(c.durationSeconds) || '—'}</strong>
          </span>
        </div>
        <input
          ref={c.videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={c.onVideoSectionFile}
        />
      </div>

      <div className="bb-composer-edit-copy">
        <label className="bb-social-field">
          <span>Title</span>
          <input
            data-autofocus="true"
            className="native-control-input bb-social-compose-control"
            value={c.title}
            placeholder={`${c.videoNoun} title`}
            onChange={(event) => c.setTitle(event.target.value)}
          />
        </label>
        <label className="bb-social-field bb-social-field--grow">
          <span>Description</span>
          <textarea
            className="native-control-input bb-social-compose-control bb-social-compose-caption"
            rows={4}
            value={c.caption}
            placeholder={`What is this ${c.videoNoun} about?`}
            onChange={(event) => c.setCaption(event.target.value)}
          />
        </label>
        <PlaceLocationField
          value={c.location}
          onChange={c.setLocation}
          disabled={c.busy}
          placeholder="Search for a place or address"
        />
      </div>
    </div>
  );
}
