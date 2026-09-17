import { useEffect } from 'react';

/**
 * Tracks soft-keyboard overlap via visualViewport and sets --bb-keyboard-inset
 * on documentElement so chat shells can shrink like WhatsApp / Instagram.
 */
export function useKeyboardInset(enabled = true) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const root = document.documentElement;

    const clear = () => {
      root.style.removeProperty('--bb-keyboard-inset');
      root.classList.remove('bb-keyboard-open');
    };

    if (!enabled) {
      clear();
      return undefined;
    }

    const vv = window.visualViewport;
    if (!vv) {
      clear();
      return undefined;
    }

    const update = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      if (inset > 48) {
        root.style.setProperty('--bb-keyboard-inset', `${inset}px`);
        root.classList.add('bb-keyboard-open');
      } else {
        clear();
      }
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      clear();
    };
  }, [enabled]);
}
