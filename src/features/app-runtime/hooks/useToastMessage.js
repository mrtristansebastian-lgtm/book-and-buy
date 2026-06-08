import { useEffect, useRef, useState } from 'react';

export function useToastMessage(timeoutMs = 4000) {
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), timeoutMs);
  };

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  return { showToast, toast };
}
