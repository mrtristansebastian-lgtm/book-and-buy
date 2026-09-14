import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function resolveClip(trimStart, trimEnd, fullDuration) {
  const start = Math.max(0, Number(trimStart) || 0);
  const endRaw = Number(trimEnd) || 0;
  const end =
    endRaw > start + 0.05
      ? endRaw
      : Number.isFinite(fullDuration) && fullDuration > start
        ? fullDuration
        : 0;
  const active = end > start + 0.05;
  return {
    start,
    end: active ? end : 0,
    active,
    length: active ? end - start : Math.max(0, fullDuration || 0)
  };
}

/**
 * In-house E-Business Platform video player — play, timeline, volume, fullscreen.
 * When trimStart/trimEnd are set, playback and seeking stay inside that clip.
 */
export function BbVideoPlayer({
  src = '',
  poster = '',
  className = '',
  title = 'Video',
  aspectRatio = 0,
  trimStart = 0,
  trimEnd = 0
}) {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const clipRef = useRef({ start: 0, end: 0, active: false, length: 0 });
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [detectedAspect, setDetectedAspect] = useState(0);
  const hideTimer = useRef(null);

  useEffect(() => {
    setDetectedAspect(0);
    setCurrent(0);
    setDuration(0);
    setBuffered(0);
    setPlaying(false);
  }, [src, trimStart, trimEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncClip = (fullDuration) => {
      const clip = resolveClip(trimStart, trimEnd, fullDuration);
      clipRef.current = clip;
      setDuration(clip.length || fullDuration || 0);
      return clip;
    };

    const onTime = () => {
      const clip = clipRef.current;
      const t = video.currentTime || 0;
      if (clip.active && t >= clip.end - 0.04) {
        video.pause();
        video.currentTime = clip.end;
        setCurrent(clip.length);
        setPlaying(false);
        setControlsVisible(true);
        return;
      }
      if (clip.active && t < clip.start - 0.05) {
        video.currentTime = clip.start;
        setCurrent(0);
        return;
      }
      setCurrent(clip.active ? Math.max(0, t - clip.start) : t);
    };

    const onMeta = () => {
      const full = Number.isFinite(video.duration) ? video.duration : 0;
      const clip = syncClip(full);
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      if (w > 0 && h > 0) setDetectedAspect(w / h);
      if (clip.active && Math.abs((video.currentTime || 0) - clip.start) > 0.12) {
        video.currentTime = clip.start;
      }
      setCurrent(0);
    };

    const onProgress = () => {
      try {
        if (video.buffered.length > 0) {
          const end = video.buffered.end(video.buffered.length - 1);
          const clip = clipRef.current;
          setBuffered(clip.active ? Math.max(0, end - clip.start) : end);
        }
      } catch {
        /* ignore */
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setControlsVisible(true);
      const clip = clipRef.current;
      if (clip.active) {
        video.currentTime = clip.start;
        setCurrent(0);
      }
    };

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('durationchange', onMeta);
    video.addEventListener('progress', onProgress);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onMeta);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [src, trimStart, trimEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const onFs = () => {
      const node = rootRef.current;
      setFullscreen(Boolean(document.fullscreenElement && document.fullscreenElement === node));
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2200);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !src) return;
    showControlsTemporarily();
    if (video.paused) {
      const clip = clipRef.current;
      if (clip.active) {
        const t = video.currentTime || 0;
        if (t < clip.start - 0.05 || t >= clip.end - 0.05) {
          video.currentTime = clip.start;
          setCurrent(0);
        }
      }
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
      return;
    }
    video.pause();
  };

  const seekRatio = (ratio) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const clip = clipRef.current;
    const nextLocal = Math.min(1, Math.max(0, ratio)) * duration;
    video.currentTime = clip.active ? clip.start + nextLocal : nextLocal;
    setCurrent(nextLocal);
  };

  const onSeekClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    seekRatio((event.clientX - rect.left) / rect.width);
    showControlsTemporarily();
  };

  const onSeekKey = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekRatio((current - 5) / (duration || 1));
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekRatio((current + 5) / (duration || 1));
    }
  };

  const toggleMute = () => {
    setMuted((prev) => !prev);
    showControlsTemporarily();
  };

  const onVolume = (event) => {
    const next = Number(event.target.value);
    setVolume(next);
    if (next > 0 && muted) setMuted(false);
    if (next === 0) setMuted(true);
    showControlsTemporarily();
  };

  const toggleFullscreen = async () => {
    const node = rootRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      /* ignore */
    }
    showControlsTemporarily();
  };

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const buffer = duration > 0 ? Math.min(1, buffered / duration) : 0;
  const showChrome = controlsVisible || !playing;
  const frameAspect =
    Number.isFinite(aspectRatio) && aspectRatio > 0
      ? aspectRatio
      : Number.isFinite(detectedAspect) && detectedAspect > 0
        ? detectedAspect
        : 16 / 9;

  if (!src) {
    return (
      <div className={`bb-video-player bb-video-player--empty ${className}`.trim()}>
        Video unavailable
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`bb-video-player ${showChrome ? 'is-chrome' : 'is-chrome-hidden'} ${
        fullscreen ? 'is-fullscreen' : ''
      } ${className}`.trim()}
      style={fullscreen ? undefined : { aspectRatio: String(frameAspect) }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
      }}
    >
      <video
        ref={videoRef}
        className="bb-video-player-el"
        src={src}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        aria-label={title}
      />

      {!playing ? (
        <button
          type="button"
          className="bb-video-player-center"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <span className="bb-video-player-center-disc">
            <Play size={28} fill="currentColor" strokeWidth={0} />
          </span>
        </button>
      ) : null}

      <div className="bb-video-player-chrome" aria-hidden={!showChrome}>
        <div
          className="bb-video-player-seek"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(current || 0)}
          onClick={onSeekClick}
          onKeyDown={onSeekKey}
        >
          <span className="bb-video-player-seek-track" />
          <span className="bb-video-player-seek-buffer" style={{ width: `${buffer * 100}%` }} />
          <span className="bb-video-player-seek-fill" style={{ width: `${progress * 100}%` }} />
          <span className="bb-video-player-seek-knob" style={{ left: `${progress * 100}%` }} />
        </div>

        <div className="bb-video-player-bar">
          <button
            type="button"
            className="bb-video-player-btn"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <Pause size={16} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={16} fill="currentColor" strokeWidth={0} />
            )}
          </button>

          <span className="bb-video-player-time">
            {formatClock(current)} / {formatClock(duration)}
          </span>

          <div className="bb-video-player-spacer" />

          <div className="bb-video-player-volume">
            <button
              type="button"
              className="bb-video-player-btn"
              onClick={toggleMute}
              aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              className="bb-video-player-volume-range"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={onVolume}
              aria-label="Volume"
            />
          </div>

          <button
            type="button"
            className="bb-video-player-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
