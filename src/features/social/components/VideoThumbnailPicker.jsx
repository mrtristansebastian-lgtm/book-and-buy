import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Scissors } from 'lucide-react';
import { formatDurationLabel } from '../utils/socialPostType';
import {
  aspectStyle,
  captureFrameFromVideoElement,
  captureVideoFrames
} from '../utils/videoMedia';

const SUGGESTION_POINTS = [0.1, 0.5, 0.8];
const INITIAL_SCRUB_FRACTION = 0.1;

/**
 * Thumbnail chooser for the Videos flow: live scrub stage, suggested scenes,
 * and upload-your-own. Frame capture needs pixel access, so the scrub/filmstrip
 * quietly disappear when the browser blocks it (cross-origin sources).
 */
export function VideoThumbnailPicker({
  videoFile = null,
  videoUrl = '',
  durationSeconds = 0,
  aspectRatio = 0,
  posterUrl = '',
  busy = false,
  onFrameChosen,
  onUploadOwn
}) {
  const scrubVideoRef = useRef(null);
  const suggestionUrlsRef = useRef([]);
  const localBlobRef = useRef('');

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [frameCapture, setFrameCapture] = useState('idle');
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [activeKey, setActiveKey] = useState('');
  const [scrubSrc, setScrubSrc] = useState('');

  const source = videoFile || videoUrl;
  const duration = Number(durationSeconds) || 0;
  const stageAspect = aspectStyle(aspectRatio, 16 / 9);

  // Prefer an existing preview URL; otherwise mint a blob URL from the File.
  useEffect(() => {
    if (localBlobRef.current) {
      URL.revokeObjectURL(localBlobRef.current);
      localBlobRef.current = '';
    }

    if (videoUrl) {
      setScrubSrc(videoUrl);
      return undefined;
    }

    if (videoFile instanceof Blob) {
      const url = URL.createObjectURL(videoFile);
      localBlobRef.current = url;
      setScrubSrc(url);
      return () => {
        if (localBlobRef.current) {
          URL.revokeObjectURL(localBlobRef.current);
          localBlobRef.current = '';
        }
      };
    }

    setScrubSrc('');
    return undefined;
  }, [videoFile, videoUrl]);

  useEffect(() => {
    suggestionUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    suggestionUrlsRef.current = [];
    setSuggestions([]);
    setActiveKey('');

    if (!source) {
      setFrameCapture('idle');
      return undefined;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    setFrameCapture('working');

    captureVideoFrames(source, SUGGESTION_POINTS)
      .then((frames) => {
        if (cancelled) return;
        if (!frames.length) {
          setFrameCapture('blocked');
          return;
        }
        const withUrls = frames.map((frame) => {
          const url = URL.createObjectURL(frame.file);
          suggestionUrlsRef.current.push(url);
          return { ...frame, url };
        });
        setSuggestions(withUrls);
        setFrameCapture('ready');
      })
      .catch(() => {
        if (!cancelled) setFrameCapture('blocked');
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(
    () => () => {
      suggestionUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      suggestionUrlsRef.current = [];
      if (localBlobRef.current) {
        URL.revokeObjectURL(localBlobRef.current);
        localBlobRef.current = '';
      }
    },
    []
  );

  const seekVideo = (seconds) => {
    const next = Math.max(0, Math.min(seconds, Math.max(0, duration - 0.05) || seconds));
    setScrubSeconds(next);
    const video = scrubVideoRef.current;
    if (video && Number.isFinite(next)) video.currentTime = next;
  };

  const onStageReady = () => {
    const video = scrubVideoRef.current;
    if (!video) return;
    const videoDuration = Number(video.duration) || duration;
    const target =
      videoDuration > 0
        ? Math.min(videoDuration * INITIAL_SCRUB_FRACTION, Math.max(0, videoDuration - 0.05))
        : 0;
    seekVideo(target);
  };

  const useSuggestion = async (suggestion) => {
    seekVideo(suggestion.seconds);
    setActiveKey(`suggestion-${suggestion.seconds}`);
    await onFrameChosen?.(suggestion.file);
  };

  const useScrubFrame = async () => {
    const video = scrubVideoRef.current;
    if (!video) return;
    setScrubbing(true);
    try {
      const file = await captureFrameFromVideoElement(video);
      setActiveKey(`scrub-${scrubSeconds.toFixed(2)}`);
      await onFrameChosen?.(file);
    } catch {
      setFrameCapture('blocked');
    } finally {
      setScrubbing(false);
    }
  };

  const canPickFrames = frameCapture === 'ready' && Boolean(source);
  const showStage = Boolean(scrubSrc);

  return (
    <div className="bb-thumb-picker">
      {showStage ? (
        <div className="bb-thumb-picker-scrub">
          <div className="bb-thumb-picker-stage" style={stageAspect}>
            <video
              ref={scrubVideoRef}
              src={scrubSrc}
              muted
              playsInline
              preload="auto"
              crossOrigin={videoFile ? undefined : 'anonymous'}
              onLoadedData={onStageReady}
            />
            {posterUrl ? (
              <span className="bb-thumb-picker-chosen" aria-hidden="true">
                <Check size={13} strokeWidth={3} />
              </span>
            ) : null}
          </div>

          {canPickFrames || frameCapture === 'working' ? (
            <>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.05}
                value={scrubSeconds}
                disabled={busy || scrubbing || !canPickFrames}
                aria-label="Thumbnail position"
                onChange={(event) => seekVideo(Number(event.target.value))}
              />
              <div className="bb-thumb-picker-scrub-row">
                <span className="bb-thumb-picker-time-read">
                  {formatDurationLabel(scrubSeconds)} / {formatDurationLabel(duration)}
                </span>
                <button
                  type="button"
                  className="bb-ghost-btn bb-thumb-picker-use"
                  disabled={busy || scrubbing || !canPickFrames}
                  onClick={useScrubFrame}
                >
                  <Scissors size={14} strokeWidth={2.2} />
                  {scrubbing ? 'Grabbing…' : 'Use this frame'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className="bb-thumb-picker-stage bb-thumb-picker-stage--empty" style={stageAspect}>
          <span className="bb-thumb-picker-empty">No video loaded</span>
        </div>
      )}

      {loadingSuggestions ? (
        <div className="bb-thumb-picker-loading">
          <Loader2 size={15} className="bb-spin" aria-hidden="true" />
          <span>Pulling frames from your video…</span>
        </div>
      ) : null}

      {canPickFrames ? (
        <div className="bb-thumb-picker-section">
          <p className="bb-thumb-picker-label">Scenes</p>
          <div className="bb-thumb-picker-grid">
            {suggestions.map((suggestion) => {
              const key = `suggestion-${suggestion.seconds}`;
              return (
                <button
                  key={key}
                  type="button"
                  className={`bb-thumb-picker-option${activeKey === key ? ' is-active' : ''}`}
                  style={stageAspect}
                  disabled={busy}
                  onClick={() => useSuggestion(suggestion)}
                >
                  <img src={suggestion.url} alt="" />
                  <span className="bb-thumb-picker-time">
                    {formatDurationLabel(suggestion.seconds)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {frameCapture === 'blocked' ? (
        <p className="bb-composer-hint">
          Frames cannot be read from this video source, so upload a thumbnail instead.
        </p>
      ) : null}

      <button
        type="button"
        className="bb-ghost-btn bb-thumb-picker-upload"
        disabled={busy}
        onClick={onUploadOwn}
      >
        <ImagePlus size={15} strokeWidth={2.2} />
        {posterUrl ? 'Upload a different image' : 'Upload your own image'}
      </button>
    </div>
  );
}
