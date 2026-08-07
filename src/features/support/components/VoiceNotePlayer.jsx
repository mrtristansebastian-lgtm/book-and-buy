import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from '../utils/supportFormat';
import { createDemoToneDataUrl } from '../utils/demoTone';

/**
 * Compact in-bubble voice playback with progress.
 */
export function VoiceNotePlayer({
  url = '',
  durationMs = 0,
  tone = 'client',
  demoTone = false
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [readyDuration, setReadyDuration] = useState(durationMs);
  const resolvedUrl = useMemo(() => {
    if (url) return url;
    if (demoTone) {
      return createDemoToneDataUrl({
        durationSec: Math.max(1.2, Math.min(4, (durationMs || 2400) / 1000))
      });
    }
    return '';
  }, [url, demoTone, durationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => {
      const dur = (audio.duration || readyDuration / 1000) * 1000;
      const cur = audio.currentTime * 1000;
      setCurrentMs(cur);
      setProgress(dur > 0 ? Math.min(1, cur / dur) : 0);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setReadyDuration(Math.round(audio.duration * 1000));
      }
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentMs(0);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [readyDuration]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const dur = audio.duration || readyDuration / 1000;
    if (!Number.isFinite(dur) || dur <= 0) return;
    audio.currentTime = dur * ratio;
    setProgress(ratio);
  };

  const bars = 18;
  const displayMs = playing || currentMs > 0 ? currentMs : readyDuration;

  return (
    <div className={`bb-support-voice-player is-${tone}`}>
      {resolvedUrl ? (
        <audio ref={audioRef} src={resolvedUrl} preload="metadata" />
      ) : null}
      <button
        type="button"
        className="bb-support-voice-play"
        onClick={toggle}
        disabled={!resolvedUrl}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="bb-support-voice-wave" role="presentation">
        {Array.from({ length: bars }).map((_, index) => {
          const active = progress > index / bars;
          const height = 28 + ((index * 37) % 55);
          return (
            <span
              key={index}
              className={`bb-support-voice-bar ${active ? 'is-active' : ''}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
        <button
          type="button"
          className="bb-support-voice-seek"
          aria-label="Seek"
          disabled={!resolvedUrl}
          onClick={seek}
        />
      </div>
      <span className="bb-support-voice-time">{formatDuration(displayMs || durationMs)}</span>
    </div>
  );
}
