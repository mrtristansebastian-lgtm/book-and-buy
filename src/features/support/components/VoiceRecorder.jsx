import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react';
import { formatDuration } from '../utils/supportFormat';

const BAR_COUNT = 22;

export function VoiceMicButton({ disabled, onStart }) {
  return (
    <button
      type="button"
      className="bb-support-composer-icon"
      disabled={disabled}
      aria-label="Record voice note"
      onClick={onStart}
    >
      <Mic size={15} strokeWidth={2} />
    </button>
  );
}

export function VoiceRecordingStrip({ elapsed = 0, levels = [], onStop, onDiscard }) {
  const bars = levels.length ? levels : Array(BAR_COUNT).fill(0.2);

  return (
    <div className="bb-support-rec-strip" role="status" aria-live="polite">
      <span className="bb-support-rec-dot" aria-hidden="true" />
      <span className="bb-support-rec-time">{formatDuration(elapsed)}</span>
      <div className="bb-support-rec-wave" aria-hidden="true">
        {bars.map((level, index) => (
          <span
            key={index}
            className="bb-support-rec-bar"
            style={{ transform: `scaleY(${0.25 + level * 0.9})` }}
          />
        ))}
      </div>
      <button
        type="button"
        className="bb-support-composer-icon"
        aria-label="Discard recording"
        onClick={onDiscard}
      >
        <Trash2 size={14} />
      </button>
      <button type="button" className="bb-support-rec-stop" onClick={onStop}>
        <Square size={11} fill="currentColor" />
        Stop
      </button>
    </div>
  );
}

/**
 * Preview strip: play the take, then Send or discard (WhatsApp-style).
 */
export function VoicePreviewStrip({
  url = '',
  durationMs = 0,
  onDiscard,
  onConfirm,
  confirming = false
}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => {
      const dur = (audio.duration || durationMs / 1000) * 1000;
      const cur = audio.currentTime * 1000;
      setCurrentMs(cur);
      setProgress(dur > 0 ? Math.min(1, cur / dur) : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentMs(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.pause();
    };
  }, [url, durationMs]);

  useEffect(() => {
    if (!confirming) return;
    audioRef.current?.pause();
    setPlaying(false);
  }, [confirming]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !url) return;
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
    if (!audio || !url) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const dur = audio.duration || durationMs / 1000;
    if (!Number.isFinite(dur) || dur <= 0) return;
    audio.currentTime = dur * ratio;
    setProgress(ratio);
  };

  const bars = 20;
  const displayMs = playing || currentMs > 0 ? currentMs : durationMs;

  return (
    <div className="bb-support-rec-strip is-preview" role="status" aria-live="polite">
      {url ? <audio ref={audioRef} src={url} preload="metadata" /> : null}
      <button
        type="button"
        className="bb-support-voice-play is-preview-play"
        onClick={toggle}
        disabled={!url || confirming}
        aria-label={playing ? 'Pause preview' : 'Play preview'}
      >
        {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
      </button>
      <div className="bb-support-voice-wave bb-support-preview-wave">
        {Array.from({ length: bars }).map((_, index) => {
          const active = progress > index / bars;
          const height = 30 + ((index * 41) % 55);
          return (
            <span
              key={index}
              className={`bb-support-voice-bar is-preview-bar ${active ? 'is-active' : ''}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
        <button
          type="button"
          className="bb-support-voice-seek"
          aria-label="Seek preview"
          disabled={!url || confirming}
          onClick={seek}
        />
      </div>
      <span className="bb-support-rec-time is-preview-time">
        {formatDuration(displayMs || durationMs)}
      </span>
      <button
        type="button"
        className="bb-support-composer-icon"
        aria-label="Discard voice note"
        disabled={confirming}
        onClick={onDiscard}
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        className="bb-support-rec-send"
        disabled={confirming || !url}
        onClick={onConfirm}
      >
        <Send size={13} strokeWidth={2.25} />
        Send
      </button>
    </div>
  );
}
