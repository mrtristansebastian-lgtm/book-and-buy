import { useEffect, useRef } from 'react';

const createTonePlayer = (context, master, now) => (
  frequency,
  offset,
  duration,
  wave = 'sine',
  endFrequency = frequency
) => {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now + offset);
  osc.frequency.exponentialRampToValueAtTime(endFrequency, now + offset + duration);
  gain.gain.setValueAtTime(0.0001, now + offset);
  gain.gain.exponentialRampToValueAtTime(0.42, now + offset + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now + offset);
  osc.stop(now + offset + duration + 0.04);
};

export function useEditorAudio() {
  const audioRef = useRef(null);

  useEffect(() => () => {
    try {
      audioRef.current?.close?.();
    } catch {
      // Browsers may report already-closed AudioContexts during hot reload.
    }
  }, []);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = audioRef.current || new AudioContext();
    audioRef.current = context;
    if (context.state === 'suspended') context.resume();
    return context;
  };

  const playStudioSound = (type = 'open') => {
    try {
      const context = getAudioContext();
      if (!context) return;
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(type === 'complete' ? 0.06 : 0.035, now + 0.018);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      master.connect(context.destination);
      const playTone = createTonePlayer(context, master, now);

      if (type === 'complete') {
        playTone(392, 0, 0.18, 'sine', 588);
        playTone(588, 0.08, 0.2, 'triangle', 880);
        playTone(1176, 0.18, 0.16, 'sine', 1568);
      } else if (type === 'step') {
        playTone(540, 0, 0.11, 'triangle', 760);
        playTone(960, 0.05, 0.1, 'sine', 1120);
      } else {
        playTone(720, 0, 0.12, 'triangle', 520);
      }
    } catch (error) {
      console.warn('Editor studio sound unavailable', error);
    }
  };

  const playMobileNavSound = () => {
    try {
      const context = getAudioContext();
      if (!context) return;
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.052, now + 0.015);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      master.connect(context.destination);
      const playTone = createTonePlayer(context, master, now);
      playTone(440, 0, 0.12, 'triangle', 660);
      playTone(880, 0.045, 0.14, 'sine', 1320);
      playTone(1760, 0.11, 0.1, 'sine', 2349);
    } catch (error) {
      console.warn('Mobile nav sound unavailable', error);
    }
  };

  return { playMobileNavSound, playStudioSound };
}
