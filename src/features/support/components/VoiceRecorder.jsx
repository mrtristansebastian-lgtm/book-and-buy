import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { formatDuration } from '../utils/supportFormat';

/**
 * Tap to start / stop voice capture via MediaRecorder.
 */
export function VoiceRecorder({ disabled, onRecorded, onRecordingChange }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    onRecordingChange?.({ recording, elapsed, error });
  }, [recording, elapsed, error, onRecordingChange]);

  useEffect(() => {
    return () => {
      window.clearInterval(tickRef.current);
      mediaRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    };
  }, []);

  const stop = () => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setRecording(false);
      return;
    }
    recorder.stop();
  };

  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice notes need microphone access in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        window.clearInterval(tickRef.current);
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        mediaRef.current = null;
        setRecording(false);
        setElapsed(0);
        if (blob.size > 0) {
          const file = new File([blob], `voice-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm'
          });
          onRecorded?.({ file, durationMs });
        }
      };
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 250);
      recorder.start();
    } catch {
      setError('Microphone permission denied.');
    }
  };

  return (
    <button
      type="button"
      className={`bb-support-composer-icon ${recording ? 'is-recording' : ''}`}
      disabled={disabled}
      aria-label={recording ? 'Stop recording' : 'Record voice note'}
      onClick={() => (recording ? stop() : start())}
    >
      {recording ? <Square size={16} /> : <Mic size={16} />}
    </button>
  );
}

export function VoiceRecordingBar({ recording, elapsed, onStop }) {
  if (!recording) return null;
  return (
    <div className="bb-support-recording-bar">
      <span>Recording {formatDuration(elapsed)}</span>
      <button type="button" className="bb-ghost-btn px-3 py-1 text-xs" onClick={onStop}>
        Stop
      </button>
    </div>
  );
}
