import { useEffect, useRef } from 'react';
import { buildPresence } from '../utils/presence';

/**
 * Publish online/offline for the current user while they are in the app.
 * Respects showActivity (when false, peers see no status at all).
 */
export function useOwnChatPresence({ enabled = true, showActivity = true, publish } = {}) {
  const publishRef = useRef(publish);
  publishRef.current = publish;

  useEffect(() => {
    if (!enabled || typeof publishRef.current !== 'function') return undefined;

    const visible = showActivity !== false;
    const send = (status) => {
      publishRef.current(
        buildPresence({
          status: visible ? status : 'offline',
          lastSeenAt: Date.now(),
          visible
        })
      );
    };

    const sync = () => {
      if (document.hidden || !visible) send('offline');
      else send('online');
    };

    const onBlur = () => send('offline');

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', onBlur);
    const beat = window.setInterval(() => {
      if (!document.hidden && visible) send('online');
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', onBlur);
      window.clearInterval(beat);
      send('offline');
    };
  }, [enabled, showActivity]);
}
