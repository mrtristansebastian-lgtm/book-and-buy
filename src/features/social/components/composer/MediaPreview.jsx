import { useEffect, useRef } from 'react';

const MIN_CLIP_FALLBACK = 0.5;

function clampSeek(time, start, end) {
  const clipStart = Math.max(0, Number(start) || 0);
  const clipEnd = Number(end) > clipStart ? Number(end) : clipStart + MIN_CLIP_FALLBACK;
  return Math.min(
    Math.max(Number(time) || clipStart, clipStart),
    Math.max(clipStart, clipEnd - 0.05)
  );
}

export function TrimmedVideoPreview({
  url,
  posterUrl,
  start = 0,
  end = 0,
  seekRequest = null,
  onAspect,
  onTime,
  onSeekHandled
}) {
  const videoRef = useRef(null);
  const rangeRef = useRef({ start, end });
  const onTimeRef = useRef(onTime);
  rangeRef.current = { start, end };
  onTimeRef.current = onTime;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, start);
    if (video.paused && Math.abs((video.currentTime || 0) - target) > 0.12) {
      video.currentTime = target;
      onTimeRef.current?.(target);
    }
  }, [start, url]);

  useEffect(() => {
    if (seekRequest == null || !Number.isFinite(seekRequest.time)) return;
    const video = videoRef.current;
    if (!video) return;
    const { start: clipStart, end: clipEnd } = rangeRef.current;
    const target = clampSeek(seekRequest.time, clipStart, clipEnd);
    video.currentTime = target;
    onTimeRef.current?.(target);
    onSeekHandled?.(seekRequest.id);
  }, [seekRequest, onSeekHandled]);

  const emitTime = (video) => {
    onTimeRef.current?.(video.currentTime || 0);
  };

  const enforceClipBounds = (video, { pauseAtEnd = false } = {}) => {
    const { start: clipStart, end: clipEnd } = rangeRef.current;
    if (!(clipEnd > clipStart)) {
      emitTime(video);
      return;
    }
    if (video.currentTime < clipStart - 0.02) {
      video.currentTime = clipStart;
    }
    if (video.currentTime >= clipEnd - 0.04) {
      if (pauseAtEnd || video.paused) {
        video.pause();
        video.currentTime = clipStart;
      } else {
        video.currentTime = clipStart;
      }
    }
    emitTime(video);
  };

  return (
    <video
      ref={videoRef}
      className="bb-composer-arrange-video"
      src={url}
      poster={posterUrl || undefined}
      muted
      playsInline
      controls
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        onAspect?.(video.videoWidth, video.videoHeight);
        video.currentTime = Math.max(0, start);
        emitTime(video);
      }}
      onPlay={(event) => {
        const video = event.currentTarget;
        const { start: clipStart } = rangeRef.current;
        if (video.currentTime < clipStart - 0.02) {
          video.currentTime = clipStart;
        }
        emitTime(video);
      }}
      onSeeking={(event) => enforceClipBounds(event.currentTarget)}
      onSeeked={(event) => enforceClipBounds(event.currentTarget)}
      onTimeUpdate={(event) => enforceClipBounds(event.currentTarget, { pauseAtEnd: true })}
    />
  );
}

export function MediaPreview({
  item,
  onAspect,
  trimStart,
  trimEnd,
  seekRequest = null,
  onTime,
  onSeekHandled
}) {
  if (!item?.url) {
    return <span className="bb-composer-arrange-empty">Nothing selected</span>;
  }

  const reportAspect = (w, h) => {
    if (!(w > 0 && h > 0)) return;
    onAspect?.(w / h);
  };

  const start =
    Number.isFinite(trimStart) && trimStart >= 0
      ? trimStart
      : Number(item.trimStart) || 0;
  const endRaw =
    Number.isFinite(trimEnd) && trimEnd > 0
      ? trimEnd
      : Number(item.trimEnd) > 0
        ? Number(item.trimEnd)
        : Number(item.sourceDurationSeconds || item.durationSeconds) || 0;

  if (item.kind === 'video') {
    return (
      <TrimmedVideoPreview
        key={item.id}
        url={item.url}
        posterUrl={item.posterUrl}
        start={start}
        end={endRaw}
        seekRequest={seekRequest}
        onAspect={reportAspect}
        onTime={onTime}
        onSeekHandled={onSeekHandled}
      />
    );
  }

  return (
    <img
      src={item.url}
      alt={item.alt || ''}
      onLoad={(event) => {
        const img = event.currentTarget;
        reportAspect(img.naturalWidth, img.naturalHeight);
      }}
    />
  );
}
