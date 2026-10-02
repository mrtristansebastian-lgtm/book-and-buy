import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_VOICE_DURATION_MS } from '../utils/voiceMedia';

const BAR_COUNT = 22;

/**
 * Voice capture with WhatsApp-style preview before send.
 * Phases: idle → recording → preview → (confirm sends / discard clears)
 */
export function useVoiceRecorder({ onConfirm } = {}) {
  const [phase, setPhase] = useState('idle'); // idle | recording | preview
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [levels, setLevels] = useState(() => Array(BAR_COUNT).fill(0.18));
  const [preview, setPreview] = useState(null); // { url, file, durationMs }

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(0);
  const rafRef = useRef(0);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlRef = useRef('');
  const onConfirmRef = useRef(onConfirm);
  const aliveRef = useRef(true);
  const startingRef = useRef(false);
  const sendingRef = useRef(false);
  onConfirmRef.current = onConfirm;

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPreview(null);
  }, []);

  const cleanupAudio = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    window.clearInterval(tickRef.current);
    try {
      audioCtxRef.current?.close?.().catch?.(() => {});
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(
    () => { aliveRef.current = true; return () => {
      aliveRef.current = false;
      const recorder = mediaRef.current;
      if (recorder) { recorder.onstop = null; recorder.ondataavailable = null; if (recorder.state !== 'inactive') recorder.stop(); }
      cleanupAudio();
      revokePreview();
    }; },
    [cleanupAudio, revokePreview]
  );

  const pumpLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const next = [];
    const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const slice = data.slice(i * step, i * step + step);
      const avg = slice.reduce((sum, n) => sum + n, 0) / (slice.length || 1);
      next.push(Math.max(0.12, Math.min(1, avg / 180)));
    }
    setLevels(next);
    rafRef.current = window.requestAnimationFrame(pumpLevels);
  }, []);

  const finishRecording = useCallback(
    ({ discard = false } = {}) => {
      const recorder = mediaRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setPhase((prev) => (prev === 'recording' ? 'idle' : prev));
        cleanupAudio();
        return;
      }
      recorder._bbDiscard = discard;
      recorder.stop();
    },
    [cleanupAudio]
  );

  const start = useCallback(async () => {
    if (startingRef.current || mediaRef.current || sendingRef.current) return;
    startingRef.current = true;
    setError('');
    revokePreview();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice notes need microphone access in this browser.');
      startingRef.current = false;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      try { if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        pumpLevels();
      } } catch { /* Waveform is optional; capture still works. */ }

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
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
        const discard = Boolean(recorder._bbDiscard);
        const durationMs = Math.min(MAX_VOICE_DURATION_MS, Date.now() - startedAtRef.current);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupAudio();
        mediaRef.current = null;
        if (!aliveRef.current) return;
        setElapsed(durationMs);
        setLevels(Array(BAR_COUNT).fill(0.18));

        if (discard || blob.size === 0 || durationMs < 400) {
          setPhase('idle');
          setElapsed(0);
          return;
        }

        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: blob.type || 'audio/webm'
        });
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreview({ url, file, durationMs });
        setPhase('preview');
      };
      mediaRef.current = recorder;
      recorder.onerror = () => { recorder._bbDiscard = true; finishRecording({ discard: true }); setError('Recording stopped unexpectedly. Please record again.'); };
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase('recording');
      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
        if (Date.now() - startedAtRef.current >= MAX_VOICE_DURATION_MS) finishRecording();
      }, 100);
      recorder.start(120);
    } catch (failure) {
      cleanupAudio();
      mediaRef.current = null;
      if (!aliveRef.current) return;
      setError(failure?.name === 'NotAllowedError' ? 'Microphone access is blocked. Allow it in your browser settings, then try again.' : 'Could not start recording. Check your microphone and try again.');
      setPhase('idle');
    } finally {
      startingRef.current = false;
    }
  }, [cleanupAudio, pumpLevels, revokePreview, finishRecording]);

  const discard = useCallback(() => {
    if (phase === 'recording') {
      finishRecording({ discard: true });
      return;
    }
    revokePreview();
    setElapsed(0);
    setPhase('idle');
  }, [finishRecording, phase, revokePreview]);

  const stopToPreview = useCallback(() => {
    finishRecording({ discard: false });
  }, [finishRecording]);

  const confirm = useCallback(async () => {
    if (!preview?.file || sendingRef.current) return;
    sendingRef.current = true;
    const payload = {
      file: preview.file,
      durationMs: preview.durationMs,
      url: preview.url
    };
    try {
      if (!onConfirmRef.current) throw new Error('Chat is not connected.');
      await onConfirmRef.current(payload);
      if (!aliveRef.current) return;
      revokePreview();
      setElapsed(0);
      setPhase('idle');
    } catch (failure) {
      if (aliveRef.current) setError(failure?.message || 'Could not send voice note. Try again.');
      // Keep preview so the user can retry after a failed upload/send.
    } finally {
      sendingRef.current = false;
    }
  }, [preview, revokePreview]);

  return {
    phase,
    recording: phase === 'recording',
    previewing: phase === 'preview',
    active: phase !== 'idle',
    elapsed,
    error,
    levels,
    preview,
    start,
    stopToPreview,
    discard,
    confirm
  };
}
