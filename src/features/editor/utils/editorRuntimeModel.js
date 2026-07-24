export const isInitialMobileDevice = () => (
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)')?.matches
);

export const isInitialPortraitMobile = () => (
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px) and (orientation: portrait)')?.matches
);

export const getEditorFrameClass = (device, isCompactViewport) => (
  device === 'desktop'
    ? (isCompactViewport ? 'rounded-lg border-[12px]' : 'rounded-lg border-[22px]')
    : (isCompactViewport ? 'rounded-[3rem] border-[12px]' : 'rounded-[5rem] md:rounded-[5.5rem] border-[16px] md:border-[18px]')
);

export const getPreviewStepForEditorRoom = (roomId) => {
  if (roomId === 'cart') return 'cart';
  if (roomId === 'checkout' || roomId === 'client-form') return 'details';
  if (roomId === 'success') return 'success';
  if (['introduction', 'services', 'calendar', 'time-slots', 'faq', 'venue', 'social', 'style'].includes(roomId)) return 'select';
  return '';
};
