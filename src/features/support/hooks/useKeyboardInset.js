import { useEffect } from 'react';

/**
 * Shared WhatsApp / IG chat frame lock for client + business Support.
 * When enabled (thread open): html.bb-chat-open + --bb-vv-height / --bb-vv-top,
 * body locked so only the message list scrolls.
 * When keyboard covers bottom: html.bb-keyboard-open.
 */
export function useKeyboardInset(enabled = true) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const root = document.documentElement;

    const clearViewport = () => {
      root.style.removeProperty('--bb-vv-height');
      root.style.removeProperty('--bb-vv-top');
      root.style.removeProperty('--bb-keyboard-inset');
      root.classList.remove('bb-keyboard-open');
    };

    const clearAll = () => {
      clearViewport();
      root.classList.remove('bb-chat-open');
    };

    const unlockBody = () => {
      if (document.body.style.position !== 'fixed') return;
      const y = Number(document.body.dataset.bbScrollY || 0);
      document.body.style.position = '';
      document.body.style.inset = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      delete document.body.dataset.bbScrollY;
      window.scrollTo(0, y);
    };

    const lockBody = () => {
      if (document.body.style.position === 'fixed') return;
      document.body.dataset.bbScrollY = String(window.scrollY || 0);
      document.body.style.position = 'fixed';
      document.body.style.inset = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    };

    if (!enabled) {
      unlockBody();
      clearAll();
      return undefined;
    }

    root.classList.add('bb-chat-open');
    lockBody();

    const vv = window.visualViewport;
    let raf = 0;

    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!vv) {
          root.style.setProperty('--bb-vv-height', `${window.innerHeight}px`);
          root.style.setProperty('--bb-vv-top', '0px');
          root.style.setProperty('--bb-keyboard-inset', '0px');
          root.classList.remove('bb-keyboard-open');
          lockBody();
          return;
        }

        const height = Math.max(0, Math.round(vv.height));
        const top = Math.max(0, Math.round(vv.offsetTop));
        const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        const keyboardOpen = inset > 60;

        root.style.setProperty('--bb-vv-height', `${height}px`);
        root.style.setProperty('--bb-vv-top', `${top}px`);
        root.style.setProperty('--bb-keyboard-inset', `${keyboardOpen ? inset : 0}px`);
        root.classList.toggle('bb-keyboard-open', keyboardOpen);
        // Keep the chat chrome solid — only the message list scrolls.
        lockBody();
      });
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      unlockBody();
      clearAll();
    };
  }, [enabled]);
}
