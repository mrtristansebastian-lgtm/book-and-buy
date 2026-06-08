import { useEffect, useState } from 'react';
import {
  isInitialMobileDevice,
  isInitialPortraitMobile
} from '../utils/editorRuntimeModel';

export function useEditorResponsiveState() {
  const [isMobileRuntime, setIsMobileRuntime] = useState(isInitialMobileDevice);
  const [isPortraitMobileRuntime, setIsPortraitMobileRuntime] = useState(isInitialPortraitMobile);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const portraitQuery = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const updateMobileRuntime = () => {
      setIsMobileRuntime(current => current === mobileQuery.matches ? current : mobileQuery.matches);
      setIsPortraitMobileRuntime(current => current === portraitQuery.matches ? current : portraitQuery.matches);
    };

    updateMobileRuntime();
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', updateMobileRuntime);
      portraitQuery.addEventListener('change', updateMobileRuntime);
    } else {
      mobileQuery.addListener(updateMobileRuntime);
      portraitQuery.addListener(updateMobileRuntime);
    }
    window.addEventListener('orientationchange', updateMobileRuntime);
    window.addEventListener('resize', updateMobileRuntime);
    return () => {
      if (mobileQuery.removeEventListener) {
        mobileQuery.removeEventListener('change', updateMobileRuntime);
        portraitQuery.removeEventListener('change', updateMobileRuntime);
      } else {
        mobileQuery.removeListener(updateMobileRuntime);
        portraitQuery.removeListener(updateMobileRuntime);
      }
      window.removeEventListener('orientationchange', updateMobileRuntime);
      window.removeEventListener('resize', updateMobileRuntime);
    };
  }, []);

  return { isMobileRuntime, isPortraitMobileRuntime };
}
