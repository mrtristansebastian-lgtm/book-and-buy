import { useEffect, useState } from 'react';
import { analyzePaletteFromImageSource } from '../utils/brandSignal';

export function useDetectedBrandSignal(logoSource) {
  const [detectedBrandSignal, setDetectedBrandSignal] = useState(null);

  useEffect(() => {
    const source = logoSource || '';
    let cancelled = false;

    if (!source) {
      setDetectedBrandSignal(null);
      return () => { cancelled = true; };
    }

    analyzePaletteFromImageSource(source).then((signal) => {
      if (!cancelled) {
        setDetectedBrandSignal(signal.brandColor ? signal : null);
      }
    });

    return () => { cancelled = true; };
  }, [logoSource]);

  return detectedBrandSignal;
}
