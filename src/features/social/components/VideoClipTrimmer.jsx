import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Scissors } from 'lucide-react';
import { formatDurationLabel } from '../utils/socialPostType';
import { captureVideoFrames } from '../utils/videoMedia';

const FRAME_COUNT = 12;
const MIN_CLIP_SECONDS = 0.5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Clipchamp / Reels-style length trimmer: filmstrip of frames + start/end handles.
 */
export function VideoClipTrimmer({
  source = null,
  durationSeconds = 0,
  trimStart = 0,
  trimEnd = 0,
  maxClipSeconds = 0,
  busy = false,
  onPreview,
  onSave
}) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const frameUrlsRef = useRef([]);
  const rangeRef = useRef({ start: 0, end: 0 });
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

  const fullDuration = Math.max(0, Number(durationSeconds) || 0);
  const defaultEnd =
    fullDuration > 0
      ? maxClipSeconds > 0
        ? Math.min(fullDuration, maxClipSeconds)
        : fullDuration
      : 0;

  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState(Number(trimStart) || 0);
  const [end, setEnd] = useState(Number(trimEnd) > 0 ? Number(trimEnd) : defaultEnd);

  rangeRef.current = { start, end };

  useEffect(() => {
    setStart(Number(trimStart) || 0);
    setEnd(Number(trimEnd) > 0 ? Number(trimEnd) : defaultEnd);
  }, [trimStart, trimEnd, defaultEnd, source]);

  useEffect(() => {
    frameUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    frameUrlsRef.current = [];
    setFrames([]);

    if (!source || !(fullDuration > 0)) return undefined;

    let cancelled = false;
    setLoading(true);

    const fractions = Array.from({ length: FRAME_COUNT }, (_, i) =>
      FRAME_COUNT <= 1 ? 0 : i / (FRAME_COUNT - 1)
    );

    captureVideoFrames(source, fractions)
      .then((captured) => {
        if (cancelled) return;
        const withUrls = captured.map((frame) => {
          const url = URL.createObjectURL(frame.file);
          frameUrlsRef.current.push(url);
          return { seconds: frame.seconds, url };
        });
        setFrames(withUrls);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, fullDuration]);

  useEffect(
    () => () => {
      frameUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      frameUrlsRef.current = [];
    },
    []
  );

  useEffect(() => {
    onPreviewRef.current?.({ start, end });
  }, [start, end]);

  const fullDurationRef = useRef(fullDuration);
  const maxClipRef = useRef(maxClipSeconds);
  fullDurationRef.current = fullDuration;
  maxClipRef.current = maxClipSeconds;

  useEffect(() => {
    const apply = (clientX, which) => {
      const track = trackRef.current;
      const duration = fullDurationRef.current;
      if (!track || !(duration > 0)) return;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const seconds = ratio * duration;
      const maxLen =
        maxClipRef.current > 0 ? maxClipRef.current : duration;
      const { start: curStart, end: curEnd } = rangeRef.current;

      if (which === 'start') {
        const nextStart = clamp(seconds, 0, curEnd - MIN_CLIP_SECONDS);
        let nextEnd = Math.max(curEnd, nextStart + MIN_CLIP_SECONDS);
        if (nextEnd - nextStart > maxLen) nextEnd = nextStart + maxLen;
        nextEnd = Math.min(duration, nextEnd);
        setStart(nextStart);
        setEnd(nextEnd);
        return;
      }

      if (which === 'end') {
        const nextEnd = clamp(seconds, curStart + MIN_CLIP_SECONDS, duration);
        let nextStart = curStart;
        if (nextEnd - nextStart > maxLen) nextStart = Math.max(0, nextEnd - maxLen);
        setStart(nextStart);
        setEnd(nextEnd);
        return;
      }

      const width = Math.max(MIN_CLIP_SECONDS, curEnd - curStart);
      const nextStart = clamp(seconds - width / 2, 0, duration - width);
      setStart(nextStart);
      setEnd(nextStart + width);
    };

    const onMove = (event) => {
      if (!dragRef.current) return;
      apply(event.clientX, dragRef.current);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const applyFromClientX = (clientX, which) => {
    const track = trackRef.current;
    const duration = fullDurationRef.current;
    if (!track || !(duration > 0)) return;
    const rect = track.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const seconds = ratio * duration;
    const maxLen = maxClipRef.current > 0 ? maxClipRef.current : duration;
    const { start: curStart, end: curEnd } = rangeRef.current;

    if (which === 'start') {
      const nextStart = clamp(seconds, 0, curEnd - MIN_CLIP_SECONDS);
      let nextEnd = Math.max(curEnd, nextStart + MIN_CLIP_SECONDS);
      if (nextEnd - nextStart > maxLen) nextEnd = nextStart + maxLen;
      nextEnd = Math.min(duration, nextEnd);
      setStart(nextStart);
      setEnd(nextEnd);
      return;
    }

    if (which === 'end') {
      const nextEnd = clamp(seconds, curStart + MIN_CLIP_SECONDS, duration);
      let nextStart = curStart;
      if (nextEnd - nextStart > maxLen) nextStart = Math.max(0, nextEnd - maxLen);
      setStart(nextStart);
      setEnd(nextEnd);
      return;
    }

    const width = Math.max(MIN_CLIP_SECONDS, curEnd - curStart);
    const nextStart = clamp(seconds - width / 2, 0, duration - width);
    setStart(nextStart);
    setEnd(nextStart + width);
  };
  const clipLength = Math.max(0, end - start);
  const startPct = fullDuration > 0 ? (start / fullDuration) * 100 : 0;
  const endPct = fullDuration > 0 ? (end / fullDuration) * 100 : 100;
  const savedEnd = Number(trimEnd) > 0 ? Number(trimEnd) : defaultEnd;
  const dirty =
    Math.abs(start - (Number(trimStart) || 0)) > 0.04 ||
    Math.abs(end - savedEnd) > 0.04;

  const save = async () => {
    if (!onSave || saving || busy) return;
    setSaving(true);
    try {
      await onSave({ start, end });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStart(0);
    setEnd(defaultEnd);
  };

  if (!(fullDuration > 0)) return null;

  return (
    <div className="bb-clip-trimmer">
      <div className="bb-clip-trimmer-head">
        <p className="bb-clip-trimmer-label">
          <Scissors size={13} strokeWidth={2.3} aria-hidden="true" />
          Trim clip
        </p>
        <span className="bb-clip-trimmer-readout">
          {formatDurationLabel(start)} – {formatDurationLabel(end)} ·{' '}
          {formatDurationLabel(clipLength)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="bb-clip-trimmer-track"
        onPointerDown={(event) => {
          if (event.target.closest('[data-handle]')) return;
          dragRef.current = 'move';
          applyFromClientX(event.clientX, 'move');
        }}
      >
        <div className="bb-clip-trimmer-frames" aria-hidden="true">
          {loading ? (
            <div className="bb-clip-trimmer-loading">
              <Loader2 size={14} className="bb-spin" />
              Pulling frames…
            </div>
          ) : frames.length ? (
            frames.map((frame) => (
              <img key={`${frame.seconds}-${frame.url}`} src={frame.url} alt="" />
            ))
          ) : (
            <div className="bb-clip-trimmer-loading">Frames unavailable</div>
          )}
        </div>

        <div className="bb-clip-trimmer-shade" style={{ width: `${startPct}%` }} />
        <div
          className="bb-clip-trimmer-shade bb-clip-trimmer-shade--right"
          style={{ width: `${Math.max(0, 100 - endPct)}%` }}
        />

        <div
          className="bb-clip-trimmer-window"
          style={{ left: `${startPct}%`, width: `${Math.max(2, endPct - startPct)}%` }}
        >
          <button
            type="button"
            className="bb-clip-trimmer-handle bb-clip-trimmer-handle--start"
            data-handle="start"
            aria-label="Trim start"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dragRef.current = 'start';
            }}
          />
          <button
            type="button"
            className="bb-clip-trimmer-handle bb-clip-trimmer-handle--end"
            data-handle="end"
            aria-label="Trim end"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              dragRef.current = 'end';
            }}
          />
        </div>
      </div>

      <div className="bb-clip-trimmer-actions">
        <button type="button" className="bb-ghost-btn" disabled={busy || saving} onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          className="bb-primary-btn"
          disabled={busy || saving || !dirty}
          onClick={save}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="bb-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check size={14} strokeWidth={2.6} />
              Save trim
            </>
          )}
        </button>
      </div>
    </div>
  );
}
