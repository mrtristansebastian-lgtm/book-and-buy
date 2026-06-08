import { useCallback, useEffect, useState } from 'react';

export function useInstallPrompt({ showToast }) {
  const [, setInstallPromptDismissed] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  const handleAddToHomeScreen = useCallback(async () => {
    setInstallPromptDismissed(true);

    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        setDeferredInstallPrompt(null);
        showToast(choice?.outcome === 'accepted'
          ? 'Build A Booking was added to your home screen.'
          : 'You can add it later from the browser menu.'
        );
        return;
      } catch (error) {
        console.error(error);
      }
    }

    const shareData = {
      title: 'Build A Booking',
      text: 'Open Build A Booking from your home screen for the cleanest editor view.',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast('Choose Add to Home Screen from the share menu.');
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error(error);
    }

    showToast('Use your browser share button, then choose Add to Home Screen.');
  }, [deferredInstallPrompt, showToast]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return { handleAddToHomeScreen };
}
