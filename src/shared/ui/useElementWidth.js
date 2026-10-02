import { useEffect, useState } from 'react';

/** A callback ref also observes elements mounted after tab navigation. */
export function useElementWidth() {
  const [element, setElement] = useState(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element) return undefined;
    const update = () => setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(update);
    observer.observe(element); update();
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width];
}
