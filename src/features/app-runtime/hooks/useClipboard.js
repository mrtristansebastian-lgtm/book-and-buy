import { useCallback } from 'react';

export function useClipboard({ showToast }) {
  const copyToClipboard = useCallback(async (value, label = 'Link') => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch (error) {
      console.error(error);
      showToast(`${label}: ${value}`);
    }
  }, [showToast]);

  return { copyToClipboard };
}
